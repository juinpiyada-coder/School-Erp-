<?php

class Role {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll() {
        $stmt = $this->db->query("SELECT 
            MAS_ROLE_ID, 
            MAS_ROLE_DESC, 
            MAS_ROLE_LINK,
            MAS_ROLE_ID AS mas_role_id,
            MAS_ROLE_DESC AS mas_role_desc,
            MAS_ROLE_LINK AS mas_role_link,
            MAS_ROLE_ID AS MAS_role_id,
            MAS_ROLE_DESC AS MAS_role_DESC,
            MAS_ROLE_LINK AS MAS_role_link
        FROM SM_MAS_ROLE ORDER BY MAS_ROLE_DESC ASC");
        return $stmt->fetchAll();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT 
            MAS_ROLE_ID, 
            MAS_ROLE_DESC, 
            MAS_ROLE_LINK,
            MAS_ROLE_ID AS mas_role_id,
            MAS_ROLE_DESC AS mas_role_desc,
            MAS_ROLE_LINK AS mas_role_link,
            MAS_ROLE_ID AS MAS_role_id,
            MAS_ROLE_DESC AS MAS_role_DESC,
            MAS_ROLE_LINK AS MAS_role_link
        FROM SM_MAS_ROLE WHERE UPPER(TRIM(MAS_ROLE_ID)) = UPPER(TRIM(?))");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function validateRoles($roleString) {
        if (empty($roleString)) {
            return false;
        }
        $roles = array_filter(array_map('trim', explode(',', $roleString)));
        if (empty($roles)) {
            return false;
        }
        foreach ($roles as $r) {
            if (!$this->getById($r)) {
                return false;
            }
        }
        return true;
    }

    public function create($data) {
        $stmt = $this->db->prepare("INSERT INTO SM_MAS_ROLE (MAS_ROLE_ID, MAS_ROLE_DESC, MAS_ROLE_LINK) VALUES (?, ?, ?)");
        
        $id = $data['MAS_ROLE_ID'] ?? $data['MAS_role_id'] ?? $data['mas_role_id'] ?? null;
        $desc = $data['MAS_ROLE_DESC'] ?? $data['MAS_role_DESC'] ?? $data['mas_role_desc'] ?? null;
        $link = $data['MAS_ROLE_LINK'] ?? $data['MAS_role_link'] ?? $data['mas_role_link'] ?? '/';
        
        return $stmt->execute([$id, $desc, $link]);
    }

    public function update($id, $data) {
        $stmt = $this->db->prepare("UPDATE SM_MAS_ROLE SET MAS_ROLE_DESC = ?, MAS_ROLE_LINK = ? WHERE MAS_ROLE_ID = ?");
        
        $desc = $data['MAS_ROLE_DESC'] ?? $data['MAS_role_DESC'] ?? $data['mas_role_desc'] ?? null;
        $link = $data['MAS_ROLE_LINK'] ?? $data['MAS_role_link'] ?? $data['mas_role_link'] ?? '/';
        
        return $stmt->execute([$desc, $link, $id]);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM SM_MAS_ROLE WHERE MAS_ROLE_ID = ?");
        return $stmt->execute([$id]);
    }
}
