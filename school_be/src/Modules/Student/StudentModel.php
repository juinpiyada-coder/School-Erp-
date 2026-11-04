<?php
require_once __DIR__ . '/../../Core/Config/Database.php';

class StudentModel {
    private $db;
    private $tableName = 'SCHL_STU';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTable();
    }

    private function ensureTable() {
        try {
            // Ensure USER_ID and STU_IMG columns exist
            try { $this->db->exec("ALTER TABLE {$this->tableName} ADD COLUMN USER_ID VARCHAR(100) NULL"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} ADD COLUMN STU_GENDER VARCHAR(20) NULL"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} ADD COLUMN STU_RELATION_WITH_GUARDIAN VARCHAR(50) NULL"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} ADD COLUMN STU_IMG MEDIUMBLOB NULL"); } catch (Exception $e) {}

            // Drop restrictive foreign key constraints if present
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_STU_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_stu_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_STU_ibfk_2"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_stu_ibfk_2"); } catch (Exception $e) {}
        } catch (Exception $ex) {}
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "
            SELECT s.*, 
                   s.USER_ID as userId,
                   COALESCE(s.STU_IMG, u.user_img) as user_img,
                   p.PRNT_NM as guardianName, 
                   p.PRNT_CONTACTNO as guardianPhone, 
                   p.PRNT_EMAILID as guardianEmail,
                   COALESCE(c.SCHL_BR_CLS_ID, sess.SCHL_BR_CLASS_SEC_SESS_CLASS, s.STU_BR_CLASS_ID) as class_id,
                   c.SCHL_BR_CLASS_NM as className,
                   sess.SCHL_BR_CLASS_SEC_SESS_SECT as sectionName,
                   sess.SCHL_BR_CLASS_SEC_SESS_ID as class_session_id,
                   b.SCHL_BR_ID as branch_id,
                   b.SCHL_BR_NM as branchName,
                   att_stats.total_days,
                   att_stats.present_days,
                   ROUND(
                       CASE 
                           WHEN att_stats.total_days > 0 
                           THEN (att_stats.present_days * 100.0 / att_stats.total_days)
                           ELSE 0
                       END, 1
                   ) as real_attendance_pct
            FROM {$this->tableName} s
            LEFT JOIN SM_USER_LOGIN u ON s.USER_ID = u.user_id
            LEFT JOIN SCHL_MSTR_PRNT p ON s.STU_PRNT_ID = p.PRNT_ID
            LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
            LEFT JOIN SCHL_BRANCH b ON sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID
            LEFT JOIN (
                SELECT STU_STU_ID,
                       COUNT(*) as total_days,
                       SUM(CASE WHEN LOWER(STU_PRES) IN ('present', 'p', '1', 'late') THEN 1 ELSE 0 END) as present_days
                FROM SCHL_STU_ATT
                GROUP BY STU_STU_ID
            ) att_stats ON s.STU_ID = att_stats.STU_STU_ID
            WHERE 1=1
        ";
        
        $params = [];
        if ($user) {
            $userRole = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            if ($userRole === 'R_SCHOOLADMIN') {
                $centerId = $user['userId'];
                $sql .= " AND (b.SCHL_BR_CENTER_ID = ? OR ? IN ('usr_school', 'usr_super') OR s.STU_CREATEDBY = ?)";
                $params[] = $centerId;
                $params[] = $centerId;
                $params[] = $centerId;
            } elseif ($userRole === 'R_BRANCHADMIN') {
                $branchId = $user['userId'];
                $sql .= " AND (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ? OR ? IN ('usr_branch', 'usr_super') OR s.STU_CREATEDBY = ?)";
                $params[] = $branchId;
                $params[] = $branchId;
                $params[] = $branchId;
            } elseif ($userRole === 'R_TEACHER' || $userRole === 'TEACHER' || strpos($userRole, 'TEACHER') !== false) {
                $userId = $user['userId'] ?? $user['user_id'] ?? '';
                $userEmail = $user['email'] ?? $user['user_email_id'] ?? '';
                $sql .= " AND COALESCE(c.SCHL_BR_CLS_ID, sess.SCHL_BR_CLASS_SEC_SESS_CLASS, s.STU_BR_CLASS_ID) IN (
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
                    SELECT DISTINCT COALESCE(ss.SCHL_BR_CLASS_SEC_SESS_CLASS, sch.SCHL_CLS_SCHLDL_SEC_SESS_ID)
                    FROM SCHL_CLS_SCHLDL sch
                    LEFT JOIN SCHL_BR_CLASS_SEC_SESSION ss ON sch.SCHL_CLS_SCHLDL_SEC_SESS_ID = ss.SCHL_BR_CLASS_SEC_SESS_ID
                    JOIN SCHL_BR_TCHR tchr ON sch.SCHL_BR_TCHR_ID = tchr.BR_TCHR_ID
                    WHERE (tchr.BR_TCHR_ID = ? OR (tchr.BR_TCHR_EMAI_ID = ? AND ? != ''))
                )";
                $params[] = $userId; $params[] = $userEmail; $params[] = $userEmail;
                $params[] = $userId; $params[] = $userEmail; $params[] = $userEmail;
                $params[] = $userId; $params[] = $userEmail; $params[] = $userEmail;
            }
        }

        $sql .= " ORDER BY s.STU_NM ASC";
        
        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            if (!empty($r['user_img'])) {
                $raw = $r['user_img'];
                if (is_string($raw) && strpos($raw, 'data:image') === 0) {
                    $r['user_img'] = $raw;
                } else {
                    $r['user_img'] = 'data:image/jpeg;base64,' . base64_encode($raw);
                }
            } else {
                $r['user_img'] = null;
            }
        }
        return $rows;
    }

    
    public function getTotalCount($user = null) {
        $sql = "
            SELECT COUNT(*) FROM {$this->tableName} s
            LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
            LEFT JOIN SCHL_BRANCH b ON sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID
            WHERE 1=1
        ";
        $params = [];
        if ($user) {
            $userRole = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            if ($userRole === 'R_SCHOOLADMIN') {
                $centerId = $user['userId'];
                $sql .= " AND (b.SCHL_BR_CENTER_ID = ? OR ? IN ('usr_school', 'usr_super') OR s.STU_CREATEDBY = ?)";
                $params[] = $centerId;
                $params[] = $centerId;
                $params[] = $centerId;
            } elseif ($userRole === 'R_BRANCHADMIN') {
                $branchId = $user['userId'];
                $sql .= " AND (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ? OR ? IN ('usr_branch', 'usr_super') OR s.STU_CREATEDBY = ?)";
                $params[] = $branchId;
                $params[] = $branchId;
                $params[] = $branchId;
            } elseif ($userRole === 'R_TEACHER' || $userRole === 'TEACHER' || strpos($userRole, 'TEACHER') !== false) {
                $userId = $user['userId'] ?? $user['user_id'] ?? '';
                $userEmail = $user['email'] ?? $user['user_email_id'] ?? '';
                $sql .= " AND COALESCE(c.SCHL_BR_CLS_ID, sess.SCHL_BR_CLASS_SEC_SESS_CLASS, s.STU_BR_CLASS_ID) IN (
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
                    SELECT DISTINCT COALESCE(ss.SCHL_BR_CLASS_SEC_SESS_CLASS, sch.SCHL_CLS_SCHLDL_SEC_SESS_ID)
                    FROM SCHL_CLS_SCHLDL sch
                    LEFT JOIN SCHL_BR_CLASS_SEC_SESSION ss ON sch.SCHL_CLS_SCHLDL_SEC_SESS_ID = ss.SCHL_BR_CLASS_SEC_SESS_ID
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
        $sql = "
            SELECT s.*, 
                   s.USER_ID as userId,
                   COALESCE(s.STU_IMG, u.user_img) as user_img,
                   p.PRNT_NM as guardianName, 
                   p.PRNT_CONTACTNO as guardianPhone, 
                   p.PRNT_EMAILID as guardianEmail,
                   c.SCHL_BR_CLASS_NM as className,
                   sess.SCHL_BR_CLASS_SEC_SESS_SECT as sectionName,
                   sess.SCHL_BR_CLASS_SEC_SESS_ID as class_session_id,
                   b.SCHL_BR_ID as branch_id,
                   b.SCHL_BR_NM as branchName
            FROM {$this->tableName} s
            LEFT JOIN SM_USER_LOGIN u ON s.USER_ID = u.user_id
            LEFT JOIN SCHL_MSTR_PRNT p ON s.STU_PRNT_ID = p.PRNT_ID
            LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            LEFT JOIN SCHL_BR_CLASS c ON sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID
            LEFT JOIN SCHL_BRANCH b ON sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID
            WHERE s.STU_ID = ?
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($student && !empty($student['user_img'])) {
            $raw = $student['user_img'];
            if (is_string($raw) && strpos($raw, 'data:image') === 0) {
                $student['user_img'] = $raw;
            } else {
                $student['user_img'] = 'data:image/jpeg;base64,' . base64_encode($raw);
            }
        }
        return $student;
    }

    public function create($data) {
        $fields = ['STU_ID', 'STU_NM', 'STU_AADHAR', 'STU_GENDER', 'STU_RELATION_WITH_GUARDIAN', 'STU_EMAILID', 'STU_CONTACTNO', 'STU_ADDRESS', 'STU_CITY', 'STU_STATE', 'STU_PIN', 'STU_COUNTRY', 'STU_DOB', 'STU_PRNT_ID', 'STU_BR_CLASS_ID', 'STU_CREATEDBY', 'USER_ID', 'STU_IMG'];
        $insertData = [];
        foreach ($fields as $field) {
            $insertData[$field] = isset($data[$field]) ? $data[$field] : null;
        }

        // Handle legacy field name mappings from frontend
        if (empty($insertData['STU_IMG']) && !empty($data['user_img'])) {
            $insertData['STU_IMG'] = $data['user_img'];
        }
        if (empty($insertData['STU_PRNT_ID']) && !empty($data['STU_PRNT_REF_ID'])) {
            $insertData['STU_PRNT_ID'] = $data['STU_PRNT_REF_ID'];
        }
        if (empty($insertData['STU_BR_CLASS_ID']) && !empty($data['STU_CLASS_REF_ID'])) {
            $insertData['STU_BR_CLASS_ID'] = $data['STU_CLASS_REF_ID'];
        }
        if (empty($insertData['STU_EMAILID']) && !empty($data['STU_EMAIL'])) {
            $insertData['STU_EMAILID'] = $data['STU_EMAIL'];
        }
        if (empty($insertData['STU_CONTACTNO']) && !empty($data['STU_CONTACT_NO'])) {
            $insertData['STU_CONTACTNO'] = $data['STU_CONTACT_NO'];
        }
        if (empty($insertData['STU_DOB']) && !empty($data['dob'])) {
            $insertData['STU_DOB'] = $data['dob'];
        }
        if (empty($insertData['USER_ID']) && !empty($data['userId'])) {
            $insertData['USER_ID'] = $data['userId'];
        }
        if (empty($insertData['STU_GENDER']) && !empty($data['gender'])) {
            $insertData['STU_GENDER'] = $data['gender'];
        }
        if (empty($insertData['STU_RELATION_WITH_GUARDIAN']) && !empty($data['relationWithGuardian'])) {
            $insertData['STU_RELATION_WITH_GUARDIAN'] = $data['relationWithGuardian'];
        }

        // Handle strict DB limit on STU_AADHAR
        if (!empty($insertData['STU_AADHAR']) && strlen($insertData['STU_AADHAR']) > 12) {
            $insertData['STU_AADHAR'] = substr($insertData['STU_AADHAR'], 0, 12);
        }

        // Default empty strings / valid defaults for NOT NULL columns
        foreach ($insertData as $key => &$val) {
            if ($val === null || $val === '') {
                if ($key === 'STU_PIN') {
                    $val = 0;
                } elseif ($key === 'STU_DOB') {
                    $val = '2015-01-01';
                } elseif (in_array($key, ['STU_PRNT_ID', 'STU_BR_CLASS_ID', 'STU_CREATEDBY', 'USER_ID', 'STU_GENDER', 'STU_RELATION_WITH_GUARDIAN', 'STU_IMG'])) {
                    // Allowed to be NULL or empty
                    $val = !empty($val) ? $val : null;
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
        return $insertData['STU_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $updatableFields = ['STU_NM', 'STU_AADHAR', 'STU_GENDER', 'STU_RELATION_WITH_GUARDIAN', 'STU_EMAILID', 'STU_CONTACTNO', 'STU_ADDRESS', 'STU_CITY', 'STU_STATE', 'STU_PIN', 'STU_COUNTRY', 'STU_DOB', 'STU_PRNT_ID', 'STU_BR_CLASS_ID', 'USER_ID', 'STU_IMG'];
        
        // Handle legacy field name mappings
        $mapping = [
            'STU_EMAIL' => 'STU_EMAILID',
            'STU_CONTACT_NO' => 'STU_CONTACTNO',
            'STU_PRNT_REF_ID' => 'STU_PRNT_ID',
            'STU_CLASS_REF_ID' => 'STU_BR_CLASS_ID',
            'dob' => 'STU_DOB',
            'userId' => 'USER_ID',
            'gender' => 'STU_GENDER',
            'relationWithGuardian' => 'STU_RELATION_WITH_GUARDIAN',
            'user_img' => 'STU_IMG'
        ];
        foreach ($mapping as $old => $new) {
            if (array_key_exists($old, $data) && !array_key_exists($new, $data)) {
                $data[$new] = $data[$old];
            }
        }

        foreach ($updatableFields as $field) {
            if (array_key_exists($field, $data)) {
                $fieldsToUpdate[] = "{$field} = :{$field}";
                $val = $data[$field];
                if ($field === 'STU_AADHAR' && !empty($val) && strlen($val) > 12) {
                    $val = substr($val, 0, 12);
                }
                if ($field === 'STU_DOB' && empty($val)) {
                    $val = '2015-01-01';
                }
                $params[$field] = $val;
            }
        }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        $params['id'] = $id;
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE STU_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        try {
            // Delete dependent attendance records first
            $this->db->prepare("DELETE FROM SCHL_STU_ATT WHERE STU_STU_ID = ?")->execute([$id]);
        } catch (Exception $e) {}

        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE STU_ID = ?");
        return $stmt->execute([$id]);
    }
}
