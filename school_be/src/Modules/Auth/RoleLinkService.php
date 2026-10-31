<?php

class RoleLinkService {
    private $roleLinkModel;
    private $roleModel;

    public function __construct() {
        $this->roleLinkModel = new RoleLink();
        $this->roleModel = new Role();
    }

    public function getAllLinks($roleId = null, $status = null) {
        return $this->roleLinkModel->getAll($roleId, $status);
    }

    public function getLinkById($id) {
        return $this->roleLinkModel->getById($id);
    }

    public function getLinksByRoleId($roleId, $status = null) {
        return $this->roleLinkModel->getByRoleId($roleId, $status);
    }

    public function createLink($data, $userId = null) {
        $errors = [];

        $roleId = $data['SM_RL_ROLE_ID'] ?? $data['sm_rl_role_id'] ?? $data['role_id'] ?? null;
        $linkDesc = $data['SM_RL_LINK_DESC'] ?? $data['sm_rl_link_desc'] ?? $data['link_desc'] ?? null;
        $linkUrl = $data['SM_RL_LINK_URL'] ?? $data['sm_rl_link_url'] ?? $data['link_url'] ?? null;

        if (empty($roleId)) {
            $errors['SM_RL_ROLE_ID'] = 'Role ID is required';
        } else {
            // Verify role exists in SM_MAS_ROLE
            $role = $this->roleModel->getById($roleId);
            if (!$role) {
                $errors['SM_RL_ROLE_ID'] = 'Referenced Role does not exist';
            }
        }

        if (empty($linkDesc)) {
            $errors['SM_RL_LINK_DESC'] = 'Link description is required';
        }

        if (empty($linkUrl)) {
            $errors['SM_RL_LINK_URL'] = 'Link URL is required';
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed', 'errors' => $errors];
        }

        try {
            $createdId = $this->roleLinkModel->create($data, $userId);
            return [
                'success' => true,
                'message' => 'Role link created successfully',
                'data' => $this->roleLinkModel->getById($createdId)
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function updateLink($id, $data, $userId = null) {
        $existing = $this->roleLinkModel->getById($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Role link not found'];
        }

        $roleId = $data['SM_RL_ROLE_ID'] ?? $data['sm_rl_role_id'] ?? $data['role_id'] ?? null;
        if (!empty($roleId)) {
            $role = $this->roleModel->getById($roleId);
            if (!$role) {
                return ['success' => false, 'message' => 'Referenced Role does not exist'];
            }
        }

        try {
            $this->roleLinkModel->update($id, $data, $userId);
            return [
                'success' => true,
                'message' => 'Role link updated successfully',
                'data' => $this->roleLinkModel->getById($id)
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function toggleStatus($id, $userId = null) {
        $existing = $this->roleLinkModel->getById($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Role link not found'];
        }

        try {
            $newStatus = $this->roleLinkModel->toggleStatus($id, $userId);
            return [
                'success' => true,
                'message' => "Role link status changed to $newStatus",
                'data' => $this->roleLinkModel->getById($id)
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function deleteLink($id) {
        $existing = $this->roleLinkModel->getById($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Role link not found'];
        }

        try {
            $this->roleLinkModel->delete($id);
            return ['success' => true, 'message' => 'Role link deleted successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }
}
