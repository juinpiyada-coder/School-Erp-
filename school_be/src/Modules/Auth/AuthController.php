<?php

class AuthController {
    private $roleService;
    private $userService;
    private $schoolService;
    private $roleLinkService;

    public function __construct() {
        $this->roleService = new RoleService();
        $this->userService = new UserService();
        $this->schoolService = new SchoolService();
        $this->roleLinkService = new RoleLinkService();
    }

    private function requireAuth() {
        $user = JwtHandler::validateTokenFromHeader();
        if (!$user) {
            Response::error("Unauthorized access. Token missing or expired.", 401);
            exit;
        }
        return $user;
    }

    public function login() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                $data = $_POST;
            }
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';
            
            $result = $this->userService->login($email, $password);
            if ($result['success']) {
                Response::success([
                    'access_token' => $result['token'],
                    'user' => $result['user']
                ], $result['message']);
            } else {
                Response::error($result['message'], 401);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function logout() {
        // Stateless JWT logout - frontend clears the token
        Response::success(null, "Logged out successfully");
    }

    public function refreshToken() {
        try {
            $payload = $this->requireAuth();
            $newToken = JwtHandler::generateToken($payload);
            Response::success(['access_token' => $newToken], "Token refreshed");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function me() {
        try {
            $payload = $this->requireAuth();
            $user = $this->userService->getUserById($payload['userId']);
            if ($user) {
                // remove sensitive info
                unset($user['user_passwd']);
                Response::success($user, "Profile retrieved");
            } else {
                Response::error("User not found", 404);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function updateProfile() {
        try {
            $payload = $this->requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                Response::error("Empty request body", 400);
                return;
            }
            // Prevent password/role changes through this endpoint
            unset($data['user_passwd'], $data['user_role']);

            $result = $this->userService->updateUser($payload['userId'], $data);
            if ($result['success']) {
                $user = $this->userService->getUserById($payload['userId']);
                unset($user['user_passwd']);
                Response::success($user, "Profile updated successfully");
            } else {
                Response::error($result['message'], 400, $result['errors'] ?? null);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function changePassword() {
        try {
            $payload = $this->requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['new_password'])) {
                Response::error("New password is required", 400);
                return;
            }
            // Mock change password implementation since there's no specific UserService method yet
            $this->userService->updateUser($payload['userId'], ['user_passwd' => $data['new_password']]);
            Response::success(null, "Password changed successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function assignRole() {
        try {
            $this->requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['user_id']) || empty($data['role'])) {
                Response::error("User ID and role are required", 400);
                return;
            }
            $result = $this->userService->updateUser($data['user_id'], ['user_role' => $data['role']]);
            if ($result['success']) {
                Response::success(null, "Role assigned successfully");
            } else {
                Response::error($result['message'], 400);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    // Role CRUD
    public function getRoles() {
        try {
            $this->requireAuth();
            $roles = $this->roleService->getAllRoles();
            Response::success($roles, "Roles retrieved successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function getRole($id) {
        try {
            $this->requireAuth();
            $role = $this->roleService->getRoleById($id);
            if (!$role) {
                Response::error("Role not found", 404);
                return;
            }
            Response::success($role, "Role retrieved successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function createRole() {
        try {
            $this->requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                Response::error("Empty request body", 400);
                return;
            }
            
            $result = $this->roleService->createRole($data);
            if ($result['success']) {
                Response::success(null, $result['message'], 201);
            } else {
                Response::error($result['message'], 400, $result['errors'] ?? null);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function updateRole($id) {
        try {
            $this->requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                Response::error("Empty request body", 400);
                return;
            }
            
            $result = $this->roleService->updateRole($id, $data);
            if ($result['success']) {
                Response::success(null, $result['message']);
            } else {
                Response::error($result['message'], 400, $result['errors'] ?? null);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function deleteRole($id) {
        try {
            $this->requireAuth();
            $result = $this->roleService->deleteRole($id);
            if ($result['success']) {
                Response::success(null, $result['message']);
            } else {
                Response::error($result['message'], 400);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    // Role Links CRUD (SM_ROLE_LINKS)
    public function getRoleLinks() {
        try {
            $this->requireAuth();
            $roleId = $_GET['role_id'] ?? $_GET['MAS_ROLE_ID'] ?? $_GET['SM_RL_ROLE_ID'] ?? null;
            $status = $_GET['status'] ?? $_GET['SM_RL_STATUS'] ?? null;
            $links = $this->roleLinkService->getAllLinks($roleId, $status);
            Response::success($links, "Role links retrieved successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function getRoleLink($id) {
        try {
            $this->requireAuth();
            $link = $this->roleLinkService->getLinkById($id);
            if (!$link) {
                Response::error("Role link not found", 404);
                return;
            }
            Response::success($link, "Role link retrieved successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function getRoleLinksByRole($roleId) {
        try {
            $this->requireAuth();
            $status = $_GET['status'] ?? $_GET['SM_RL_STATUS'] ?? null;
            $links = $this->roleLinkService->getLinksByRoleId($roleId, $status);
            Response::success($links, "Role links for role '$roleId' retrieved successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function toggleRoleLinkStatus($id) {
        try {
            $user = $this->requireAuth();
            $userId = ($user && is_array($user)) ? ($user['userId'] ?? $user['id'] ?? 'usr_super') : 'usr_super';

            $result = $this->roleLinkService->toggleStatus($id, $userId);
            if ($result['success']) {
                Response::success($result['data'] ?? null, $result['message']);
            } else {
                Response::error($result['message'], 400);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function createRoleLink() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                $data = $_POST;
            }
            if (empty($data)) {
                Response::error("Empty request body", 400);
                return;
            }

            $user = $this->requireAuth();
            $userId = $user['userId'] ?? $user['id'] ?? null;

            $result = $this->roleLinkService->createLink($data, $userId);
            if ($result['success']) {
                Response::success($result['data'] ?? null, $result['message'], 201);
            } else {
                Response::error($result['message'], 400, $result['errors'] ?? null);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function updateRoleLink($id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                Response::error("Empty request body", 400);
                return;
            }

            $user = $this->requireAuth();
            $userId = $user['userId'] ?? $user['id'] ?? null;

            $result = $this->roleLinkService->updateLink($id, $data, $userId);
            if ($result['success']) {
                Response::success($result['data'] ?? null, $result['message']);
            } else {
                Response::error($result['message'], 400, $result['errors'] ?? null);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function deleteRoleLink($id) {
        try {
            $this->requireAuth();
            $result = $this->roleLinkService->deleteLink($id);
            if ($result['success']) {
                Response::success(null, $result['message']);
            } else {
                Response::error($result['message'], 400);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    // User CRUD
    public function getUsers() {
        try {
            $user = $this->requireAuth();
            $users = $this->userService->getAllUsers($user);
            Response::success($users, "Users retrieved successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function getUser($id) {
        try {
            $this->requireAuth();
            $user = $this->userService->getUserById($id);
            if (!$user) {
                Response::error("User not found", 404);
                return;
            }
            Response::success($user, "User retrieved successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function createUser() {
        try {
            $this->requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                Response::error("Empty request body", 400);
                return;
            }
            
            $result = $this->userService->createUser($data);
            if ($result['success']) {
                Response::success(null, $result['message'], 201);
            } else {
                Response::error($result['message'], 400, $result['errors'] ?? null);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function updateUser($id) {
        try {
            $this->requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                Response::error("Empty request body", 400);
                return;
            }
            
            $result = $this->userService->updateUser($id, $data);
            if ($result['success']) {
                Response::success(null, $result['message']);
            } else {
                Response::error($result['message'], 400, $result['errors'] ?? null);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function deleteUser($id) {
        try {
            $this->requireAuth();
            $result = $this->userService->deleteUser($id);
            if ($result['success']) {
                Response::success(null, $result['message']);
            } else {
                Response::error($result['message'], 400);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    // School CRUD
    public function getSchools() {
        try {
            $user = $this->requireAuth();
            $schools = $this->schoolService->getAllSchools($user);
            Response::success($schools, "Schools retrieved successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function getSchool($id) {
        try {
            $this->requireAuth();
            $school = $this->schoolService->getSchoolById($id);
            if (!$school) {
                Response::error("School not found", 404);
                return;
            }
            Response::success($school, "School retrieved successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function createSchool() {
        try {
            $user = $this->requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                Response::error("Empty request body", 400);
                return;
            }
            if (!empty($user['userId'])) {
                $data['schl_mn_createdby'] = $user['userId'];
            }
            
            $result = $this->schoolService->createSchool($data);
            if ($result['success']) {
                Response::success(null, $result['message'], 201);
            } else {
                Response::error($result['message'], 400, $result['errors'] ?? null);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function updateSchool($id) {
        try {
            $user = $this->requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                Response::error("Empty request body", 400);
                return;
            }
            if (!empty($user['userId'])) {
                $data['schl_mn_updatedby'] = $user['userId'];
            }
            
            $result = $this->schoolService->updateSchool($id, $data);
            if ($result['success']) {
                Response::success(null, $result['message']);
            } else {
                Response::error($result['message'], 400, $result['errors'] ?? null);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    public function deleteSchool($id) {
        try {
            $this->requireAuth();
            $result = $this->schoolService->deleteSchool($id);
            if ($result['success']) {
                Response::success(null, $result['message']);
            } else {
                Response::error($result['message'], 400);
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
}