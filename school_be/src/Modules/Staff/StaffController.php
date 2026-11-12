<?php

require_once dirname(__DIR__, 2) . '/Core/Utils/Response.php';
require_once dirname(__DIR__, 2) . '/Core/Utils/JwtHandler.php';
require_once dirname(__DIR__, 2) . '/Core/Utils/RateLimiter.php';
require_once __DIR__ . '/TeacherModel.php';
require_once __DIR__ . '/SubjectModel.php';
require_once __DIR__ . '/TeacherSubjectModel.php';
require_once __DIR__ . '/TeacherAttendanceModel.php';
require_once dirname(__DIR__) . '/Auth/User.php';

class StaffController {
    private $teacherModel;
    private $subjectModel;
    private $teacherSubjectModel;
    private $attendanceModel;

    private $user;

    public function __construct() {
        $this->user = JwtHandler::validateTokenFromHeader();
        if (!$this->user) {
            Response::error("Unauthorized access. Token missing or expired.", 401);
            exit;
        }

        $this->teacherModel = new TeacherModel();
        $this->subjectModel = new SubjectModel();
        $this->teacherSubjectModel = new TeacherSubjectModel();
        $this->attendanceModel = new TeacherAttendanceModel();
    }

    // --- Teachers CRUD ---
    public function handleTeachers($method, $id, $data) {
        if (in_array($method, ['POST', 'PUT', 'DELETE']) && $this->user) {
            $userRole = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? '');
            if ($userRole === 'R_TEACHER' || $userRole === 'TEACHER' || strpos($userRole, 'TEACHER') !== false) {
                Response::error("Access denied: Teachers cannot create, modify, or delete teacher records.", 403);
                return;
            }
        }
        switch ($method) {
            case 'GET':
                if ($id) {
                    $teacher = $this->teacherModel->getById($id);
                    if ($teacher) Response::success("Teacher found", $teacher);
                    else Response::error("Teacher not found", 404);
                } else {
                    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
                    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 10;
                    $offset = ($page - 1) * $limit;
                    
                    $teachers = $this->teacherModel->getAll($limit, $offset, $this->user);
                    $total = $this->teacherModel->getTotalCount($this->user);
                    
                    Response::success("All teachers fetched", $teachers, 200, [
                        'total' => $total,
                        'page' => $page,
                        'limit' => $limit,
                        'totalPages' => ceil($total / $limit)
                    ]);
                }
                break;
            case 'POST':
                if (empty($data['BR_TCHR_BR_ID']) && empty($data['TCHR_BR_ID']) && empty($data['branch_id']) && empty($data['branchId']) && $this->user && in_array(strtoupper($this->user['role_id'] ?? ''), ['R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL'])) {
                    $data['BR_TCHR_BR_ID'] = $this->user['userId'];
                }
                if (empty($data['BR_TCHR_BR_ID']) && empty($data['TCHR_BR_ID']) && empty($data['branch_id']) && empty($data['branchId'])) Response::error("BR_TCHR_BR_ID (Branch ID) is required", 400);
                if (empty($data['TCHR_NM']) && empty($data['name'])) Response::error("TCHR_NM (Teacher Name) is required", 400);
                if (empty($data['TCHR_NM'])) $data['TCHR_NM'] = $data['name'] ?? '';
                if (empty($data['TCHR_EMAIL'])) $data['TCHR_EMAIL'] = $data['email'] ?? null;
                if (empty($data['TCHR_CONTACT_NO'])) $data['TCHR_CONTACT_NO'] = $data['phone'] ?? null;
                if (empty($data['TCHR_ID'])) $data['TCHR_ID'] = strtoupper(uniqid('TCHR_'));
                try {
                    $insertedId = $this->teacherModel->create($data);
                    
                    if (!empty($data['USER_ID'])) {
                        try {
                            $userModel = new User();
                            $existingUser = $userModel->getById($data['USER_ID']);
                            $userData = [
                                'user_id' => $data['USER_ID'],
                                'user_email_id' => $data['TCHR_EMAIL'] ?? null,
                                'user_first_name' => $data['TCHR_NM'] ?? ($data['name'] ?? null),
                                'user_role' => 'R_TEACHER',
                                'user_branch_id' => $data['BR_TCHR_BR_ID'] ?? null
                            ];
                            if (!empty($data['user_img'])) {
                                $userData['user_img'] = $data['user_img'];
                            }
                            if (!empty($data['PASSWORD'])) {
                                $userData['user_passwd'] = $data['PASSWORD'];
                            }
                            if ($existingUser) {
                                $userModel->update($data['USER_ID'], $userData);
                            } else if (!empty($data['PASSWORD'])) {
                                $userModel->create($userData);
                            }
                        } catch (Exception $userEx) {
                            error_log("Failed to create/update teacher user login: " . $userEx->getMessage());
                        }
                    }
                    
                    $subId = $data['TCHR_SUB_ID'] ?? ($data['subject_id'] ?? null);
                    if (!empty($subId)) {
                        try {
                            $this->teacherSubjectModel->create([
                                'TCHR_SUB_MAP_ID' => strtoupper(uniqid('MAP_')),
                                'TCHR_ID' => $insertedId,
                                'TCHR_SUB_ID' => $subId
                            ]);
                        } catch (Exception $ex) {
                            // Ignore mapping creation failure
                        }
                    }
                    
                    Response::success("Teacher created successfully", $this->teacherModel->getById($insertedId), 201);
                } catch (Exception $e) {
                    Response::error("Failed to create teacher: " . $e->getMessage(), 500);
                }
                break;
            case 'PUT':
                if (!$id) Response::error("Teacher ID is required for update", 400);
                $existingTeacher = $this->teacherModel->getById($id);
                if (!$existingTeacher) Response::error("Teacher not found", 404);
                try {
                    $this->teacherModel->update($id, $data);

                    $teacherUserId = $data['USER_ID'] ?? ($data['userId'] ?? ($existingTeacher['USER_ID'] ?? ($existingTeacher['userId'] ?? null)));
                    if (!empty($teacherUserId)) {
                        try {
                            $userModel = new User();
                            $existingUser = $userModel->getById($teacherUserId);
                            $userUpdates = [
                                'user_email_id' => $data['TCHR_EMAIL'] ?? ($data['email'] ?? ($existingUser['user_email_id'] ?? null)),
                                'user_first_name' => $data['TCHR_NM'] ?? ($data['name'] ?? ($existingUser['user_first_name'] ?? null))
                            ];
                            if (array_key_exists('user_img', $data)) {
                                $userUpdates['user_img'] = $data['user_img'];
                            }
                            if (!empty($data['PASSWORD'])) {
                                $userUpdates['user_passwd'] = $data['PASSWORD'];
                            }
                            if ($existingUser) {
                                $userModel->update($teacherUserId, $userUpdates);
                            } elseif (!empty($data['PASSWORD'])) {
                                $userUpdates['user_id'] = $teacherUserId;
                                $userUpdates['user_role'] = 'R_TEACHER';
                                $userModel->create($userUpdates);
                            }
                        } catch (Exception $uEx) {
                            error_log("Failed to update teacher user login: " . $uEx->getMessage());
                        }
                    }

                    $subId = $data['TCHR_SUB_ID'] ?? ($data['subject_id'] ?? null);
                    if (!empty($subId)) {
                        try {
                            $existingMap = $this->teacherSubjectModel->getByTeacherId($id);
                            if ($existingMap) {
                                $this->teacherSubjectModel->update($existingMap['TCHR_SUB_MAP_ID'], [
                                    'TCHR_SUB_ID' => $subId
                                ]);
                            } else {
                                $this->teacherSubjectModel->create([
                                    'TCHR_SUB_MAP_ID' => strtoupper(uniqid('MAP_')),
                                    'TCHR_ID' => $id,
                                    'TCHR_SUB_ID' => $subId
                                ]);
                            }
                        } catch (Exception $mapEx) {
                            error_log("Failed to update teacher subject mapping: " . $mapEx->getMessage());
                        }
                    }

                    Response::success("Teacher updated successfully", $this->teacherModel->getById($id));
                } catch (Exception $e) {
                    Response::error("Failed to update teacher: " . $e->getMessage(), 500);
                }
                break;
            case 'DELETE':
                if (!$id) Response::error("Teacher ID is required for deletion", 400);
                if (!$this->teacherModel->getById($id)) Response::error("Teacher not found", 404);
                try {
                    $this->teacherModel->delete($id);
                    Response::success("Teacher deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete teacher: " . $e->getMessage(), 500);
                }
                break;
            default:
                Response::error("Method not allowed", 405);
        }
    }

    // --- Subjects CRUD ---
    public function handleSubjects($method, $id, $data) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $subject = $this->subjectModel->getById($id);
                    if ($subject) Response::success("Subject found", $subject);
                    else Response::error("Subject not found", 404);
                } else {
                    $page = isset($data['page']) ? (int)$data['page'] : 1;
                    $limit = isset($data['limit']) ? (int)$data['limit'] : 10;
                    if ($limit <= 0) $limit = 10;
                    if ($page <= 0) $page = 1;
                    $offset = ($page - 1) * $limit;
                    $items = $this->subjectModel->getAll($limit, $offset, $this->user);
                    $total = $this->subjectModel->getTotalCount($this->user);
                    $pagination = [
                        'total' => (int)$total,
                        'page' => $page,
                        'limit' => $limit,
                        'totalPages' => ceil($total / $limit)
                    ];
                    Response::success("All subjects fetched", $items, 200, $pagination);
                }
                break;
            case 'POST':
                if (empty($data['SUB_NM'])) Response::error("SUB_NM (Subject Name) is required", 400);
                if (empty($data['SUB_ID'])) $data['SUB_ID'] = strtoupper(uniqid('SUB_'));
                try {
                    $insertedId = $this->subjectModel->create($data);
                    Response::success("Subject created successfully", $this->subjectModel->getById($insertedId), 201);
                } catch (Exception $e) {
                    Response::error("Failed to create subject: " . $e->getMessage(), 500);
                }
                break;
            case 'PUT':
                if (!$id) Response::error("Subject ID is required for update", 400);
                if (!$this->subjectModel->getById($id)) Response::error("Subject not found", 404);
                try {
                    $this->subjectModel->update($id, $data);
                    Response::success("Subject updated successfully", $this->subjectModel->getById($id));
                } catch (Exception $e) {
                    Response::error("Failed to update subject: " . $e->getMessage(), 500);
                }
                break;
            case 'DELETE':
                if (!$id) Response::error("Subject ID is required for deletion", 400);
                if (!$this->subjectModel->getById($id)) Response::error("Subject not found", 404);
                try {
                    $this->subjectModel->delete($id);
                    Response::success("Subject deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete subject: " . $e->getMessage(), 500);
                }
                break;
            default:
                Response::error("Method not allowed", 405);
        }
    }

    // --- Teacher-Subject Mappings CRUD ---
    public function handleMappings($method, $id, $data) {
        if (in_array($method, ['POST', 'PUT', 'DELETE']) && $this->user) {
            $userRole = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? '');
            if ($userRole === 'R_TEACHER' || $userRole === 'TEACHER' || strpos($userRole, 'TEACHER') !== false) {
                Response::error("Access denied: Teachers cannot create, modify, or delete subject mappings.", 403);
                return;
            }
        }
        switch ($method) {
            case 'GET':
                try {
                    if ($id) {
                        $mapping = $this->teacherSubjectModel->getById($id);
                        if ($mapping) Response::success("Mapping found", $mapping);
                        else Response::error("Mapping not found", 404);
                    } else {
                        $page = isset($data['page']) ? (int)$data['page'] : 1;
                        $limit = isset($data['limit']) ? (int)$data['limit'] : 1000;
                        if ($limit <= 0) $limit = 1000;
                        if ($page <= 0) $page = 1;
                        $offset = ($page - 1) * $limit;
                        $items = $this->teacherSubjectModel->getAll($limit, $offset, $this->user);
                        $total = $this->teacherSubjectModel->getTotalCount($this->user);
                        $pagination = [
                            'total' => (int)$total,
                            'page' => $page,
                            'limit' => $limit,
                            'totalPages' => ceil($total / $limit)
                        ];
                        Response::success("All mappings fetched", $items, 200, $pagination);
                    }
                } catch (Exception $e) {
                    Response::error("Failed to fetch mappings: " . $e->getMessage(), 500);
                }
                break;
            case 'POST':
                if (empty($data['TCHR_ID']) || empty($data['TCHR_SUB_ID'])) Response::error("TCHR_ID and TCHR_SUB_ID are required", 400);
                if (empty($data['TCHR_SUB_MAP_ID'])) $data['TCHR_SUB_MAP_ID'] = strtoupper(uniqid('MAP_'));
                try {
                    $insertedId = $this->teacherSubjectModel->create($data);
                    Response::success("Mapping created successfully", $this->teacherSubjectModel->getById($insertedId), 201);
                } catch (Exception $e) {
                    Response::error("Failed to create mapping: " . $e->getMessage(), 500);
                }
                break;
            case 'PUT':
                if (!$id) Response::error("Mapping ID is required for update", 400);
                if (!$this->teacherSubjectModel->getById($id)) Response::error("Mapping not found", 404);
                try {
                    $this->teacherSubjectModel->update($id, $data);
                    Response::success("Mapping updated successfully", $this->teacherSubjectModel->getById($id));
                } catch (Exception $e) {
                    Response::error("Failed to update mapping: " . $e->getMessage(), 500);
                }
                break;
            case 'DELETE':
                if (!$id) Response::error("Mapping ID is required for deletion", 400);
                if (!$this->teacherSubjectModel->getById($id)) Response::error("Mapping not found", 404);
                try {
                    $this->teacherSubjectModel->delete($id);
                    Response::success("Mapping deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete mapping: " . $e->getMessage(), 500);
                }
                break;
            default:
                Response::error("Method not allowed", 405);
        }
    }

    private function resolveTeacherId($user) {
        if (!$user) return null;
        $userId = $user['teacher_id'] ?? $user['teacherId'] ?? $user['userId'] ?? $user['user_id'] ?? $user['id'] ?? null;
        $email = $user['email'] ?? $user['user_email_id'] ?? null;

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("SELECT BR_TCHR_ID FROM SCHL_BR_TCHR WHERE BR_TCHR_ID = ? OR (BR_TCHR_EMAI_ID = ? AND BR_TCHR_EMAI_ID IS NOT NULL AND BR_TCHR_EMAI_ID != '') LIMIT 1");
            $stmt->execute([$userId, $email]);
            $found = $stmt->fetchColumn();
            if ($found) return $found;
        } catch (Exception $e) {}

        return $userId;
    }

    // --- Teacher Attendance CRUD ---
    public function handleAttendance($method, $id, $data) {
        if ($method === 'GET' && $id === 'summary') {
            $this->getAttendanceSummary($data);
            return;
        }

        $userRole = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? $this->user['role'] ?? '');
        $isTeacher = ($userRole === 'R_TEACHER' || $userRole === 'TEACHER' || strpos($userRole, 'TEACHER') !== false);
        $isBranchAdmin = ($userRole === 'R_BRANCHADMIN' || strpos($userRole, 'BRANCH') !== false || $userRole === 'R_SUPERADMIN');

        // Only Branch Admin (or Super Admin) can record or update teacher attendance
        if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
            if (!$isBranchAdmin) {
                Response::error("Access denied: Only Branch Admin can record or update teacher attendance.", 403);
                return;
            }
        }

        switch ($method) {
            case 'GET':
                // Allow fetching self attendance by /staff/attendance/me or /attendance/teachers/me
                if ($id === 'me') {
                    $resolvedTeacherId = $this->resolveTeacherId($this->user);
                    $attDate = isset($data['date']) ? $data['date'] : date('Y-m-d');
                    $att = $this->attendanceModel->getById($resolvedTeacherId, $attDate);
                    if ($att) {
                        Response::success("Teacher attendance fetched", [$att]);
                    } else {
                        Response::success("No attendance record found", []);
                    }
                    return;
                }

                if ($id) {
                    // Strict role-based authorization check: if requester is a Teacher, prevent viewing other teachers' records
                    if ($isTeacher) {
                        $resolvedTeacherId = $this->resolveTeacherId($this->user);
                        if ($id !== $resolvedTeacherId) {
                            Response::error("Access denied: You are not authorized to view other teachers' attendance records.", 403);
                            return;
                        }
                    }
                    $att = $this->attendanceModel->getById($id);
                    if ($att) Response::success("Attendance found", $att);
                    else Response::error("Attendance not found", 404);
                } else {
                    $page = isset($data['page']) ? (int)$data['page'] : 1;
                    $limit = isset($data['limit']) ? (int)$data['limit'] : 1000; // Large limit to show all for the date
                    if ($limit <= 0) $limit = 1000;
                    if ($page <= 0) $page = 1;
                    $offset = ($page - 1) * $limit;
                    
                    $filters = [];
                    if (isset($data['date'])) $filters['date'] = $data['date'];
                    if (isset($data['status'])) $filters['status'] = $data['status'];
                    
                    // Strict role-based authorization check:
                    // If requester's role is 'Teacher', automatically inject teacher_id filter.
                    // Disregard and overwrite any client-side attempts by a teacher to remove or tamper with this ID filter.
                    if ($isTeacher) {
                        $resolvedTeacherId = $this->resolveTeacherId($this->user);
                        $filters['teacher_id'] = $resolvedTeacherId;
                        $filters['teacherId'] = $resolvedTeacherId;
                    } else {
                        // Allow administrators to filter by teacherId if specified
                        if (!empty($data['teacherId'])) {
                            $filters['teacher_id'] = $data['teacherId'];
                            $filters['teacherId'] = $data['teacherId'];
                        } elseif (!empty($data['teacher_id'])) {
                            $filters['teacher_id'] = $data['teacher_id'];
                            $filters['teacherId'] = $data['teacher_id'];
                        }
                    }

                    $items = $this->attendanceModel->getAll($filters, $limit, $offset, $this->user);
                    $total = $this->attendanceModel->getTotalCount($filters, $this->user);
                    $pagination = [
                        'total' => (int)$total,
                        'page' => $page,
                        'limit' => $limit,
                        'totalPages' => ceil($total / $limit)
                    ];
                    Response::success("All attendance records fetched", $items, 200, $pagination);
                }
                break;
            case 'POST':
                if (empty($data['TCHR_REF_ID']) || empty($data['ATT_DT']) || empty($data['ATT_STATUS'])) Response::error("TCHR_REF_ID, ATT_DT, and ATT_STATUS are required", 400);
                try {
                    $insertedId = $this->attendanceModel->create($data);
                    Response::success("Attendance created successfully", $this->attendanceModel->getById($insertedId), 201);
                } catch (Exception $e) {
                    Response::error("Failed to create attendance: " . $e->getMessage(), 500);
                }
                break;
            case 'PUT':
                if (!$id) Response::error("Attendance ID is required for update", 400);
                $attDate = isset($data['date']) ? $data['date'] : date('Y-m-d');
                if (!$this->attendanceModel->getById($id, $attDate)) Response::error("Attendance not found", 404);
                try {
                    $this->attendanceModel->update($id, $data);
                    Response::success("Attendance updated successfully", $this->attendanceModel->getById($id, $attDate));
                } catch (Exception $e) {
                    Response::error("Failed to update attendance: " . $e->getMessage(), 500);
                }
                break;
            case 'DELETE':
                if (!$id) Response::error("Attendance ID is required for deletion", 400);
                if (!$this->attendanceModel->getById($id)) Response::error("Attendance not found", 404);
                try {
                    $this->attendanceModel->delete($id);
                    Response::success("Attendance deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete attendance: " . $e->getMessage(), 500);
                }
                break;
            default:
                Response::error("Method not allowed", 405);
        }
    }

    public function getAttendanceSummary($data) {
        // Mock attendance summary implementation
        Response::success("Attendance summary retrieved", [
            'total_staff' => 50,
            'present' => 45,
            'absent' => 5
        ]);
    }

    // =====================================================================
    // BULK UPLOAD (Teachers / Staff)
    // =====================================================================

    /**
     * Resolve role / branch constraints for the logged-in user.
     * Branch Admin -> locked to own branch. School Admin -> any branch of own school.
     */
    private function resolveBulkScope() {
        $userRole = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? '');
        $isSchoolAdmin = in_array($userRole, ['R_SCHOOLADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN']);
        $isBranchAdmin = in_array($userRole, ['R_BRANCHADMIN', 'BRANCH_ADMIN']);
        $userBranchId = $this->user['branch_id'] ?? $this->user['user_branch_id'] ?? null;

        if ($isBranchAdmin && empty($userBranchId)) {
            // Staff module convention: branch admin's userId == branch id
            $userBranchId = $this->user['userId'] ?? $this->user['user_id'] ?? null;
        }
        return [$userRole, $isSchoolAdmin, $isBranchAdmin, $userBranchId];
    }

    /**
     * Download template schema for teacher bulk upload
     */
    public function handleBulkTemplate($method) {
        if ($method !== 'GET') {
            Response::error("Method not allowed", 405);
        }

        $headers = [
            "Teacher Name*",
            "Email*",
            "Phone*",
            "Aadhar Number",
            "PAN Number",
            "Class Name",
            "Subject Name",
            "Status (Active/Inactive)",
            "User ID",
            "Password",
            "Branch ID"
        ];

        list(, , , $userBranchId) = $this->resolveBulkScope();

        $sample = [
            "Rahul Sen",
            "rahul.sen@example.com",
            "9876543210",
            "123456789012",
            "ABCDE1234F",
            "Class 10",
            "Mathematics",
            "Active",
            "rahul.sen@example.com",
            "Teacher@123",
            $userBranchId ?: ""
        ];

        Response::success("Teacher bulk template schema", [
            'columns' => $headers,
            'sample' => $sample
        ]);
    }

    /**
     * Bulk Teacher Upload with multi-tenancy, rate limiting, duplicate detection
     * and automatic teacher portal login creation (R_TEACHER).
     */
    public function handleBulkUpload($method, $data) {
        if ($method !== 'POST') {
            Response::error("Method not allowed. Use POST.", 405);
        }

        // 1. Rate limit
        $rateCheck = RateLimiter::check('teacher_bulk_upload', $this->user['userId'] ?? null, 10, 600);
        if (!$rateCheck['allowed']) {
            Response::error("Upload rate limit exceeded. Please wait {$rateCheck['retry_after']} seconds before trying again.", 429, [
                'retry_after' => $rateCheck['retry_after']
            ]);
        }

        // 2. Permission & tenancy
        list($userRole, $isSchoolAdmin, $isBranchAdmin, $userBranchId) = $this->resolveBulkScope();
        if (!$isSchoolAdmin && !$isBranchAdmin) {
            Response::error("Permission denied. Only School Admin and Branch Admin can perform teacher bulk upload.", 403);
        }
        if ($isBranchAdmin && empty($userBranchId)) {
            Response::error("Branch Administrator is not bound to a valid branch.", 403);
        }

        // 3. Extract rows
        $teachersList = [];
        if (isset($data['teachers']) && is_array($data['teachers'])) {
            $teachersList = $data['teachers'];
        } elseif (isset($data['rows']) && is_array($data['rows'])) {
            $teachersList = $data['rows'];
        } elseif (is_array($data) && isset($data[0])) {
            $teachersList = $data;
        }

        if (empty($teachersList)) {
            Response::error("No teacher records found in request payload.", 400);
        }
        if (count($teachersList) > 500) {
            Response::error("Too many rows. Maximum 500 teachers per upload.", 400);
        }

        $defaultTargetBranch = $data['branch_id'] ?? $data['target_branch_id'] ?? null;
        if ($isBranchAdmin) {
            $defaultTargetBranch = $userBranchId;
        }

        $db = Database::getConnection();
        $userModel = new User();
        $actorId = $this->user['userId'] ?? $this->user['user_id'] ?? null;
        $schoolCenterId = $this->user['school_id'] ?? null;

        $successList = [];
        $failedList = [];
        $seenEmails = [];
        $seenUserIds = [];
        $branchCache = [];
        $rowNum = 1;

        foreach ($teachersList as $row) {
            $rowNum++; // header = row 1

            $name = trim($row['TCHR_NM'] ?? $row['Teacher Name'] ?? $row['name'] ?? '');
            $fail = function ($reason) use (&$failedList, $rowNum, &$name) {
                $failedList[] = ['row' => $rowNum, 'name' => $name !== '' ? $name : 'Unnamed', 'reason' => $reason];
            };

            // --- Branch resolution ---
            $rowBranch = trim((string)($row['branch_id'] ?? $row['target_branch_id'] ?? $row['Branch ID'] ?? ''));
            if ($rowBranch === '') $rowBranch = (string)$defaultTargetBranch;

            if ($isBranchAdmin) {
                if ($rowBranch !== (string)$userBranchId) {
                    $fail("Unauthorized: You cannot upload teachers to branch '{$rowBranch}'. Your branch is '{$userBranchId}'.");
                    continue;
                }
            }
            if ($rowBranch === '') {
                $fail("Target branch is required. Please select or specify a valid Branch ID.");
                continue;
            }

            // Verify branch exists (and belongs to this school admin's school)
            if (!array_key_exists($rowBranch, $branchCache)) {
                try {
                    $stB = $db->prepare("SELECT SCHL_BR_ID, SCHL_BR_CENTER_ID FROM SCHL_BRANCH WHERE SCHL_BR_ID = ? LIMIT 1");
                    $stB->execute([$rowBranch]);
                    $branchCache[$rowBranch] = $stB->fetch(PDO::FETCH_ASSOC) ?: false;
                } catch (Exception $e) {
                    $branchCache[$rowBranch] = false;
                }
            }
            $branchRow = $branchCache[$rowBranch];
            if (!$branchRow) {
                $fail("Branch '{$rowBranch}' was not found.");
                continue;
            }
            if ($userRole === 'R_SCHOOLADMIN' || $userRole === 'SCHOOL_ADMIN') {
                $ownerId = $this->user['userId'] ?? $this->user['user_id'] ?? null;
                if ($ownerId && (string)$branchRow['SCHL_BR_CENTER_ID'] !== (string)$ownerId) {
                    $fail("Unauthorized: Branch '{$rowBranch}' does not belong to your school.");
                    continue;
                }
            }

            // --- Field extraction ---
            $email = strtolower(trim($row['TCHR_EMAIL'] ?? $row['Email'] ?? $row['email'] ?? ''));
            $phone = preg_replace('/[^0-9]/', '', (string)($row['TCHR_CONTACT_NO'] ?? $row['Phone'] ?? $row['phone'] ?? ''));
            if (strlen($phone) > 10) $phone = substr($phone, -10);
            $aadhar = preg_replace('/[^0-9]/', '', (string)($row['BR_TCHR_AADHAR'] ?? $row['Aadhar Number'] ?? $row['aadhar'] ?? ''));
            $pan = strtoupper(trim((string)($row['BR_TCHR_PAN'] ?? $row['PAN Number'] ?? $row['pan'] ?? '')));
            $className = trim((string)($row['class_name'] ?? $row['Class Name'] ?? $row['className'] ?? ''));
            $subjectName = trim((string)($row['subject_name'] ?? $row['Subject Name'] ?? $row['subject'] ?? ''));
            $statusRaw = ucfirst(strtolower(trim((string)($row['TCHR_STATUS'] ?? $row['Status'] ?? $row['status'] ?? 'Active'))));
            $status = in_array($statusRaw, ['Active', 'Inactive']) ? $statusRaw : 'Active';
            $loginId = strtolower(trim((string)($row['USER_ID'] ?? $row['User ID'] ?? $row['userId'] ?? '')));
            $password = (string)($row['PASSWORD'] ?? $row['Password'] ?? $row['password'] ?? '');
            if ($loginId === '') $loginId = $email;
            if ($password === '') $password = 'Teacher@123';

            // --- Validation (mirrors Add Teacher form) ---
            if ($name === '') { $fail('Teacher Name is required'); continue; }
            if (!preg_match('/^[a-zA-Z\s\.]+$/', $name)) { $fail('Name can only contain letters, spaces and dots'); continue; }
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) { $fail('A valid Email is required'); continue; }
            if (!preg_match('/^[6-9]\d{9}$/', $phone)) { $fail('Phone must be a valid 10-digit Indian number (starts with 6-9)'); continue; }
            if ($aadhar !== '' && strlen($aadhar) !== 12) { $fail('Aadhar must be exactly 12 digits'); continue; }
            if ($pan !== '' && !preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]$/', $pan)) { $fail('Invalid PAN format (e.g. ABCDE1234F)'); continue; }
            if (strlen($password) < 6) { $fail('Password must be at least 6 characters'); continue; }
            if ($loginId === '') { $fail('User ID could not be determined'); continue; }

            // --- In-file duplicates ---
            if (isset($seenEmails[$email])) { $fail("Duplicate email in file (also on row #{$seenEmails[$email]})"); continue; }
            if (isset($seenUserIds[$loginId])) { $fail("Duplicate User ID in file (also on row #{$seenUserIds[$loginId]})"); continue; }

            try {
                // --- DB duplicates ---
                $stDup = $db->prepare("SELECT BR_TCHR_ID FROM SCHL_BR_TCHR WHERE LOWER(BR_TCHR_EMAI_ID) = ? LIMIT 1");
                $stDup->execute([$email]);
                if ($stDup->fetchColumn()) { $fail("A teacher with email '{$email}' already exists"); continue; }

                if ($userModel->getById($loginId)) { $fail("User ID '{$loginId}' is already taken"); continue; }

                // --- Resolve class (optional) ---
                $classId = null;
                if ($className !== '') {
                    $stC = $db->prepare("SELECT SCHL_BR_CLS_ID FROM SCHL_BR_CLASS WHERE SCHL_BR_CENT_ID = ? AND (LOWER(TRIM(SCHL_BR_CLASS_NM)) = LOWER(?) OR SCHL_BR_CLS_ID = ?) LIMIT 1");
                    $stC->execute([$rowBranch, $className, $className]);
                    $classId = $stC->fetchColumn() ?: null;
                    if (!$classId) {
                        $digits = preg_replace('/[^0-9]/', '', $className);
                        if ($digits !== '') {
                            foreach (["Class $digits", "Grade $digits", $digits] as $variant) {
                                $stC->execute([$rowBranch, $variant, $variant]);
                                $classId = $stC->fetchColumn() ?: null;
                                if ($classId) break;
                            }
                        }
                    }
                    if (!$classId) { $fail("Class '{$className}' not found in branch '{$rowBranch}'"); continue; }
                }

                // --- Resolve subject (optional; scoped to assigned class if given) ---
                $subjectId = null;
                if ($subjectName !== '') {
                    $sqlS = "SELECT s.BR_CLS_SUB_ID FROM SCHL_BR_CLS_SUBJECT s
                             JOIN SCHL_BR_CLASS c ON s.BR_CLS_ID = c.SCHL_BR_CLS_ID
                             WHERE c.SCHL_BR_CENT_ID = ? AND (LOWER(TRIM(s.BR_CLS_SUB_NAME)) = LOWER(?) OR s.BR_CLS_SUB_ID = ?)";
                    $paramsS = [$rowBranch, $subjectName, $subjectName];
                    if ($classId) { $sqlS .= " AND s.BR_CLS_ID = ?"; $paramsS[] = $classId; }
                    $sqlS .= " LIMIT 1";
                    $stS = $db->prepare($sqlS);
                    $stS->execute($paramsS);
                    $subjectId = $stS->fetchColumn() ?: null;
                    if (!$subjectId) {
                        $where = $className !== '' ? " for class '{$className}'" : '';
                        $fail("Subject '{$subjectName}' not found{$where} in branch '{$rowBranch}'");
                        continue;
                    }
                }

                // --- Insert (one transaction per row so one bad row never blocks the rest) ---
                $db->beginTransaction();
                try {
                    $teacherId = strtoupper(uniqid('TCHR_'));
                    $this->teacherModel->create([
                        'TCHR_ID' => $teacherId,
                        'TCHR_NM' => $name,
                        'BR_TCHR_BR_ID' => $rowBranch,
                        'TCHR_EMAIL' => $email,
                        'TCHR_CONTACT_NO' => $phone,
                        'BR_TCHR_AADHAR' => $aadhar,
                        'BR_TCHR_PAN' => $pan,
                        'BR_TCHR_ASSIGNED_CLASS_ID' => $classId,
                        'TCHR_STATUS' => $status
                    ]);

                    if ($subjectId) {
                        $this->teacherSubjectModel->create([
                            'TCHR_SUB_MAP_ID' => strtoupper(uniqid('MAP_')),
                            'TCHR_ID' => $teacherId,
                            'TCHR_SUB_ID' => $subjectId
                        ]);
                    }

                    $userModel->create([
                        'user_id' => $loginId,
                        'user_email_id' => $email,
                        'user_first_name' => $name,
                        'user_role' => 'R_TEACHER',
                        'user_passwd' => $password,
                        'user_branch_id' => $rowBranch
                    ]);

                    $db->commit();
                } catch (Exception $inner) {
                    if ($db->inTransaction()) $db->rollBack();
                    throw $inner;
                }

                $seenEmails[$email] = $rowNum;
                $seenUserIds[$loginId] = $rowNum;
                $successList[] = [
                    'id' => $teacherId,
                    'name' => $name,
                    'user_id' => $loginId,
                    'branch_id' => $rowBranch
                ];
            } catch (Exception $ex) {
                $fail('Database error: ' . $ex->getMessage());
            }
        }

        Response::success("Bulk teacher upload process completed", [
            'totalProcessed' => count($teachersList),
            'successCount' => count($successList),
            'failedCount' => count($failedList),
            'successful' => $successList,
            'failures' => $failedList
        ], 200);
    }
}