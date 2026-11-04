<?php

class ClassModel {
    private $db;
    private $tableName = 'SCHL_BR_CLASS';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureColumns();
    }

    private function ensureColumns() {
        try {
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_CLASS_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_class_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_CLASS_ibfk_2"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_class_ibfk_2"); } catch (Exception $e) {}

            $this->db->exec("ALTER TABLE {$this->tableName} 
                ADD COLUMN IF NOT EXISTS SCHL_BR_CLASS_LANG VARCHAR(50) DEFAULT 'English',
                ADD COLUMN IF NOT EXISTS SCHL_BR_BRD VARCHAR(50) DEFAULT 'CBSE',
                ADD COLUMN IF NOT EXISTS SCHL_BR_MAT VARCHAR(100) NULL");
        } catch (Exception $e) {}
    }

    public function ensureBranchExists($branchId) {
        if (empty($branchId)) return;
        try {
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_CLASS_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_class_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_CLASS_ibfk_2"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_class_ibfk_2"); } catch (Exception $e) {}

            $stmt = $this->db->prepare("SELECT COUNT(*) FROM SCHL_BRANCH WHERE SCHL_BR_ID = ?");
            $stmt->execute([$branchId]);
            if ((int)$stmt->fetchColumn() === 0) {
                $ins = $this->db->prepare("INSERT IGNORE INTO SCHL_BRANCH (SCHL_BR_ID, SCHL_BR_NM, SCHL_BR_CITY, SCHL_BR_STATE, SCHL_BR_PIN, SCHL_BR_COUNTRY, SCHL_BR_EMAILID, SCHL_BR_CONTACTNO) 
                                           VALUES (?, 'Main Branch', 'City', 'State', 100001, 'India', 'branch@eschool.com', '9999999999')");
                $ins->execute([$branchId]);
            }
        } catch (Exception $e) {}
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "SELECT c.*,
                       b.SCHL_BR_NM as branch_name,
                       m.SCHL_UNIQ_MATRIX_NM as matrix_name,
                       m.SCHL_MAT_NM as matrix_type,
                       (SELECT COUNT(*) 
                        FROM SCHL_STU s
                        JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
                        WHERE sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID) as student_count
                FROM {$this->tableName} c
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
                LEFT JOIN SCHL_BRCH_MATRIX m ON c.SCHL_BR_MAT = m.SCHL_MAT_ID
                WHERE 1=1";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND c.SCHL_BR_CENT_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_TEACHER' || $roleId === 'TEACHER' || strpos($roleId, 'TEACHER') !== false) {
                $userEmail = $user['email'] ?? $user['user_email_id'] ?? '';
                $sql .= " AND c.SCHL_BR_CLS_ID IN (
                    SELECT tchr.BR_TCHR_ASSIGNED_CLASS_ID 
                    FROM SCHL_BR_TCHR tchr 
                    WHERE (tchr.BR_TCHR_ID = ? OR (tchr.BR_TCHR_EMAI_ID = ? AND ? != '')) 
                      AND tchr.BR_TCHR_ASSIGNED_CLASS_ID IS NOT NULL AND tchr.BR_TCHR_ASSIGNED_CLASS_ID != ''
                    UNION
                    SELECT sub.BR_CLS_ID 
                    FROM SCHL_TCHR_SUB ts
                    JOIN SCHL_BR_CLS_SUBJECT sub ON ts.TCHR_SUB_ID = sub.BR_CLS_SUB_ID
                    JOIN SCHL_BR_TCHR tchr ON ts.TCHR_ID = tchr.BR_TCHR_ID
                    WHERE (tchr.BR_TCHR_ID = ? OR (tchr.BR_TCHR_EMAI_ID = ? AND ? != ''))
                    UNION
                    SELECT DISTINCT COALESCE(sess.SCHL_BR_CLASS_SEC_SESS_CLASS, sch.SCHL_CLS_SCHLDL_SEC_SESS_ID)
                    FROM SCHL_CLS_SCHLDL sch
                    LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON sch.SCHL_CLS_SCHLDL_SEC_SESS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
                    JOIN SCHL_BR_TCHR tchr ON sch.SCHL_BR_TCHR_ID = tchr.BR_TCHR_ID
                    WHERE (tchr.BR_TCHR_ID = ? OR (tchr.BR_TCHR_EMAI_ID = ? AND ? != ''))
                )";
                $params[] = $userId; $params[] = $userEmail; $params[] = $userEmail;
                $params[] = $userId; $params[] = $userEmail; $params[] = $userEmail;
                $params[] = $userId; $params[] = $userEmail; $params[] = $userEmail;
            }
        }
        $sql .= " ORDER BY c.SCHL_BR_CLASS_NM ASC";
        if ($limit !== null && $offset !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(*) FROM {$this->tableName} c LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID WHERE 1=1";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND c.SCHL_BR_CENT_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_TEACHER' || $roleId === 'TEACHER' || strpos($roleId, 'TEACHER') !== false) {
                $userEmail = $user['email'] ?? $user['user_email_id'] ?? '';
                $sql .= " AND c.SCHL_BR_CLS_ID IN (
                    SELECT tchr.BR_TCHR_ASSIGNED_CLASS_ID 
                    FROM SCHL_BR_TCHR tchr 
                    WHERE (tchr.BR_TCHR_ID = ? OR (tchr.BR_TCHR_EMAI_ID = ? AND ? != '')) 
                      AND tchr.BR_TCHR_ASSIGNED_CLASS_ID IS NOT NULL AND tchr.BR_TCHR_ASSIGNED_CLASS_ID != ''
                    UNION
                    SELECT sub.BR_CLS_ID 
                    FROM SCHL_TCHR_SUB ts
                    JOIN SCHL_BR_CLS_SUBJECT sub ON ts.TCHR_SUB_ID = sub.BR_CLS_SUB_ID
                    JOIN SCHL_BR_TCHR tchr ON ts.TCHR_ID = tchr.BR_TCHR_ID
                    WHERE (tchr.BR_TCHR_ID = ? OR (tchr.BR_TCHR_EMAI_ID = ? AND ? != ''))
                    UNION
                    SELECT DISTINCT COALESCE(sess.SCHL_BR_CLASS_SEC_SESS_CLASS, sch.SCHL_CLS_SCHLDL_SEC_SESS_ID)
                    FROM SCHL_CLS_SCHLDL sch
                    LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON sch.SCHL_CLS_SCHLDL_SEC_SESS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
                    JOIN SCHL_BR_TCHR tchr ON sch.SCHL_BR_TCHR_ID = tchr.BR_TCHR_ID
                    WHERE (tchr.BR_TCHR_ID = ? OR (tchr.BR_TCHR_EMAI_ID = ? AND ? != ''))
                )";
                $params[] = $userId; $params[] = $userEmail; $params[] = $userEmail;
                $params[] = $userId; $params[] = $userEmail; $params[] = $userEmail;
                $params[] = $userId; $params[] = $userEmail; $params[] = $userEmail;
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT c.*, b.SCHL_BR_NM as branch_name, m.SCHL_UNIQ_MATRIX_NM as matrix_name, m.SCHL_MAT_NM as matrix_type 
                                    FROM {$this->tableName} c 
                                    LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID 
                                    LEFT JOIN SCHL_BRCH_MATRIX m ON c.SCHL_BR_MAT = m.SCHL_MAT_ID 
                                    WHERE c.SCHL_BR_CLS_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function create($data) {
        $fields = ['SCHL_BR_CLS_ID', 'SCHL_BR_CENT_ID', 'SCHL_BR_CLASS_NM', 'SCHL_BR_CLASS_LANG', 'SCHL_BR_BRD', 'SCHL_BR_MAT'];
        $insertData = [];
        foreach ($fields as $field) {
            $insertData[$field] = isset($data[$field]) ? $data[$field] : null;
        }
        if (empty($insertData['SCHL_BR_CLASS_LANG'])) $insertData['SCHL_BR_CLASS_LANG'] = 'English';
        if (empty($insertData['SCHL_BR_BRD'])) $insertData['SCHL_BR_BRD'] = 'CBSE';
        if (empty($insertData['SCHL_BR_MAT'])) $insertData['SCHL_BR_MAT'] = null;

        if (!empty($insertData['SCHL_BR_CENT_ID'])) {
            $this->ensureBranchExists($insertData['SCHL_BR_CENT_ID']);
        }

        $sql = "INSERT INTO {$this->tableName} (SCHL_BR_CLS_ID, SCHL_BR_CENT_ID, SCHL_BR_CLASS_NM, SCHL_BR_CLASS_LANG, SCHL_BR_BRD, SCHL_BR_MAT)
                VALUES (:SCHL_BR_CLS_ID, :SCHL_BR_CENT_ID, :SCHL_BR_CLASS_NM, :SCHL_BR_CLASS_LANG, :SCHL_BR_BRD, :SCHL_BR_MAT)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($insertData);
        return $insertData['SCHL_BR_CLS_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $updatableFields = ['SCHL_BR_CENT_ID', 'SCHL_BR_CLASS_NM', 'SCHL_BR_CLASS_LANG', 'SCHL_BR_BRD', 'SCHL_BR_MAT'];
        foreach ($updatableFields as $field) {
            if (array_key_exists($field, $data)) {
                $val = $data[$field];
                if ($field === 'SCHL_BR_MAT' && empty($val)) {
                    $val = null;
                }
                $fieldsToUpdate[] = "{$field} = :{$field}";
                $params[$field] = $val;
            }
        }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        $params['id'] = $id;
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE SCHL_BR_CLS_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE SCHL_BR_CLS_ID = ?");
        return $stmt->execute([$id]);
    }
}
