<?php

class MatrixModel {
    private $db;
    private $tableName = 'SCHL_BRCH_MATRIX';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTable();
    }

    private function ensureTable() {
        try {
            $this->db->exec("CREATE TABLE IF NOT EXISTS {$this->tableName} (
                SCHL_MAT_ID VARCHAR(100) PRIMARY KEY,
                SCHL_MAT_SCHOOL_ID VARCHAR(100) NULL,
                SCHL_MAT_BRANCH_ID VARCHAR(100) NULL,
                SCHL_UNIQ_MATRIX_NM VARCHAR(100) NOT NULL,
                SCHL_MAT_NM VARCHAR(100),
                SCHL_NO_OF_CLASS INT NOT NULL,
                SCHL_CLASS_DURATION INT NOT NULL,
                SCHL_CLASS_FRM VARCHAR(100),
                SCHL_CLASS_TO VARCHAR(100),
                SCHL_WEEKOFDAY VARCHAR(100)
            )");
            // MySQL 5.7 (XAMPP) does NOT support "ADD COLUMN IF NOT EXISTS".
            // Detect existing columns via INFORMATION_SCHEMA and only add missing ones.
            $this->ensureColumn('SCHL_MAT_SCHOOL_ID', 'VARCHAR(100) NULL');
            $this->ensureColumn('SCHL_MAT_BRANCH_ID', 'VARCHAR(100) NULL');
            // Modify time columns to VARCHAR(100) so time strings like '08:00' don't trigger MySQL 1292 Invalid datetime format errors
            try { $this->db->exec("ALTER TABLE {$this->tableName} MODIFY COLUMN SCHL_CLASS_FRM VARCHAR(100) NULL, MODIFY COLUMN SCHL_CLASS_TO VARCHAR(100) NULL"); } catch (Exception $ex) {}
            $this->dropUniqueIndexOnMatrixName();
        } catch (Exception $e) {}
    }

    /**
     * The same Unique Matrix Name (e.g. "Daily Class") must be reusable with a
     * different Matrix Type (e.g. "Exam / Assessment"), so no UNIQUE index may
     * exist on SCHL_UNIQ_MATRIX_NM. Drop any that an older DB may still have.
     */
    private function dropUniqueIndexOnMatrixName() {
        try {
            $stmt = $this->db->prepare(
                "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
                   AND COLUMN_NAME = 'SCHL_UNIQ_MATRIX_NM' AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'"
            );
            $stmt->execute([$this->tableName]);
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $idx) {
                try { $this->db->exec("ALTER TABLE {$this->tableName} DROP INDEX `" . str_replace('`', '', $idx) . "`"); } catch (Exception $e) {}
            }
        } catch (Exception $e) {}
    }

    private function ensureColumn($column, $definition) {
        try {
            $stmt = $this->db->prepare(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
            );
            $stmt->execute([$this->tableName, $column]);
            if ((int)$stmt->fetchColumn() === 0) {
                $this->db->exec("ALTER TABLE {$this->tableName} ADD COLUMN {$column} {$definition}");
            }
        } catch (Exception $ex) {}
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "SELECT m.*, b.SCHL_BR_NM as branch_name, s.schl_mn_nm as school_name 
                FROM {$this->tableName} m 
                LEFT JOIN SCHL_BRANCH b ON m.SCHL_MAT_BRANCH_ID = b.SCHL_BR_ID 
                LEFT JOIN MSTR_SCHOOL_MAIN s ON (m.SCHL_MAT_SCHOOL_ID = s.schl_mn_id OR b.SCHL_BR_CENTER_ID = s.schl_mn_id)
                WHERE 1=1";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND (m.SCHL_MAT_SCHOOL_ID = ? OR b.SCHL_BR_CENTER_ID = ?)";
                $params[] = $userId;
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL' || $roleId === 'R_TEACHER') {
                $sql .= " AND (m.SCHL_MAT_BRANCH_ID = ? OR (m.SCHL_MAT_BRANCH_ID IS NULL AND (m.SCHL_MAT_SCHOOL_ID = (SELECT SCHL_BR_CENTER_ID FROM SCHL_BRANCH WHERE SCHL_BR_ID = ? LIMIT 1))))";
                $params[] = $userId;
                $params[] = $userId;
            }
        }
        $sql .= " ORDER BY m.SCHL_UNIQ_MATRIX_NM ASC, m.SCHL_MAT_ID ASC";
        if ($limit !== null && $offset !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(*) FROM {$this->tableName} m 
                LEFT JOIN SCHL_BRANCH b ON m.SCHL_MAT_BRANCH_ID = b.SCHL_BR_ID 
                WHERE 1=1";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND (m.SCHL_MAT_SCHOOL_ID = ? OR b.SCHL_BR_CENTER_ID = ?)";
                $params[] = $userId;
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL' || $roleId === 'R_TEACHER') {
                $sql .= " AND (m.SCHL_MAT_BRANCH_ID = ? OR (m.SCHL_MAT_BRANCH_ID IS NULL AND (m.SCHL_MAT_SCHOOL_ID = (SELECT SCHL_BR_CENTER_ID FROM SCHL_BRANCH WHERE SCHL_BR_ID = ? LIMIT 1))))";
                $params[] = $userId;
                $params[] = $userId;
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT * FROM {$this->tableName} WHERE SCHL_MAT_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function create($data) {
        $fields = [
            'SCHL_MAT_ID',
            'SCHL_MAT_SCHOOL_ID',
            'SCHL_MAT_BRANCH_ID',
            'SCHL_UNIQ_MATRIX_NM',
            'SCHL_MAT_NM',
            'SCHL_NO_OF_CLASS',
            'SCHL_CLASS_DURATION',
            'SCHL_CLASS_FRM',
            'SCHL_CLASS_TO',
            'SCHL_WEEKOFDAY'
        ];
        $insertData = [];
        foreach ($fields as $field) {
            $val = isset($data[$field]) ? $data[$field] : null;
            if (($field === 'SCHL_CLASS_FRM' || $field === 'SCHL_CLASS_TO') && !empty($val)) {
                // Stored as entered; ordering (start < end) is validated in the controller.
                $val = trim($val);
            }
            $insertData[$field] = $val;
        }

        try {
            $this->db->exec("ALTER TABLE {$this->tableName} MODIFY COLUMN SCHL_CLASS_FRM VARCHAR(100) NULL, MODIFY COLUMN SCHL_CLASS_TO VARCHAR(100) NULL");
        } catch (Exception $e) {}

        $sql = "INSERT INTO {$this->tableName} (
                    SCHL_MAT_ID,
                    SCHL_MAT_SCHOOL_ID,
                    SCHL_MAT_BRANCH_ID,
                    SCHL_UNIQ_MATRIX_NM,
                    SCHL_MAT_NM,
                    SCHL_NO_OF_CLASS,
                    SCHL_CLASS_DURATION,
                    SCHL_CLASS_FRM,
                    SCHL_CLASS_TO,
                    SCHL_WEEKOFDAY
                ) VALUES (
                    :SCHL_MAT_ID,
                    :SCHL_MAT_SCHOOL_ID,
                    :SCHL_MAT_BRANCH_ID,
                    :SCHL_UNIQ_MATRIX_NM,
                    :SCHL_MAT_NM,
                    :SCHL_NO_OF_CLASS,
                    :SCHL_CLASS_DURATION,
                    :SCHL_CLASS_FRM,
                    :SCHL_CLASS_TO,
                    :SCHL_WEEKOFDAY
                )";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($insertData);
        return $insertData['SCHL_MAT_ID'];
    }

    public function update($id, $data) {
        try {
            $this->db->exec("ALTER TABLE {$this->tableName} MODIFY COLUMN SCHL_CLASS_FRM VARCHAR(100) NULL, MODIFY COLUMN SCHL_CLASS_TO VARCHAR(100) NULL");
        } catch (Exception $e) {}

        $fieldsToUpdate = [];
        $params = [];

        $updatableFields = [
            'SCHL_MAT_SCHOOL_ID',
            'SCHL_MAT_BRANCH_ID',
            'SCHL_UNIQ_MATRIX_NM',
            'SCHL_MAT_NM',
            'SCHL_NO_OF_CLASS',
            'SCHL_CLASS_DURATION',
            'SCHL_CLASS_FRM',
            'SCHL_CLASS_TO',
            'SCHL_WEEKOFDAY'
        ];

        foreach ($updatableFields as $field) {
            if (array_key_exists($field, $data)) {
                $val = $data[$field];
                if (($field === 'SCHL_CLASS_FRM' || $field === 'SCHL_CLASS_TO') && !empty($val)) {
                    $val = trim($val);
                }
                $fieldsToUpdate[] = "{$field} = :{$field}";
                $params[$field] = $val;
            }
        }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        $params['id'] = $id;
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE SCHL_MAT_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE SCHL_MAT_ID = ?");
        return $stmt->execute([$id]);
    }
}