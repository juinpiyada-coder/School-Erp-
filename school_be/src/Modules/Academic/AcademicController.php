<?php

require_once __DIR__ . '/MatrixModel.php';
require_once __DIR__ . '/BoardModel.php';

class AcademicController {
    // Subject name: Roman/English letters and single spaces only.
    private function validateSubjectName($value) {
        $value = trim((string)$value);
        if ($value === '') {
            Response::error("BR_CLS_SUB_NAME (Subject Name) is required", 400);
        }
        if (!preg_match('/^[A-Za-z]+( [A-Za-z]+)*$/', $value)) {
            Response::error("Subject name can contain only letters and spaces", 400);
        }
        return $value;
    }

    private $branchModel;
    private $roomModel;
    private $classModel;
    private $sessionModel;
    private $classScheduleModel;
    private $subjectModel;
    private $matrixModel;
    private $boardModel;
    private $userService;

    private $user;

    public function __construct() {
        $this->user = JwtHandler::validateTokenFromHeader();
        if (!$this->user) {
            Response::error("Unauthorized access. Token missing or expired.", 401);
            exit;
        }
        
        $this->branchModel = new BranchModel();
        $this->roomModel = new RoomModel();
        $this->classModel = new ClassModel();
        $this->sessionModel = new SessionModel();
        $this->classScheduleModel = new ClassScheduleModel();
        $this->subjectModel = new SubjectModel();
        $this->matrixModel = new MatrixModel();
        $this->boardModel = new BoardModel();
        $this->userService = new UserService();
    }

