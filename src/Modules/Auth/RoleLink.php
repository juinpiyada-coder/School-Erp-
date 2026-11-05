<?php

class RoleLink {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTableColumns();
    }

    private function ensureTableColumns() {
        try {
            $this->db->query("SELECT SM_RL_STATUS FROM SM_ROLE_LINKS LIMIT 1");
        } catch (Exception $e) {
            try {
                $this->db->exec("ALTER TABLE SM_ROLE_LINKS ADD COLUMN SM_RL_STATUS VARCHAR(20) DEFAULT 'ACTIVE'");
            } catch (Exception $ex) {}
        }

        // Backfill null/empty status to 'ACTIVE'
        try {
            $this->db->exec("UPDATE SM_ROLE_LINKS SET SM_RL_STATUS = 'ACTIVE' WHERE SM_RL_STATUS IS NULL OR SM_RL_STATUS = ''");
        } catch (Exception $ex) {}

        // Enforce the 4 requested modules for Student and Parent
        $this->syncStudentParentLinks();
    }

    public function syncStudentParentLinks() {
        try {
            // Check if links are already up to date
            $chk = $this->db->query("SELECT COUNT(*) FROM SM_ROLE_LINKS WHERE SM_RL_ROLE_ID = 'R_STUDENT' AND SM_RL_LINK_URL = '/student/routine'")->fetchColumn();
            if ((int)$chk > 0) {
                return;
            }

            // Remove legacy links
            $this->db->exec("DELETE FROM SM_ROLE_LINKS WHERE SM_RL_ROLE_ID IN ('R_STUDENT', 'R_PARENT', 'R_GUARDIAN')");

            // Student modules
            $studentLinks = [
                ['RL_STU_01', 'R_STUDENT', 'View Daily Routine', '/student/routine', 1, 'Student Modules', 'ACTIVE'],
                ['RL_STU_02', 'R_STUDENT', 'View Subject Wise Class Completion', '/student/class-completion', 2, 'Student Modules', 'ACTIVE'],
                ['RL_STU_03', 'R_STUDENT', 'View His Own Attendance Per Subject', '/student/attendance-report', 3, 'Student Modules', 'ACTIVE'],
                ['RL_STU_04', 'R_STUDENT', 'View Fees Due/Paid Report', '/student/fees-report', 4, 'Student Modules', 'ACTIVE']
            ];

            // Parent modules
            $parentLinks = [
                ['RL_PRNT_01', 'R_PARENT', 'View His Children Daily Routine', '/parent/routine', 1, 'Parent Modules', 'ACTIVE'],
                ['RL_PRNT_02', 'R_PARENT', 'View Subject Wise Class Completion', '/parent/class-completion', 2, 'Parent Modules', 'ACTIVE'],
                ['RL_PRNT_03', 'R_PARENT', 'View Attendance Per Subject', '/parent/attendance-report', 3, 'Parent Modules', 'ACTIVE'],
                ['RL_PRNT_04', 'R_PARENT', 'View Fees Due/Paid Report', '/parent/fees-report', 4, 'Parent Modules', 'ACTIVE'],

                ['RL_GRD_01', 'R_GUARDIAN', 'View His Children Daily Routine', '/parent/routine', 1, 'Parent Modules', 'ACTIVE'],
                ['RL_GRD_02', 'R_GUARDIAN', 'View Subject Wise Class Completion', '/parent/class-completion', 2, 'Parent Modules', 'ACTIVE'],
                ['RL_GRD_03', 'R_GUARDIAN', 'View Attendance Per Subject', '/parent/attendance-report', 3, 'Parent Modules', 'ACTIVE'],
                ['RL_GRD_04', 'R_GUARDIAN', 'View Fees Due/Paid Report', '/parent/fees-report', 4, 'Parent Modules', 'ACTIVE']
            ];

            $stmt = $this->db->prepare("
                INSERT INTO SM_ROLE_LINKS (SM_RL_ID, SM_RL_ROLE_ID, SM_RL_LINK_DESC, SM_RL_LINK_URL, SM_RL_LINK_SRL, SM_RL_SUBMENU, SM_RL_STATUS, SM_RL_CREATEDBY, SM_RL_CREATEDAT)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'usr_super', NOW())
            ");

            foreach (array_merge($studentLinks, $parentLinks) as $link) {
                $stmt->execute($link);
            }
        } catch (Exception $e) {}
    }

    public function getAll($roleId = null, $status = null) {
        $sql = "SELECT * FROM SM_ROLE_LINKS WHERE 1=1";
        $params = [];

        if (!empty($roleId)) {
            $sql .= " AND SM_RL_ROLE_ID = ?";
            $params[] = $roleId;
        }

        if (!empty($status)) {
            $sql .= " AND UPPER(SM_RL_STATUS) = ?";
            $params[] = strtoupper($status);
        }

        $sql .= " ORDER BY SM_RL_ROLE_ID ASC, SM_RL_LINK_SRL ASC, SM_RL_CREATEDAT ASC";

        if (empty($params)) {
            return $this->db->query($sql)->fetchAll();
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT * FROM SM_ROLE_LINKS WHERE SM_RL_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getByRoleId($roleId, $status = null) {
        $sql = "SELECT * FROM SM_ROLE_LINKS WHERE SM_RL_ROLE_ID = ?";
        $params = [$roleId];

        if (!empty($status)) {
            $sql .= " AND UPPER(SM_RL_STATUS) = ?";
            $params[] = strtoupper($status);
        }

        $sql .= " ORDER BY SM_RL_LINK_SRL ASC, SM_RL_CREATEDAT ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function create($data, $userId = null) {
        $id = $data['SM_RL_ID'] ?? $data['sm_rl_id'] ?? null;
        if (empty($id)) {
            $id = strtoupper(uniqid('RL_'));
        }

        $roleId = $data['SM_RL_ROLE_ID'] ?? $data['sm_rl_role_id'] ?? $data['role_id'] ?? null;
        $linkDesc = $data['SM_RL_LINK_DESC'] ?? $data['sm_rl_link_desc'] ?? $data['link_desc'] ?? null;
        $linkUrl = $data['SM_RL_LINK_URL'] ?? $data['sm_rl_link_url'] ?? $data['link_url'] ?? null;
        $linkSrl = isset($data['SM_RL_LINK_SRL']) ? (int)$data['SM_RL_LINK_SRL'] : (isset($data['sm_rl_link_srl']) ? (int)$data['sm_rl_link_srl'] : (isset($data['link_srl']) ? (int)$data['link_srl'] : 0));
        $submenu = $data['SM_RL_SUBMENU'] ?? $data['sm_rl_submenu'] ?? $data['submenu'] ?? null;
        
        $rawStatus = $data['SM_RL_STATUS'] ?? $data['sm_rl_status'] ?? $data['status'] ?? 'ACTIVE';
        $status = (strtoupper(trim((string)$rawStatus)) === 'INACTIVE' || (string)$rawStatus === '0') ? 'INACTIVE' : 'ACTIVE';

        $createdBy = $userId ?? $data['SM_RL_CREATEDBY'] ?? $data['sm_rl_createdby'] ?? null;
        $createdAt = date('Y-m-d H:i:s');

        $stmt = $this->db->prepare("
            INSERT INTO SM_ROLE_LINKS (
                SM_RL_ID, SM_RL_ROLE_ID, SM_RL_LINK_DESC, SM_RL_LINK_URL,
                SM_RL_LINK_SRL, SM_RL_SUBMENU, SM_RL_STATUS, SM_RL_CREATEDBY, SM_RL_CREATEDAT,
                SM_RL_UPDATEDBY, SM_RL_UPDATEDAT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $id,
            $roleId,
            $linkDesc,
            $linkUrl,
            $linkSrl,
            $submenu,
            $status,
            $createdBy,
            $createdAt,
            $createdBy,
            $createdAt
        ]);

        return $id;
    }

    public function update($id, $data, $userId = null) {
        $existing = $this->getById($id);
        if (!$existing) {
            return false;
        }

        $roleId = $data['SM_RL_ROLE_ID'] ?? $data['sm_rl_role_id'] ?? $data['role_id'] ?? $existing['SM_RL_ROLE_ID'] ?? $existing['sm_rl_role_id'];
        $linkDesc = $data['SM_RL_LINK_DESC'] ?? $data['sm_rl_link_desc'] ?? $data['link_desc'] ?? $existing['SM_RL_LINK_DESC'] ?? $existing['sm_rl_link_desc'];
        $linkUrl = $data['SM_RL_LINK_URL'] ?? $data['sm_rl_link_url'] ?? $data['link_url'] ?? $existing['SM_RL_LINK_URL'] ?? $existing['sm_rl_link_url'];
        
        $linkSrl = isset($data['SM_RL_LINK_SRL']) 
            ? (int)$data['SM_RL_LINK_SRL'] 
            : (isset($data['sm_rl_link_srl']) 
                ? (int)$data['sm_rl_link_srl'] 
                : (isset($data['link_srl']) 
                    ? (int)$data['link_srl'] 
                    : ($existing['SM_RL_LINK_SRL'] ?? $existing['sm_rl_link_srl'] ?? 0)));
                    
        $submenu = array_key_exists('SM_RL_SUBMENU', $data) 
            ? $data['SM_RL_SUBMENU'] 
            : (array_key_exists('sm_rl_submenu', $data) 
                ? $data['sm_rl_submenu'] 
                : (array_key_exists('submenu', $data) 
                    ? $data['submenu'] 
                    : ($existing['SM_RL_SUBMENU'] ?? $existing['sm_rl_submenu'] ?? null)));

        $rawStatus = array_key_exists('SM_RL_STATUS', $data) 
            ? $data['SM_RL_STATUS'] 
            : (array_key_exists('sm_rl_status', $data) 
                ? $data['sm_rl_status'] 
                : (array_key_exists('status', $data) 
                    ? $data['status'] 
                    : ($existing['SM_RL_STATUS'] ?? $existing['sm_rl_status'] ?? 'ACTIVE')));
        $status = (strtoupper(trim((string)$rawStatus)) === 'INACTIVE' || (string)$rawStatus === '0') ? 'INACTIVE' : 'ACTIVE';

        $updatedBy = $userId ?? $data['SM_RL_UPDATEDBY'] ?? $data['sm_rl_updatedby'] ?? null;
        $updatedAt = date('Y-m-d H:i:s');

        $stmt = $this->db->prepare("
            UPDATE SM_ROLE_LINKS SET 
                SM_RL_ROLE_ID = ?,
                SM_RL_LINK_DESC = ?,
                SM_RL_LINK_URL = ?,
                SM_RL_LINK_SRL = ?,
                SM_RL_SUBMENU = ?,
                SM_RL_STATUS = ?,
                SM_RL_UPDATEDBY = ?,
                SM_RL_UPDATEDAT = ?
            WHERE SM_RL_ID = ?
        ");

        return $stmt->execute([
            $roleId,
            $linkDesc,
            $linkUrl,
            $linkSrl,
            $submenu,
            $status,
            $updatedBy,
            $updatedAt,
            $id
        ]);
    }

    public function toggleStatus($id, $userId = null) {
        $existing = $this->getById($id);
        if (!$existing) {
            return false;
        }

        $currentStatus = strtoupper(trim((string)($existing['SM_RL_STATUS'] ?? $existing['sm_rl_status'] ?? 'ACTIVE')));
        $newStatus = ($currentStatus === 'ACTIVE' || $currentStatus === '1') ? 'INACTIVE' : 'ACTIVE';

        $updatedBy = $userId ?? 'usr_super';
        $updatedAt = date('Y-m-d H:i:s');

        $stmt = $this->db->prepare("
            UPDATE SM_ROLE_LINKS SET 
                SM_RL_STATUS = ?,
                SM_RL_UPDATEDBY = ?,
                SM_RL_UPDATEDAT = ?
            WHERE SM_RL_ID = ?
        ");

        $stmt->execute([$newStatus, $updatedBy, $updatedAt, $id]);
        return $newStatus;
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM SM_ROLE_LINKS WHERE SM_RL_ID = ?");
        return $stmt->execute([$id]);
    }
}
