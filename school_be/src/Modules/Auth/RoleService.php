<?php

class RoleService {
    private $roleModel;

    public function __construct() {
        $this->roleModel = new Role();
    }

    public function getAllRoles() {
        return $this->roleModel->getAll();
    }

    public function getRoleById($id) {
        return $this->roleModel->getById($id);
    }

    public function createRole($data) {
        $errors = [];
        if (empty($data['MAS_role_id'])) {
            $data['MAS_role_id'] = strtoupper(uniqid('ROLE_'));
        } else {
            $roleId = trim($data['MAS_role_id']);
            if (ctype_digit($roleId) || preg_match('/^\d+$/', $roleId)) {
                $errors['MAS_role_id'] = 'Role ID cannot be numbers only. It must contain letters.';
            } elseif (!preg_match('/[a-zA-Z]/', $roleId)) {
                $errors['MAS_role_id'] = 'Role ID must contain at least one letter.';
            }
        }

        if (empty($data['MAS_role_DESC'])) {
            $errors['MAS_role_DESC'] = 'Role Description is required';
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed', 'errors' => $errors];
        }

        if ($this->roleModel->getById($data['MAS_role_id'])) {
            return ['success' => false, 'message' => 'Role with this ID already exists'];
        }

        try {
            $this->roleModel->create($data);
            return ['success' => true, 'message' => 'Role created successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function updateRole($id, $data) {
        if (!$this->roleModel->getById($id)) {
            return ['success' => false, 'message' => 'Role not found'];
        }

        try {
            $this->roleModel->update($id, $data);
            return ['success' => true, 'message' => 'Role updated successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function deleteRole($id) {
        if (strtoupper(trim($id)) === 'R_SUPERADMIN') {
            return ['success' => false, 'message' => 'The Super Admin role is protected and cannot be deleted.'];
        }

        if (!$this->roleModel->getById($id)) {
            return ['success' => false, 'message' => 'Role not found'];
        }

        // Check if role is in use
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("SELECT COUNT(*) FROM SM_USER_LOGIN WHERE user_role = ?");
            $stmt->execute([$id]);
            if ($stmt->fetchColumn() > 0) {
                return ['success' => false, 'message' => 'Cannot delete role because it is assigned to users.'];
            }
        } catch (PDOException $e) {
            // Ignore error or log it and continue
        }

        try {
            $this->roleModel->delete($id);
            return ['success' => true, 'message' => 'Role deleted successfully'];
        } catch (PDOException $e) {
            if ($e->getCode() == '23000' || strpos($e->getMessage(), 'a foreign key constraint fails') !== false) {
                return ['success' => false, 'message' => 'Cannot delete role because it is assigned to users.'];
            }
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }
}
