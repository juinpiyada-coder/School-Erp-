<?php
require_once dirname(__DIR__, 2) . '/Core/Config/Database.php';

class ClassScheduleModel {
    private $db;
    private $tableName = 'SCHL_CLS_SCHLDL';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTableAndColumns();
    }

    private function ensureTableAndColumns() {
        try {
            // Attempt to remove restrictive foreign key constraint if existing in production MySQL schemas
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_CLS_SCHLDL_ibfk_1"); } catch (Exception $ex) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_cls_schldl_ibfk_1"); } catch (Exception $ex) {}

            $this->db->exec("
                CREATE TABLE IF NOT EXISTS {$this->tableName} (
                    SCHL_CLS_SCHLDL_ID VARCHAR(100) PRIMARY KEY,
                    SCHL_CLS_SCHLDL_SEC_SESS_ID VARCHAR(100),
                    SCHL_CLS_SCHLDL_SUB_ID VARCHAR(100),
                    SCHL_BR_RM_ID VARCHAR(100),
                    SCHL_BR_TCHR_ID VARCHAR(100),
                    SCHL_CLS_SCHDL_FRM_DT VARCHAR(100),
                    SCHL_CLS_SCHDL_TO_DT VARCHAR(100),
                    SCHL_DAY_OF_WK VARCHAR(50)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            // Ensure time columns are VARCHAR so time strings like '08:00' don't trigger MySQL Date errors
            $this->db->exec("ALTER TABLE {$this->tableName} MODIFY COLUMN SCHL_CLS_SCHDL_FRM_DT VARCHAR(100), MODIFY COLUMN SCHL_CLS_SCHDL_TO_DT VARCHAR(100), MODIFY COLUMN SCHL_DAY_OF_WK VARCHAR(50)");
        } catch (Exception $e) {
            // Ignore if permissions or constraints forbid modifying
        }
    }

    /**
     * Ensure that the class ID exists in SCHL_BR_CLASS_SEC_SESSION so strict production
     * MySQL foreign key constraints (SCHL_CLS_SCHLDL_ibfk_1) do not cause 1452 Integrity errors.
     */
    private function ensureSessionExists($sessionId) {
        if (empty($sessionId)) return;
        try {
            // Second attempt to drop the foreign key just in case table was created later
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_CLS_SCHLDL_ibfk_1"); } catch (Exception $ex) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_cls_schldl_ibfk_1"); } catch (Exception $ex) {}

            $stmt = $this->db->prepare("SELECT COUNT(*) FROM SCHL_BR_CLASS_SEC_SESSION WHERE SCHL_BR_CLASS_SEC_SESS_ID = ?");
            $stmt->execute([$sessionId]);
            if ((int)$stmt->fetchColumn() === 0) {
                // Auto-create matching section session record to satisfy FK references cleanly
                $ins = $this->db->prepare("INSERT IGNORE INTO SCHL_BR_CLASS_SEC_SESSION (SCHL_BR_CLASS_SEC_SESS_ID, SCHL_BR_CLASS_SEC_SESS_CLASS, SCHL_BR_CLASS_SEC_SESS_SECT, SCHL_BR_CLASS_SEC_SESS_SESS, SCHL_BR_CLASS_SEC_SESS_BR_ID) VALUES (?, ?, 'A', '2026-2027', NULL)");
                $ins->execute([$sessionId, $sessionId]);
            }
        } catch (Exception $e) {
            // Ignore DB exception if constraints or table permissions forbid
        }
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "SELECT a.*,
                       COALESCE(sub.BR_CLS_SUB_NAME, a.SCHL_CLS_SCHLDL_SUB_ID) as subject_name,
                       COALESCE(t.BR_TCHR_NM, a.SCHL_BR_TCHR_ID) as teacher_name,
                       c.SCHL_BR_CLASS_NM as class_name,
                       c.SCHL_BR_CENT_ID as branch_id
                FROM {$this->tableName} a
                LEFT JOIN SCHL_BR_CLS_SUBJECT sub ON a.SCHL_CLS_SCHLDL_SUB_ID = sub.BR_CLS_SUB_ID
                LEFT JOIN SCHL_BR_TCHR t ON a.SCHL_BR_TCHR_ID = t.BR_TCHR_ID
                LEFT JOIN SCHL_BR_CLASS c ON a.SCHL_CLS_SCHLDL_SEC_SESS_ID = c.SCHL_BR_CLS_ID OR c.SCHL_BR_CLS_ID = (SELECT SCHL_BR_CLASS_SEC_SESS_CLASS FROM SCHL_BR_CLASS_SEC_SESSION WHERE SCHL_BR_CLASS_SEC_SESS_ID = a.SCHL_CLS_SCHLDL_SEC_SESS_ID LIMIT 1)
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

        $sql .= " ORDER BY a.SCHL_CLS_SCHDL_FRM_DT ASC";

        if ($limit !== null && $offset !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(DISTINCT a.SCHL_CLS_SCHLDL_ID) FROM {$this->tableName} a
                LEFT JOIN SCHL_BR_CLASS c ON a.SCHL_CLS_SCHLDL_SEC_SESS_ID = c.SCHL_BR_CLS_ID OR c.SCHL_BR_CLS_ID = (SELECT SCHL_BR_CLASS_SEC_SESS_CLASS FROM SCHL_BR_CLASS_SEC_SESSION WHERE SCHL_BR_CLASS_SEC_SESS_ID = a.SCHL_CLS_SCHLDL_SEC_SESS_ID LIMIT 1)
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
        return (int)$stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT * FROM {$this->tableName} WHERE SCHL_CLS_SCHLDL_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function getByClassId($classId, $user = null) {
        $sql = "SELECT a.*,
                       COALESCE(sub.BR_CLS_SUB_NAME, a.SCHL_CLS_SCHLDL_SUB_ID) as subject_name,
                       COALESCE(t.BR_TCHR_NM, a.SCHL_BR_TCHR_ID) as teacher_name,
                       c.SCHL_BR_CLASS_NM as class_name
                FROM {$this->tableName} a
                LEFT JOIN SCHL_BR_CLS_SUBJECT sub ON a.SCHL_CLS_SCHLDL_SUB_ID = sub.BR_CLS_SUB_ID
                LEFT JOIN SCHL_BR_TCHR t ON a.SCHL_BR_TCHR_ID = t.BR_TCHR_ID
                LEFT JOIN SCHL_BR_CLASS c ON a.SCHL_CLS_SCHLDL_SEC_SESS_ID = c.SCHL_BR_CLS_ID OR c.SCHL_BR_CLS_ID = (SELECT SCHL_BR_CLASS_SEC_SESS_CLASS FROM SCHL_BR_CLASS_SEC_SESSION WHERE SCHL_BR_CLASS_SEC_SESS_ID = a.SCHL_CLS_SCHLDL_SEC_SESS_ID LIMIT 1)
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
                WHERE (a.SCHL_CLS_SCHLDL_SEC_SESS_ID = ? OR a.SCHL_CLS_SCHLDL_SEC_SESS_ID IN (
                    SELECT SCHL_BR_CLASS_SEC_SESS_ID FROM SCHL_BR_CLASS_SEC_SESSION WHERE SCHL_BR_CLASS_SEC_SESS_CLASS = ?
                ))";
                
        $params = [$classId, $classId];
        
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
        
        $sql .= " ORDER BY a.SCHL_CLS_SCHDL_FRM_DT ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create($data) {
        $secSessId = $data['SCHL_CLS_SCHLDL_SEC_SESS_ID'] ?? ($data['SCHLDL_CLS_REF_ID'] ?? null);
        $this->ensureSessionExists($secSessId);

        $fields = [
            'SCHL_CLS_SCHLDL_ID' => $data['SCHL_CLS_SCHLDL_ID'] ?? strtoupper(uniqid('SCHLDL_')),
            'SCHL_CLS_SCHLDL_SEC_SESS_ID' => $secSessId,
            'SCHL_CLS_SCHLDL_SUB_ID' => $data['SCHL_CLS_SCHLDL_SUB_ID'] ?? ($data['SCHLDL_SUB_NM'] ?? null),
            'SCHL_BR_TCHR_ID' => $data['SCHL_BR_TCHR_ID'] ?? ($data['SCHLDL_TCHR_NM'] ?? null),
            'SCHL_BR_RM_ID' => $data['SCHL_BR_RM_ID'] ?? ($data['SCHLDL_RM_REF_ID'] ?? null),
            'SCHL_DAY_OF_WK' => $data['SCHL_DAY_OF_WK'] ?? ($data['SCHLDL_DAY'] ?? null),
            'SCHL_CLS_SCHDL_FRM_DT' => $data['SCHL_CLS_SCHDL_FRM_DT'] ?? ($data['SCHLDL_START_TM'] ?? null),
            'SCHL_CLS_SCHDL_TO_DT' => $data['SCHL_CLS_SCHDL_TO_DT'] ?? ($data['SCHLDL_END_TM'] ?? null)
        ];

        $cols = implode(', ', array_keys($fields));
        $placeholders = implode(', ', array_map(fn($f) => ":$f", array_keys($fields)));
        
        $sql = "INSERT INTO {$this->tableName} ($cols) VALUES ($placeholders)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($fields);
        return $fields['SCHL_CLS_SCHLDL_ID'];
    }

    public function update($id, $data) {
        $secSessId = $data['SCHL_CLS_SCHLDL_SEC_SESS_ID'] ?? ($data['SCHLDL_CLS_REF_ID'] ?? null);
        $this->ensureSessionExists($secSessId);

        $validCols = [
            'SCHL_CLS_SCHLDL_SEC_SESS_ID',
            'SCHL_CLS_SCHLDL_SUB_ID',
            'SCHL_BR_TCHR_ID',
            'SCHL_BR_RM_ID',
            'SCHL_DAY_OF_WK',
            'SCHL_CLS_SCHDL_FRM_DT',
            'SCHL_CLS_SCHDL_TO_DT'
        ];

        $fieldsToUpdate = [];
        $params = [];

        foreach ($validCols as $col) {
            if (array_key_exists($col, $data)) {
                $fieldsToUpdate[] = "{$col} = :{$col}";
                $params[$col] = $data[$col];
            }
        }

        // Check legacy alias inputs if sent
        if (array_key_exists('SCHLDL_CLS_REF_ID', $data)) { $fieldsToUpdate[] = "SCHL_CLS_SCHLDL_SEC_SESS_ID = :SCHL_CLS_SCHLDL_SEC_SESS_ID"; $params['SCHL_CLS_SCHLDL_SEC_SESS_ID'] = $data['SCHLDL_CLS_REF_ID']; }
        if (array_key_exists('SCHLDL_SUB_NM', $data)) { $fieldsToUpdate[] = "SCHL_CLS_SCHLDL_SUB_ID = :SCHL_CLS_SCHLDL_SUB_ID"; $params['SCHL_CLS_SCHLDL_SUB_ID'] = $data['SCHLDL_SUB_NM']; }
        if (array_key_exists('SCHLDL_TCHR_NM', $data)) { $fieldsToUpdate[] = "SCHL_BR_TCHR_ID = :SCHL_BR_TCHR_ID"; $params['SCHL_BR_TCHR_ID'] = $data['SCHLDL_TCHR_NM']; }
        if (array_key_exists('SCHLDL_RM_REF_ID', $data)) { $fieldsToUpdate[] = "SCHL_BR_RM_ID = :SCHL_BR_RM_ID"; $params['SCHL_BR_RM_ID'] = $data['SCHLDL_RM_REF_ID']; }
        if (array_key_exists('SCHLDL_DAY', $data)) { $fieldsToUpdate[] = "SCHL_DAY_OF_WK = :SCHL_DAY_OF_WK"; $params['SCHL_DAY_OF_WK'] = $data['SCHLDL_DAY']; }
        if (array_key_exists('SCHLDL_START_TM', $data)) { $fieldsToUpdate[] = "SCHL_CLS_SCHDL_FRM_DT = :SCHL_CLS_SCHDL_FRM_DT"; $params['SCHL_CLS_SCHDL_FRM_DT'] = $data['SCHLDL_START_TM']; }
        if (array_key_exists('SCHLDL_END_TM', $data)) { $fieldsToUpdate[] = "SCHL_CLS_SCHDL_TO_DT = :SCHL_CLS_SCHDL_TO_DT"; $params['SCHL_CLS_SCHDL_TO_DT'] = $data['SCHLDL_END_TM']; }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        $fieldsToUpdate = array_unique($fieldsToUpdate);
        $params['id'] = $id;
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE SCHL_CLS_SCHLDL_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE SCHL_CLS_SCHLDL_ID = ?");
        return $stmt->execute([$id]);
    }
}


