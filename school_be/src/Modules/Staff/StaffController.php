<?php

require_once dirname(__DIR__, 2) . '/Core/Utils/Response.php';
require_once dirname(__DIR__, 2) . '/Core/Utils/JwtHandler.php';
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
        switch ($method) {
            case 'GET':
                try {
                    if ($id) {
                        $mapping = $this->teacherSubjectModel->getById($id);
                        if ($mapping) Response::success("Mapping found", $mapping);
                        else Response::error("Mapping not found", 404);
                    } else {
                        $page = isset($data['page']) ? (int)$data['page'] : 1;
                        $limit = isset($data['limit']) ? (int)$data['limit'] : 10;
                        if ($limit <= 0) $limit = 10;
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

    // --- Teacher Attendance CRUD ---
    public function handleAttendance($method, $id, $data) {
        if ($method === 'GET' && $id === 'summary') {
            $this->getAttendanceSummary($data);
            return;
        }

        // Only Branch Admin (or Super Admin) can record or update teacher attendance
        if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
            $userRole = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? '');
            $isBranchAdmin = ($userRole === 'R_BRANCHADMIN' || strpos($userRole, 'BRANCH') !== false || $userRole === 'R_SUPERADMIN');
            if (!$isBranchAdmin) {
                Response::error("Access denied: Only Branch Admin can record or update teacher attendance.", 403);
                return;
            }
        }

        switch ($method) {
            case 'GET':
                if ($id) {
                    $viewerRole = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? '');
                    $viewerIsAdmin = ($viewerRole === 'R_SUPERADMIN' || $viewerRole === 'R_SCHOOLADMIN' || $viewerRole === 'R_SCHOOLEXECUTIVE' || strpos($viewerRole, 'BRANCH') !== false);
                    if (!$viewerIsAdmin && (string)$id !== (string)($this->user['userId'] ?? '')) {
                        Response::error("Access denied: you can only view your own attendance.", 403);
                        return;
                    }
                    $att = $this->attendanceModel->getById($id, $data['date'] ?? null);
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
}