    // --- Boards CRUD ---
    public function handleBoards($method, $id, $data) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $board = $this->boardModel->getById($id);
                    if ($board) {
                        Response::success("Board retrieved successfully", $board);
                    } else {
                        Response::error("Board not found", 404);
                    }
                } else {
                    $boards = $this->boardModel->getAll();
                    Response::success("Boards retrieved successfully", $boards);
                }
                break;

            case 'POST':
                if (empty($data['BRD_ID']) && empty($data['brd_id'])) {
                    $data['BRD_ID'] = 'BRD_' . strtoupper(bin2hex(random_bytes(4)));
                } else {
                    $data['BRD_ID'] = $data['BRD_ID'] ?? $data['brd_id'];
                }

                $desc = $data['BRD_DESC'] ?? $data['brd_desc'] ?? null;
                if (empty($desc)) {
                    Response::error("Board description (BRD_DESC) is required", 400);
                    return;
                }
                $data['BRD_DESC'] = $desc;
                $data['BRD_STATE'] = $data['BRD_STATE'] ?? $data['brd_state'] ?? null;

                try {
                    $this->boardModel->create($data);
                    $created = $this->boardModel->getById($data['BRD_ID']);
                    Response::success("Board created successfully", $created, 201);
                } catch (Exception $e) {
                    Response::error("Failed to create board: " . $e->getMessage(), 500);
                }
                break;

            case 'PUT':
                if (!$id) {
                    Response::error("Board ID is required for update", 400);
                    return;
                }
                $existing = $this->boardModel->getById($id);
                if (!$existing) {
                    Response::error("Board not found", 404);
                    return;
                }

                $updateData = [];
                if (isset($data['BRD_DESC']) || isset($data['brd_desc'])) {
                    $updateData['BRD_DESC'] = $data['BRD_DESC'] ?? $data['brd_desc'];
                }
                if (isset($data['BRD_STATE']) || isset($data['brd_state'])) {
                    $updateData['BRD_STATE'] = $data['BRD_STATE'] ?? $data['brd_state'];
                }

                try {
                    $this->boardModel->update($id, $updateData);
                    $updated = $this->boardModel->getById($id);
                    Response::success("Board updated successfully", $updated);
                } catch (Exception $e) {
                    Response::error("Failed to update board: " . $e->getMessage(), 500);
                }
                break;

            case 'DELETE':
                if (!$id) {
                    Response::error("Board ID is required for deletion", 400);
                    return;
                }
                $existing = $this->boardModel->getById($id);
                if (!$existing) {
                    Response::error("Board not found", 404);
                    return;
                }
                try {
                    $this->boardModel->delete($id);
                    Response::success("Board deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete board: " . $e->getMessage(), 500);
                }
                break;

            default:
                Response::error("Method not allowed", 405);
        }
    }

    // --- Branches CRUD ---
    public function handleBranches($method, $id, $data) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $branch = $this->branchModel->getById($id);
                    if ($branch) {
                        Response::success("Branch found", $branch);
                    } else {
                        Response::error("Branch not found", 404);
                    }
                } else {
                    $page = isset($data['page']) ? (int)$data['page'] : 1;
                    $limit = isset($data['limit']) ? (int)$data['limit'] : 10;
                    if ($limit <= 0) $limit = 10;
                    if ($page <= 0) $page = 1;
                    $offset = ($page - 1) * $limit;
                    
                    $items = $this->branchModel->getAll($limit, $offset, $this->user);
                    $total = $this->branchModel->getTotalCount($this->user);
                    
                    $pagination = [
                        'total' => $total,
                        'page' => $page,
                        'limit' => $limit,
                        'totalPages' => ceil($total / $limit)
                    ];
                    Response::success("All branches fetched", $items, 200, $pagination);
                }
                break;

            case 'POST':
                $userRole = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? '');
                $isSchoolLevel = ($userRole === 'R_SCHOOLADMIN' || strpos($userRole, 'SCHOOL') !== false);
                if ($this->user && $isSchoolLevel) {
                    $effectiveSchoolId = $this->user['school_id'] ?? $this->user['user_school_id'] ?? $this->user['SCHL_ID'] ?? $this->user['userId'] ?? $this->user['user_id'] ?? null;
                    if ($effectiveSchoolId && (empty($data['SCHL_BR_CENTER_ID']) || $data['SCHL_BR_CENTER_ID'] === 'null')) {
                        $data['SCHL_BR_CENTER_ID'] = $effectiveSchoolId;
                    }
                }
                
                $required = ['SCHL_BR_CENTER_ID', 'SCHL_BR_NM', 'SCHL_BR_CITY', 'SCHL_BR_STATE', 'SCHL_BR_PIN', 'SCHL_BR_COUNTRY', 'SCHL_BR_EMAILID', 'SCHL_BR_CONTACTNO'];
                foreach ($required as $field) {
                    if (empty($data[$field])) {
                        Response::error("$field is required", 400);
                    }
                }
                if (!preg_match('/^[a-zA-Z0-9\s]+$/', trim($data['SCHL_BR_NM']))) {
                    Response::error("Branch name can only contain letters, numbers, and spaces", 400);
                }
                if (empty($data['SCHL_BR_ID'])) {
                    $data['SCHL_BR_ID'] = strtoupper(uniqid('BR_'));
                }
                try {
                    $insertedId = $this->branchModel->create($data);
                    
                    // Create user account for the branch so they can login
                    if (!empty($data['SCHL_BR_PASSWORD'])) {
                        $userData = [
                            'user_id' => $insertedId,
                            'user_email_id' => $data['SCHL_BR_EMAILID'],
                            'user_first_name' => $data['SCHL_BR_NM'],
                            'user_last_name' => '',
                            'user_passwd' => $data['SCHL_BR_PASSWORD'],
                            'user_role' => 'R_BRANCHADMIN',
                            'user_school_id' => $data['SCHL_BR_CENTER_ID'],
                            'user_branch_id' => $insertedId
                        ];
                        $this->userService->createUser($userData);
                    }

                    $insertedBranch = $this->branchModel->getById($insertedId);
                    Response::success("Branch created successfully", $insertedBranch, 201);
                } catch (Exception $e) {
                    Response::error("Failed to create branch: " . $e->getMessage(), 500);
                }
                break;

            case 'PUT':
                if (!$id) {
                    Response::error("Branch ID is required for update", 400);
                }
                $existing = $this->branchModel->getById($id);
                if (!$existing) {
                    Response::error("Branch not found", 404);
                }
                
                $userRole = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? '');
                $isSchoolLevel = ($userRole === 'R_SCHOOLADMIN' || strpos($userRole, 'SCHOOL') !== false);
                if ($this->user && $isSchoolLevel) {
                    $schoolId = $this->user['school_id'] ?? $this->user['user_school_id'] ?? $this->user['SCHL_ID'] ?? $this->user['userId'] ?? $this->user['user_id'] ?? null;
                    if ($schoolId && (empty($data['SCHL_BR_CENTER_ID']) || $data['SCHL_BR_CENTER_ID'] === 'null')) {
                        $data['SCHL_BR_CENTER_ID'] = $schoolId;
                    }
                }
                if (isset($data['SCHL_BR_NM']) && !preg_match('/^[a-zA-Z0-9\s]+$/', trim($data['SCHL_BR_NM']))) {
                    Response::error("Branch name can only contain letters, numbers, and spaces", 400);
                }
                try {
                    $this->branchModel->update($id, $data);

                    // Keep the branch's login in sync (user_id == branch id) so a changed email still logs in
                    if ($this->userService->getUserById($id)) {
                        $loginUpdate = [];
                        if (!empty($data['SCHL_BR_EMAILID'])) $loginUpdate['user_email_id'] = $data['SCHL_BR_EMAILID'];
                        if (!empty($data['SCHL_BR_NM']))      $loginUpdate['user_first_name'] = $data['SCHL_BR_NM'];
                        if (!empty($data['SCHL_BR_PASSWORD'])) $loginUpdate['user_passwd'] = $data['SCHL_BR_PASSWORD'];
                        if (!empty($loginUpdate)) {
                            $loginUpdate['user_branch_id'] = $id;
                            $this->userService->updateUser($id, $loginUpdate);
                        }
                    }
                    $updated = $this->branchModel->getById($id);
                    Response::success("Branch updated successfully", $updated);
                } catch (Exception $e) {
                    Response::error("Failed to update branch: " . $e->getMessage(), 500);
                }
                break;

            case 'DELETE':
                if (!$id) {
                    Response::error("Branch ID is required for deletion", 400);
                }
                $existing = $this->branchModel->getById($id);
                if (!$existing) {
                    Response::error("Branch not found", 404);
                }
                try {
                    $this->branchModel->delete($id);
                    Response::success("Branch deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete branch: " . $e->getMessage(), 500);
                }
                break;

            default:
                Response::error("Method not allowed", 405);
        }
    }

    // Names: letters, numbers and single spaces only; blank-only values rejected.
    private function validateRoomName($value, $label, $required) {
        $value = trim((string)$value);
        if ($value === '') {
            if ($required) Response::error("$label is required", 400);
            return;
        }
        if (!preg_match('/^[A-Za-z0-9]+( [A-Za-z0-9]+)*$/', $value)) {
            Response::error("$label can contain only letters, numbers and spaces", 400);
        }
    }

    // --- Rooms CRUD ---
    public function handleRooms($method, $id, $data) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $room = $this->roomModel->getById($id);
                    if ($room) {
                        Response::success("Room found", $room);
                    } else {
                        Response::error("Room not found", 404);
                    }
                } else {
                    $page = isset($data['page']) ? (int)$data['page'] : 1;
                    $limit = isset($data['limit']) ? (int)$data['limit'] : 10;
                    if ($limit <= 0) $limit = 10;
                    if ($page <= 0) $page = 1;
                    $offset = ($page - 1) * $limit;
                    
                    $items = $this->roomModel->getAll($limit, $offset, $this->user);
                    $total = $this->roomModel->getTotalCount($this->user);
                    
                    $pagination = [
                        'total' => $total,
                        'page' => $page,
                        'limit' => $limit,
                        'totalPages' => ceil($total / $limit)
                    ];
                    Response::success("All rooms fetched", $items, 200, $pagination);
                }
                break;

            case 'POST':
                if (empty($data['SCHL_BR_REF_ID']) && $this->user && in_array(strtoupper($this->user['role_id'] ?? ''), ['R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL'])) {
                    $data['SCHL_BR_REF_ID'] = $this->user['userId'];
                }
                if (empty($data['SCHL_BR_REF_ID'])) {
                    Response::error("SCHL_BR_REF_ID (Branch ID Reference) is required", 400);
                }
                if (!isset($data['SCHL_BR_ROOM_DESC']) || $data['SCHL_BR_ROOM_DESC'] === '') {
                    Response::error("SCHL_BR_ROOM_DESC (Room Description) is required", 400);
                }
                $this->validateRoomName($data['SCHL_BR_ROOM_DESC'], 'Room name', true);
                $this->validateRoomName($data['SCHL_BR_BUILDING'] ?? '', 'Building name', false);
                $data['SCHL_BR_ROOM_DESC'] = trim($data['SCHL_BR_ROOM_DESC']);
                if (empty($data['SCHL_BR_RM_ID'])) {
                    $data['SCHL_BR_RM_ID'] = $this->roomModel->generateNextRoomId();
                }
                try {
                    $insertedId = $this->roomModel->create($data);
                    $insertedRoom = $this->roomModel->getById($insertedId);
                    Response::success("Room created successfully", $insertedRoom, 201);
                } catch (Exception $e) {
                    Response::error("Failed to create room: " . $e->getMessage(), 500);
                }
                break;

            case 'PUT':
                if (!$id) {
                    Response::error("Room ID is required for update", 400);
                }
                $existing = $this->roomModel->getById($id);
                if (!$existing) {
                    Response::error("Room not found", 404);
                }
                if (array_key_exists('SCHL_BR_ROOM_DESC', $data)) {
                    $this->validateRoomName($data['SCHL_BR_ROOM_DESC'], 'Room name', true);
                    $data['SCHL_BR_ROOM_DESC'] = trim($data['SCHL_BR_ROOM_DESC']);
                }
                if (array_key_exists('SCHL_BR_BUILDING', $data)) {
                    $this->validateRoomName($data['SCHL_BR_BUILDING'], 'Building name', false);
                }
                try {
                    $this->roomModel->update($id, $data);
                    $updated = $this->roomModel->getById($id);
                    Response::success("Room updated successfully", $updated);
                } catch (Exception $e) {
                    Response::error("Failed to update room: " . $e->getMessage(), 500);
                }
                break;

            case 'DELETE':
                if (!$id) {
                    Response::error("Room ID is required for deletion", 400);
                }
                $existing = $this->roomModel->getById($id);
                if (!$existing) {
                    Response::error("Room not found", 404);
                }
                try {
                    $this->roomModel->delete($id);
                    Response::success("Room deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete room: " . $e->getMessage(), 500);
                }
                break;

            default:
                Response::error("Method not allowed", 405);
        }
    }

    public function handleRoomCategories($method, $id, $data) {
        if ($method === 'GET') {
            $branchId = $data['branch_id'] ?? null;
            if (!$branchId && $this->user && in_array(strtoupper($this->user['role_id'] ?? ''), ['R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL'])) {
                $branchId = $this->user['userId'];
            }
            $cats = $this->roomModel->getCategories($branchId);
            Response::success("Room categories retrieved", $cats);
        } elseif ($method === 'POST') {
            if (empty($data['CAT_NAME'])) {
                Response::error("CAT_NAME is required", 400);
            }
            if ($this->user) {
                $data['CAT_CREATEDBY'] = $this->user['userId'] ?? null;
                if (empty($data['CAT_BRANCH_ID']) && in_array(strtoupper($this->user['role_id'] ?? ''), ['R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL'])) {
                    $data['CAT_BRANCH_ID'] = $this->user['userId'];
                }
            }
            try {
                $this->roomModel->createCategory($data);
                Response::success("Category created successfully", null, 201);
            } catch (Exception $e) {
                Response::error("Failed to create category: " . $e->getMessage(), 500);
            }
        } else {
            Response::error("Method not allowed", 405);
        }
    }

    // --- Classes CRUD ---
    // Class name: standard names ("Class 1".."Class 12") or Roman/English letters and single spaces only.
    private function validateClassName($value) {
        $value = trim((string)$value);
        if ($value === '') {
            Response::error("SCHL_BR_CLASS_NM (Class Name) is required", 400);
        }
        if (preg_match('/^Class (1[0-2]|[1-9])$/', $value)) return;
        if (!preg_match('/^[A-Za-z]+( [A-Za-z]+)*$/', $value)) {
            Response::error("Class name can contain only Roman letters (A-Z) and spaces", 400);
        }
    }

    public function handleClasses($method, $id, $data) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $class = $this->classModel->getById($id);
                    if ($class) {
                        Response::success("Class found", $class);
                    } else {
                        Response::error("Class not found", 404);
                    }
                } else {
                    $page = isset($data['page']) ? (int)$data['page'] : 1;
                    $limit = isset($data['limit']) ? (int)$data['limit'] : 10;
                    if ($limit <= 0) $limit = 10;
                    if ($page <= 0) $page = 1;
                    $offset = ($page - 1) * $limit;
                    
                    $items = $this->classModel->getAll($limit, $offset, $this->user);
                    $total = $this->classModel->getTotalCount($this->user);
                    
                    $pagination = [
                        'total' => $total,
                        'page' => $page,
                        'limit' => $limit,
                        'totalPages' => ceil($total / $limit)
                    ];
                    Response::success("All classes fetched", $items, 200, $pagination);
                }
                break;

            case 'POST':
                if (empty($data['SCHL_BR_CENT_ID']) && $this->user && in_array(strtoupper($this->user['role_id'] ?? ''), ['R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL'])) {
                    $data['SCHL_BR_CENT_ID'] = $this->user['userId'];
                }
                if (empty($data['SCHL_BR_CENT_ID'])) {
                    Response::error("SCHL_BR_CENT_ID (Branch ID) is required", 400);
                }
                if (!isset($data['SCHL_BR_CLASS_NM']) || trim($data['SCHL_BR_CLASS_NM']) === '') {
                    Response::error("SCHL_BR_CLASS_NM (Class Name) is required", 400);
                }
                $this->validateClassName($data['SCHL_BR_CLASS_NM']);
                $data['SCHL_BR_CLASS_NM'] = trim($data['SCHL_BR_CLASS_NM']);
                if (empty($data['SCHL_BR_CLS_ID'])) {
                    $data['SCHL_BR_CLS_ID'] = strtoupper(uniqid('CLS_'));
                }
                try {
                    $insertedId = $this->classModel->create($data);
                    $insertedClass = $this->classModel->getById($insertedId);
                    Response::success("Class created successfully", $insertedClass, 201);
                } catch (Exception $e) {
                    Response::error("Failed to create class: " . $e->getMessage(), 500);
                }
                break;

            case 'PUT':
                if (!$id) {
                    Response::error("Class ID is required for update", 400);
                }
                $existing = $this->classModel->getById($id);
                if (!$existing) {
                    Response::error("Class not found", 404);
                }
                if (array_key_exists('SCHL_BR_CLASS_NM', $data)) {
                    $this->validateClassName($data['SCHL_BR_CLASS_NM']);
                    $data['SCHL_BR_CLASS_NM'] = trim($data['SCHL_BR_CLASS_NM']);
                }
                try {
                    $this->classModel->update($id, $data);
                    $updated = $this->classModel->getById($id);
                    Response::success("Class updated successfully", $updated);
                } catch (Exception $e) {
                    Response::error("Failed to update class: " . $e->getMessage(), 500);
                }
                break;

            case 'DELETE':
                if (!$id) {
                    Response::error("Class ID is required for deletion", 400);
                }
                $existing = $this->classModel->getById($id);
                if (!$existing) {
                    Response::error("Class not found", 404);
                }
                try {
                    $this->classModel->delete($id);
                    Response::success("Class deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete class: " . $e->getMessage(), 500);
                }
                break;

            default:
                Response::error("Method not allowed", 405);
        }
    }

    // Section: exactly one letter (A-Z) or one digit (0-9).
    private function validateSectionValue($value) {
        $value = trim((string)$value);
        if ($value === '') {
            Response::error("SCHL_BR_CLASS_SEC_SESS_SECT (Section) is required", 400);
        }
        if (!preg_match('/^[A-Za-z0-9]$/', $value)) {
            Response::error("Section must be a single letter or a single digit (e.g. A, B, C or 1, 2, 3)", 400);
        }
        return strtoupper($value);
    }

    // --- Sections / Sessions CRUD ---
    public function handleSessions($method, $id, $data) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $session = $this->sessionModel->getById($id);
                    if ($session) {
                        Response::success("Session found", $session);
                    } else {
                        Response::error("Session not found", 404);
                    }
                } else {
                    $page = isset($data['page']) ? (int)$data['page'] : 1;
                    $limit = isset($data['limit']) ? (int)$data['limit'] : 10;
                    if ($limit <= 0) $limit = 10;
                    if ($page <= 0) $page = 1;
                    $offset = ($page - 1) * $limit;
                    
                    $items = $this->sessionModel->getAll($limit, $offset, $this->user);
                    $total = $this->sessionModel->getTotalCount($this->user);
                    
                    $pagination = [
                        'total' => $total,
                        'page' => $page,
                        'limit' => $limit,
                        'totalPages' => ceil($total / $limit)
                    ];
                    Response::success("All sessions fetched", $items, 200, $pagination);
                }
                break;

            case 'POST':
                if (empty($data['SCHL_BR_CLASS_SEC_SESS_BR_ID']) && $this->user && in_array(strtoupper($this->user['role_id'] ?? ''), ['R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL'])) {
                    $data['SCHL_BR_CLASS_SEC_SESS_BR_ID'] = $this->user['userId'];
                }
                if (empty($data['SCHL_BR_CLASS_SEC_SESS_BR_ID'])) {
                    Response::error("SCHL_BR_CLASS_SEC_SESS_BR_ID (Branch ID) is required", 400);
                }
                if (empty($data['SCHL_BR_CLASS_SEC_SESS_CLASS'])) {
                    Response::error("SCHL_BR_CLASS_SEC_SESS_CLASS (Class ID) is required", 400);
                }
                if (!isset($data['SCHL_BR_CLASS_SEC_SESS_SECT']) || trim((string)$data['SCHL_BR_CLASS_SEC_SESS_SECT']) === '') {
                    Response::error("SCHL_BR_CLASS_SEC_SESS_SECT (Section) is required", 400);
                }
                $data['SCHL_BR_CLASS_SEC_SESS_SECT'] = $this->validateSectionValue($data['SCHL_BR_CLASS_SEC_SESS_SECT']);
                if (empty($data['SCHL_BR_CLASS_SEC_SESS_ID'])) {
                    $data['SCHL_BR_CLASS_SEC_SESS_ID'] = strtoupper(uniqid('SESS_'));
                }
                try {
                    $insertedId = $this->sessionModel->create($data);
                    $insertedSession = $this->sessionModel->getById($insertedId);
                    Response::success("Session created successfully", $insertedSession, 201);
                } catch (Exception $e) {
                    Response::error("Failed to create session: " . $e->getMessage(), 500);
                }
                break;

            case 'PUT':
                if (!$id) {
                    Response::error("Session ID is required for update", 400);
                }
                $existing = $this->sessionModel->getById($id);
                if (!$existing) {
                    Response::error("Session not found", 404);
                }
                if (array_key_exists('SCHL_BR_CLASS_SEC_SESS_SECT', $data)) {
                    $data['SCHL_BR_CLASS_SEC_SESS_SECT'] = $this->validateSectionValue($data['SCHL_BR_CLASS_SEC_SESS_SECT']);
                }
                try {
                    $this->sessionModel->update($id, $data);
                    $updated = $this->sessionModel->getById($id);
                    Response::success("Session updated successfully", $updated);
                } catch (Exception $e) {
                    Response::error("Failed to update session: " . $e->getMessage(), 500);
                }
                break;

            case 'DELETE':
                if (!$id) {
                    Response::error("Session ID is required for deletion", 400);
                }
                $existing = $this->sessionModel->getById($id);
                if (!$existing) {
                    Response::error("Session not found", 404);
                }
                try {
                    $this->sessionModel->delete($id);
                    Response::success("Session deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete session: " . $e->getMessage(), 500);
                }
                break;

            default:
                Response::error("Method not allowed", 405);
        }
    }

    // --- Timetable ---
    public function handleTimetable($method, $id, $data) {
        $pathParts = explode('/', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
        if (in_array('entry', $pathParts)) {
            // It's PUT /academic/timetable/entry/{entryId} or POST
            if ($method === 'PUT') {
                try {
                    $this->classScheduleModel->update($id, $data);
                    Response::success("Timetable entry updated", $this->classScheduleModel->getById($id));
                } catch (Exception $e) {
                    Response::error("Failed to update timetable: " . $e->getMessage(), 500);
                }
            } else if ($method === 'POST') {
                if (empty($data['SCHL_CLS_SCHLDL_ID'])) {
                    $data['SCHL_CLS_SCHLDL_ID'] = strtoupper(uniqid('SCHLDL_'));
                }
                try {
                    $insertedId = $this->classScheduleModel->create($data);
                    Response::success("Timetable entry created", $this->classScheduleModel->getById($insertedId), 201);
                } catch (Exception $e) {
                    Response::error("Failed to create timetable: " . $e->getMessage(), 500);
                }
            } else if ($method === 'DELETE') {
                try {
                    $this->classScheduleModel->delete($id);
                    Response::success("Timetable entry deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete timetable: " . $e->getMessage(), 500);
                }
            } else {
                Response::error("Method not allowed", 405);
            }
        } else {
            // It's GET /academic/timetable/{classId}
            if ($method === 'GET') {
                try {
                    if ($id) {
                        $schedule = $this->classScheduleModel->getByClassId($id, $this->user);
                        Response::success("Timetable retrieved", $schedule);
                    } else {
                        $schedule = $this->classScheduleModel->getAll(null, null, $this->user);
                        Response::success("All timetables retrieved", $schedule);
                    }
                } catch (Exception $e) {
                    Response::error("Failed to retrieve timetable: " . $e->getMessage(), 500);
                }
            } else {
                Response::error("Method not allowed", 405);
            }
        }
    }

    // --- Subjects CRUD ---
    public function handleSubjects($method, $id, $data) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $subject = $this->subjectModel->getById($id);
                    if ($subject) {
                        Response::success("Subject found", $subject);
                    } else {
                        Response::error("Subject not found", 404);
                    }
                } elseif (!empty($data['BR_CLS_ID'])) {
                    Response::success("Subjects for class fetched", $this->subjectModel->getByClassId($data['BR_CLS_ID']));
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
                if (!isset($data['BR_CLS_SUB_NAME']) || $data['BR_CLS_SUB_NAME'] === '') {
                    Response::error("BR_CLS_SUB_NAME (Subject Name) is required", 400);
                }
                if (empty($data['BR_CLS_ID'])) {
                    Response::error("BR_CLS_ID (Class ID Reference) is required", 400);
                }
                $data['BR_CLS_SUB_NAME'] = $this->validateSubjectName($data['BR_CLS_SUB_NAME']);
                if (empty($data['BR_CLS_SUB_ID'])) {
                    $data['BR_CLS_SUB_ID'] = strtoupper(uniqid('SUB_'));
                }
                try {
                    $insertedId = $this->subjectModel->create($data);
                    $insertedSubject = $this->subjectModel->getById($insertedId);
                    Response::success("Subject created successfully", $insertedSubject, 201);
                } catch (Exception $e) {
                    Response::error("Failed to create subject: " . $e->getMessage(), 500);
                }
                break;

            case 'PUT':
                if (!$id) {
                    Response::error("Subject ID is required for update", 400);
                }
                $existing = $this->subjectModel->getById($id);
                if (!$existing) {
                    Response::error("Subject not found", 404);
                }
                if (array_key_exists('BR_CLS_SUB_NAME', $data)) {
                    $data['BR_CLS_SUB_NAME'] = $this->validateSubjectName($data['BR_CLS_SUB_NAME']);
                }
                try {
                    $this->subjectModel->update($id, $data);
                    $updated = $this->subjectModel->getById($id);
                    Response::success("Subject updated successfully", $updated);
                } catch (Exception $e) {
                    Response::error("Failed to update subject: " . $e->getMessage(), 500);
                }
                break;

            case 'DELETE':
                if (!$id) {
                    Response::error("Subject ID is required for deletion", 400);
                }
                $existing = $this->subjectModel->getById($id);
                if (!$existing) {
                    Response::error("Subject not found", 404);
                }
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

    // Time must flow forward: end must be later than start (e.g. 08:00 -> 14:00).
    private function validateMatrixTimeRange($from, $to) {
        $from = trim((string)$from);
        $to = trim((string)$to);
        if ($from === '' || $to === '') {
            Response::error("Start time and end time are required", 400);
        }
        $f = strtotime("1970-01-01 $from");
        $t = strtotime("1970-01-01 $to");
        if ($f === false || $t === false) {
            Response::error("Invalid start or end time format", 400);
        }
        if ($t <= $f) {
            Response::error("End time must be later than start time (e.g. 8:00 AM to 2:00 PM)", 400);
        }
    }

    // --- Branch Matrix CRUD ---
    public function handleMatrix($method, $id, $data) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $item = $this->matrixModel->getById($id);
                    if ($item) {
                        Response::success("Matrix found", $item);
                    } else {
                        Response::error("Matrix not found", 404);
                    }
                } else {
                    $page = isset($data['page']) ? (int)$data['page'] : 1;
                    $limit = isset($data['limit']) ? (int)$data['limit'] : 10;
                    if ($limit <= 0) $limit = 10;
                    if ($page <= 0) $page = 1;
                    $offset = ($page - 1) * $limit;

                    $items = $this->matrixModel->getAll($limit, $offset, $this->user);
                    $total = $this->matrixModel->getTotalCount($this->user);
                    $pagination = [
                        'total' => (int)$total,
                        'page' => $page,
                        'limit' => $limit,
                        'totalPages' => ceil($total / $limit)
                    ];
                    Response::success("All matrices fetched", $items, 200, $pagination);
                }
                break;

            case 'POST':
                if (!isset($data['SCHL_UNIQ_MATRIX_NM']) || $data['SCHL_UNIQ_MATRIX_NM'] === '') {
                    Response::error("SCHL_UNIQ_MATRIX_NM (Unique Matrix Name) is required", 400);
                }
                if (!isset($data['SCHL_NO_OF_CLASS'])) {
                    Response::error("SCHL_NO_OF_CLASS (Number of Classes) is required", 400);
                }
                if (!isset($data['SCHL_CLASS_DURATION'])) {
                    Response::error("SCHL_CLASS_DURATION (Duration in minutes) is required", 400);
                }
                $this->validateMatrixTimeRange($data['SCHL_CLASS_FRM'] ?? '', $data['SCHL_CLASS_TO'] ?? '');
                if (empty($data['SCHL_MAT_ID'])) {
                    $data['SCHL_MAT_ID'] = strtoupper(uniqid('MAT_'));
                }
                // Enforce tenant scoping on creation
                if ($this->user) {
                    $roleId = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? '');
                    if ($roleId === 'R_SCHOOLADMIN') {
                        $data['SCHL_MAT_SCHOOL_ID'] = $this->user['userId'];
                    } elseif (in_array($roleId, ['R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL'])) {
                        $data['SCHL_MAT_BRANCH_ID'] = $this->user['userId'];
                    }
                }
                try {
                    $insertedId = $this->matrixModel->create($data);
                    $insertedMatrix = $this->matrixModel->getById($insertedId);
                    Response::success("Matrix created successfully", $insertedMatrix, 201);
                } catch (Exception $e) {
                    Response::error("Failed to create matrix: " . $e->getMessage(), 500);
                }
                break;

            case 'PUT':
                if (!$id) {
                    Response::error("Matrix ID is required for update", 400);
                }
                $existing = $this->matrixModel->getById($id);
                if (!$existing) {
                    Response::error("Matrix not found", 404);
                }
                if (isset($data['SCHL_CLASS_FRM']) || isset($data['SCHL_CLASS_TO'])) {
                    $this->validateMatrixTimeRange(
                        $data['SCHL_CLASS_FRM'] ?? ($existing['SCHL_CLASS_FRM'] ?? ''),
                        $data['SCHL_CLASS_TO'] ?? ($existing['SCHL_CLASS_TO'] ?? '')
                    );
                }
                // Tenant authorization check
                if ($this->user) {
                    $roleId = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? '');
                    if ($roleId === 'R_SCHOOLADMIN') {
                        if (!empty($existing['SCHL_MAT_SCHOOL_ID']) && $existing['SCHL_MAT_SCHOOL_ID'] !== $this->user['userId']) {
                            Response::error("Unauthorized to modify this matrix", 403);
                        }
                        $data['SCHL_MAT_SCHOOL_ID'] = $this->user['userId'];
                    } elseif (in_array($roleId, ['R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL'])) {
                        if (!empty($existing['SCHL_MAT_BRANCH_ID']) && $existing['SCHL_MAT_BRANCH_ID'] !== $this->user['userId']) {
                            Response::error("Unauthorized to modify this matrix", 403);
                        }
                        $data['SCHL_MAT_BRANCH_ID'] = $this->user['userId'];
                    }
                }
                try {
                    $this->matrixModel->update($id, $data);
                    $updated = $this->matrixModel->getById($id);
                    Response::success("Matrix updated successfully", $updated);
                } catch (Exception $e) {
                    Response::error("Failed to update matrix: " . $e->getMessage(), 500);
                }
                break;

            case 'DELETE':
                if (!$id) {
                    Response::error("Matrix ID is required for deletion", 400);
                }
                $existing = $this->matrixModel->getById($id);
                if (!$existing) {
                    Response::error("Matrix not found", 404);
                }
                // Tenant authorization check
                if ($this->user) {
                    $roleId = strtoupper($this->user['role_id'] ?? $this->user['user_role'] ?? '');
                    if ($roleId === 'R_SCHOOLADMIN' && !empty($existing['SCHL_MAT_SCHOOL_ID']) && $existing['SCHL_MAT_SCHOOL_ID'] !== $this->user['userId']) {
                        Response::error("Unauthorized to delete this matrix", 403);
                    } elseif (in_array($roleId, ['R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL']) && !empty($existing['SCHL_MAT_BRANCH_ID']) && $existing['SCHL_MAT_BRANCH_ID'] !== $this->user['userId']) {
                        Response::error("Unauthorized to delete this matrix", 403);
                    }
                }
                try {
                    $this->matrixModel->delete($id);
                    Response::success("Matrix deleted successfully");
                } catch (Exception $e) {
                    Response::error("Failed to delete matrix: " . $e->getMessage(), 500);
                }
                break;

            default:
                Response::error("Method not allowed", 405);
        }
    }
}