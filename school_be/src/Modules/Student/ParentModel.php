<?php
require_once __DIR__ . '/../../Core/Config/Database.php';

class ParentModel {
    private $db;
    private $tableName = 'SCHL_MSTR_PRNT';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTable();
    }

    private function ensureTable() {
        try {
            $this->db->exec("ALTER TABLE {$this->tableName} 
                ADD COLUMN IF NOT EXISTS USER_ID VARCHAR(100) NULL,
                ADD COLUMN IF NOT EXISTS PRNT_AADHAR VARCHAR(12) DEFAULT '',
                ADD COLUMN IF NOT EXISTS PRNT_RELATION VARCHAR(50) DEFAULT 'Father',
                ADD COLUMN IF NOT EXISTS PRNT_BRANCH_ID VARCHAR(100) NULL");
        } catch (Exception $e) {}
        // MySQL 5.7 does not support "ADD COLUMN IF NOT EXISTS" — detect via INFORMATION_SCHEMA.
        $this->ensureColumn('PRNT_OCCUPATION', "VARCHAR(150) DEFAULT ''");
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
        $sql = "
            SELECT p.*,
                   p.PRNT_ID as id,
                   p.PRNT_NM as name,
                   p.PRNT_EMAILID as email,
                   p.PRNT_CONTACTNO as phone,
                   p.PRNT_AADHAR as aadhar,
                   p.PRNT_RELATION as relation,
                   p.PRNT_OCCUPATION as occupation,
                   p.PRNT_BRANCH_ID as branchId,
                   p.USER_ID as userId,
                   COUNT(DISTINCT s.STU_ID) as student_count,
                   GROUP_CONCAT(DISTINCT s.STU_NM SEPARATOR ', ') as student_names
            FROM {$this->tableName} p
            LEFT JOIN SCHL_STU s ON p.PRNT_ID = s.STU_PRNT_ID
            WHERE 1=1
        ";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            $branchId = $user['branch_id'] ?? $user['SCHL_BR_ID'] ?? $user['center_id'] ?? '';
            $schoolId = $user['school_id'] ?? $user['SCHL_ID'] ?? '';

            if ($roleId === 'R_SUPERADMIN' || $roleId === 'SUPERADMIN') {
                // Superadmin sees all
            } elseif ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND (
                    p.PRNT_CREATEDBY = ? 
                    OR p.PRNT_CREATEDBY IS NULL 
                    OR p.PRNT_CREATEDBY = ''
                    OR ? IN ('usr_school', 'usr_super')
                    OR p.PRNT_BRANCH_ID IN (SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ? OR SCHL_BR_CENTER_ID = ?)
                    OR p.PRNT_BRANCH_ID IS NULL
                    OR p.PRNT_BRANCH_ID = ''
                    OR p.PRNT_ID IN (
                        SELECT s2.STU_PRNT_ID 
                        FROM SCHL_STU s2 
                        LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s2.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID 
                        LEFT JOIN SCHL_BRANCH b ON sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID 
                        WHERE b.SCHL_BR_CENTER_ID = ? OR b.SCHL_BR_CENTER_ID = ?
                    )
                )";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $schoolId;
                $params[] = $userId;
                $params[] = $schoolId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND (
                    p.PRNT_CREATEDBY = ? 
                    OR p.PRNT_CREATEDBY IS NULL 
                    OR p.PRNT_CREATEDBY = ''
                    OR ? IN ('usr_branch', 'usr_super')
                    OR p.PRNT_BRANCH_ID = ?
                    OR p.PRNT_BRANCH_ID = ?
                    OR p.PRNT_BRANCH_ID IS NULL
                    OR p.PRNT_BRANCH_ID = ''
                    OR p.PRNT_ID IN (
                        SELECT s2.STU_PRNT_ID 
                        FROM SCHL_STU s2 
                        LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s2.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID 
                        WHERE sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ? OR sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ?
                    )
                )";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $branchId;
                $params[] = $userId;
                $params[] = $branchId;
            }
        }

        $sql .= " GROUP BY p.PRNT_ID, p.PRNT_NM, p.PRNT_AADHAR, p.PRNT_RELATION, p.PRNT_OCCUPATION, p.PRNT_EMAILID, p.PRNT_CONTACTNO, p.PRNT_ADDRESS, p.PRNT_CITY, p.PRNT_STATE, p.PRNT_PIN, p.PRNT_COUNTRY, p.PRNT_BRANCH_ID, p.USER_ID, p.PRNT_CREATEDBY, p.PRNT_CREATEDAT, p.PRNT_UPDATEDBY, p.PRNT_UPDATEDAT
                  ORDER BY p.PRNT_NM ASC";

        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $parents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($parents as &$parent) {
            if (!empty($parent['student_names'])) {
                $parent['students'] = array_map('trim', explode(',', $parent['student_names']));
            } else {
                $parent['students'] = [];
            }
        }
        return $parents;
    }

    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(*) FROM {$this->tableName} p WHERE 1=1";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            $branchId = $user['branch_id'] ?? $user['SCHL_BR_ID'] ?? $user['center_id'] ?? '';
            $schoolId = $user['school_id'] ?? $user['SCHL_ID'] ?? '';

            if ($roleId === 'R_SUPERADMIN' || $roleId === 'SUPERADMIN') {
                // Superadmin sees all
            } elseif ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND (
                    p.PRNT_CREATEDBY = ? 
                    OR p.PRNT_CREATEDBY IS NULL 
                    OR p.PRNT_CREATEDBY = ''
                    OR ? IN ('usr_school', 'usr_super')
                    OR p.PRNT_BRANCH_ID IN (SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ? OR SCHL_BR_CENTER_ID = ?)
                    OR p.PRNT_BRANCH_ID IS NULL
                    OR p.PRNT_BRANCH_ID = ''
                    OR p.PRNT_ID IN (
                        SELECT s2.STU_PRNT_ID 
                        FROM SCHL_STU s2 
                        LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s2.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID 
                        LEFT JOIN SCHL_BRANCH b ON sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID 
                        WHERE b.SCHL_BR_CENTER_ID = ? OR b.SCHL_BR_CENTER_ID = ?
                    )
                )";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $schoolId;
                $params[] = $userId;
                $params[] = $schoolId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND (
                    p.PRNT_CREATEDBY = ? 
                    OR p.PRNT_CREATEDBY IS NULL 
                    OR p.PRNT_CREATEDBY = ''
                    OR ? IN ('usr_branch', 'usr_super')
                    OR p.PRNT_BRANCH_ID = ?
                    OR p.PRNT_BRANCH_ID = ?
                    OR p.PRNT_BRANCH_ID IS NULL
                    OR p.PRNT_BRANCH_ID = ''
                    OR p.PRNT_ID IN (
                        SELECT s2.STU_PRNT_ID 
                        FROM SCHL_STU s2 
                        LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s2.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID 
                        WHERE sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ? OR sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ?
                    )
                )";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $branchId;
                $params[] = $userId;
                $params[] = $branchId;
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    // Returns the logged-in guardian's own children only, for the dashboard ward switcher.
    // Real replacement for the frontend's previous call to a /parent/wards endpoint that
    // never existed on the backend (it was 404ing and silently falling back to fake names).
    public function getWardsByGuardianEmail($email) {
        if (empty($email)) {
            return [];
        }
        $pStmt = $this->db->prepare("SELECT PRNT_ID FROM {$this->tableName} WHERE PRNT_EMAILID = ? LIMIT 1");
        $pStmt->execute([$email]);
        $prntId = $pStmt->fetchColumn();
        if (!$prntId) {
            return [];
        }

        $stmt = $this->db->prepare("
            SELECT s.STU_ID as id,
                   s.STU_NM as name,
                   c.SCHL_BR_CLASS_NM as className,
                   sess.SCHL_BR_CLASS_SEC_SESS_SECT as sectionName
            FROM SCHL_STU s
            LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
            WHERE s.STU_PRNT_ID = ?
            ORDER BY s.STU_NM ASC
        ");
        $stmt->execute([$prntId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $grade = trim($r['className'] ?? '');
            $section = trim($r['sectionName'] ?? '');
            $r['grade'] = $grade !== '' ? ($section !== '' ? "$grade - Section $section" : $grade) : '';
            unset($r['className'], $r['sectionName']);
        }
        return $rows;
    }

    public function getById($id) {
        $stmt = $this->db->prepare("
            SELECT p.*,
                   p.PRNT_ID as id,
                   p.PRNT_NM as name,
                   p.PRNT_EMAILID as email,
                   p.PRNT_CONTACTNO as phone,
                   p.PRNT_AADHAR as aadhar,
                   p.PRNT_RELATION as relation,
                   p.PRNT_OCCUPATION as occupation,
                   p.PRNT_BRANCH_ID as branchId,
                   p.USER_ID as userId,
                   COUNT(DISTINCT s.STU_ID) as student_count,
                   GROUP_CONCAT(DISTINCT s.STU_NM SEPARATOR ', ') as student_names
            FROM {$this->tableName} p
            LEFT JOIN SCHL_STU s ON p.PRNT_ID = s.STU_PRNT_ID
            WHERE p.PRNT_ID = ?
            GROUP BY p.PRNT_ID, p.PRNT_NM, p.PRNT_AADHAR, p.PRNT_RELATION, p.PRNT_OCCUPATION, p.PRNT_EMAILID, p.PRNT_CONTACTNO, p.PRNT_ADDRESS, p.PRNT_CITY, p.PRNT_STATE, p.PRNT_PIN, p.PRNT_COUNTRY, p.PRNT_BRANCH_ID, p.USER_ID, p.PRNT_CREATEDBY, p.PRNT_CREATEDAT, p.PRNT_UPDATEDBY, p.PRNT_UPDATEDAT
        ");
        $stmt->execute([$id]);
        $parent = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($parent) {
            $parent['students'] = !empty($parent['student_names']) ? array_map('trim', explode(',', $parent['student_names'])) : [];
        }
        return $parent;
    }

    public function create($data) {
        $fields = ['PRNT_ID', 'PRNT_NM', 'PRNT_AADHAR', 'PRNT_RELATION', 'PRNT_OCCUPATION', 'PRNT_EMAILID', 'PRNT_CONTACTNO', 'PRNT_ADDRESS', 'PRNT_CITY', 'PRNT_STATE', 'PRNT_PIN', 'PRNT_COUNTRY', 'PRNT_BRANCH_ID', 'PRNT_CREATEDBY', 'USER_ID'];
        $insertData = [];
        foreach ($fields as $field) {
            $insertData[$field] = isset($data[$field]) ? $data[$field] : null;
        }

        if (empty($insertData['PRNT_NM']) && !empty($data['name'])) {
            $insertData['PRNT_NM'] = $data['name'];
        }
        if (empty($insertData['PRNT_AADHAR']) && !empty($data['aadhar'])) {
            $insertData['PRNT_AADHAR'] = $data['aadhar'];
        }
        if (empty($insertData['PRNT_RELATION']) && !empty($data['relation'])) {
            $insertData['PRNT_RELATION'] = $data['relation'];
        }
        if (empty($insertData['PRNT_OCCUPATION']) && !empty($data['occupation'])) {
            $insertData['PRNT_OCCUPATION'] = $data['occupation'];
        }
        if (empty($insertData['PRNT_EMAILID']) && !empty($data['email'])) {
            $insertData['PRNT_EMAILID'] = $data['email'];
        } elseif (empty($insertData['PRNT_EMAILID']) && !empty($data['PRNT_EMAIL'])) {
            $insertData['PRNT_EMAILID'] = $data['PRNT_EMAIL'];
        }
        if (empty($insertData['PRNT_CONTACTNO']) && !empty($data['phone'])) {
            $insertData['PRNT_CONTACTNO'] = $data['phone'];
        } elseif (empty($insertData['PRNT_CONTACTNO']) && !empty($data['PRNT_CONTACT_NO'])) {
            $insertData['PRNT_CONTACTNO'] = $data['PRNT_CONTACT_NO'];
        }
        if (empty($insertData['PRNT_BRANCH_ID']) && !empty($data['branchId'])) {
            $insertData['PRNT_BRANCH_ID'] = $data['branchId'];
        } elseif (empty($insertData['PRNT_BRANCH_ID']) && !empty($data['branch_id'])) {
            $insertData['PRNT_BRANCH_ID'] = $data['branch_id'];
        }
        if (empty($insertData['USER_ID']) && !empty($data['userId'])) {
            $insertData['USER_ID'] = $data['userId'];
        }

        foreach ($insertData as $key => &$val) {
            if ($val === null) {
                if (in_array($key, ['PRNT_PIN'])) {
                    $val = 0;
                } elseif (in_array($key, ['PRNT_CREATEDBY', 'USER_ID', 'PRNT_BRANCH_ID'])) {
                    $val = null;
                } else {
                    $val = '';
                }
            }
        }

        $cols = implode(', ', $fields);
        $placeholders = implode(', ', array_map(fn($f) => ":$f", $fields));
        $sql = "INSERT INTO {$this->tableName} ($cols) VALUES ($placeholders)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($insertData);
        return $insertData['PRNT_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $updatableFields = ['PRNT_NM', 'PRNT_AADHAR', 'PRNT_RELATION', 'PRNT_OCCUPATION', 'PRNT_EMAILID', 'PRNT_CONTACTNO', 'PRNT_ADDRESS', 'PRNT_CITY', 'PRNT_STATE', 'PRNT_PIN', 'PRNT_COUNTRY', 'PRNT_BRANCH_ID', 'USER_ID'];
        
        $mapping = [
            'name' => 'PRNT_NM',
            'aadhar' => 'PRNT_AADHAR',
            'relation' => 'PRNT_RELATION',
            'occupation' => 'PRNT_OCCUPATION',
            'email' => 'PRNT_EMAILID',
            'PRNT_EMAIL' => 'PRNT_EMAILID',
            'phone' => 'PRNT_CONTACTNO',
            'PRNT_CONTACT_NO' => 'PRNT_CONTACTNO',
            'branchId' => 'PRNT_BRANCH_ID',
            'branch_id' => 'PRNT_BRANCH_ID',
            'userId' => 'USER_ID',
        ];
        foreach ($mapping as $old => $new) {
            if (array_key_exists($old, $data) && !array_key_exists($new, $data)) {
                $data[$new] = $data[$old];
            }
        }

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
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE PRNT_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        try {
            $this->db->prepare("UPDATE SCHL_STU SET STU_PRNT_ID = NULL WHERE STU_PRNT_ID = ?")->execute([$id]);
        } catch (Exception $e) {}

        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE PRNT_ID = ?");
        return $stmt->execute([$id]);
    }
}