<?php

class SubjectModel {
    private $db;
    private $tableName = 'SCHL_BR_CLS_SUBJECT';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureColumns();
    }

    private function ensureColumns() {
        try {
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_CLS_SUBJECT_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_cls_subject_ibfk_1"); } catch (Exception $e) {}

            $this->db->exec("ALTER TABLE {$this->tableName} 
                ADD COLUMN IF NOT EXISTS BR_CLS_SUB_LANG VARCHAR(50) DEFAULT 'English'");
        } catch (Exception $e) {}
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "SELECT s.*, 
                       c.SCHL_BR_CLASS_NM as class_name, 
                       c.SCHL_BR_CENT_ID as branch_id, 
                       b.SCHL_BR_NM as branch_name 
                FROM {$this->tableName} s
                LEFT JOIN SCHL_BR_CLASS c ON s.BR_CLS_ID = c.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
                WHERE 1=1";

        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND b.SCHL_BR_ID = ?";
                $params[] = $userId;
            }
        }

        $sql .= " ORDER BY s.BR_CLS_SUB_NAME ASC";

        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(*) FROM {$this->tableName} s
                LEFT JOIN SCHL_BR_CLASS c ON s.BR_CLS_ID = c.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
                WHERE 1=1";

        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND b.SCHL_BR_ID = ?";
                $params[] = $userId;
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT s.*, 
                       c.SCHL_BR_CLASS_NM as class_name, 
                       c.SCHL_BR_CENT_ID as branch_id, 
                       b.SCHL_BR_NM as branch_name 
                FROM {$this->tableName} s
                LEFT JOIN SCHL_BR_CLASS c ON s.BR_CLS_ID = c.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
                WHERE s.BR_CLS_SUB_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function getByClassId($classId) {
        $stmt = $this->db->prepare("SELECT s.*, 
                       c.SCHL_BR_CLASS_NM as class_name, 
                       c.SCHL_BR_CENT_ID as branch_id, 
                       b.SCHL_BR_NM as branch_name 
                FROM {$this->tableName} s
                LEFT JOIN SCHL_BR_CLASS c ON s.BR_CLS_ID = c.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
                WHERE s.BR_CLS_ID = ?");
        $stmt->execute([$classId]);
        return $stmt->fetchAll();
    }

    public function create($data) {
        $fields = ['BR_CLS_SUB_ID', 'BR_CLS_ID', 'BR_CLS_SUB_NAME', 'BR_CLS_SUB_LANG', 'BR_CLS_SUB_DESC'];
        $insertData = [];
        foreach ($fields as $field) {
            $insertData[$field] = isset($data[$field]) ? $data[$field] : null;
        }
        if (empty($insertData['BR_CLS_SUB_LANG'])) $insertData['BR_CLS_SUB_LANG'] = 'English';

        $sql = "INSERT INTO {$this->tableName} (BR_CLS_SUB_ID, BR_CLS_ID, BR_CLS_SUB_NAME, BR_CLS_SUB_LANG, BR_CLS_SUB_DESC)
                VALUES (:BR_CLS_SUB_ID, :BR_CLS_ID, :BR_CLS_SUB_NAME, :BR_CLS_SUB_LANG, :BR_CLS_SUB_DESC)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($insertData);
        return $insertData['BR_CLS_SUB_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $updatableFields = ['BR_CLS_ID', 'BR_CLS_SUB_NAME', 'BR_CLS_SUB_LANG', 'BR_CLS_SUB_DESC'];
        foreach ($updatableFields as $field) {
            if (array_key_exists($field, $data)) {
                $fieldsToUpdate[] = "{$field} = :{$field}";
                $params[$field] = $data[$field];
            }
        }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        $params['id'] = $id;
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE BR_CLS_SUB_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE BR_CLS_SUB_ID = ?");
        return $stmt->execute([$id]);
    }
}
