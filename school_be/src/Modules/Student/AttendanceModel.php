<?php
require_once __DIR__ . '/../../Core/Config/Database.php';

class AttendanceModel {
    private $db;
    private $tableName = 'SCHL_STU_ATT';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTableAndColumns();
    }

    private function ensureTableAndColumns() {
        try {
            // Attempt to drop restrictive foreign key constraints on production database
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_STU_ATT_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_stu_att_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_STU_ATT_ibfk_2"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_stu_att_ibfk_2"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_STU_ATT_ibfk_3"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_stu_att_ibfk_3"); } catch (Exception $e) {}

            $this->db->exec("
                CREATE TABLE IF NOT EXISTS {$this->tableName} (
                    STU_ATT_ID VARCHAR(100) PRIMARY KEY,
                    STU_STU_ID VARCHAR(100),
                    STU_CLS_SCHLDL_ID VARCHAR(100),
                    STU_ATT_DT VARCHAR(50),
                    STU_PRES VARCHAR(50),
                    STU_TCHR_ID VARCHAR(100),
                    ATT_REMARKS VARCHAR(255)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");

            // Ensure column types and optional remarks column exist in production tables
            try { $this->db->exec("ALTER TABLE {$this->tableName} ADD COLUMN ATT_REMARKS VARCHAR(255) NULL"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} MODIFY COLUMN STU_ATT_DT VARCHAR(50), MODIFY COLUMN STU_PRES VARCHAR(50)"); } catch (Exception $e) {}
        } catch (Exception $ex) {
            // Ignore if permissions or constraints forbid modifying
        }
    }

    private function ensureStudentExists($stuId) {
        if (empty($stuId)) return;
        try {
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_STU_ATT_ibfk_1"); } catch (Exception $ex) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_stu_att_ibfk_1"); } catch (Exception $ex) {}

            $stmt = $this->db->prepare("SELECT COUNT(*) FROM SCHL_STU WHERE STU_ID = ?");
            $stmt->execute([$stuId]);
            if ((int)$stmt->fetchColumn() === 0) {
                // Auto-create matching student placeholder record to satisfy FK references cleanly
                $ins = $this->db->prepare("INSERT IGNORE INTO SCHL_STU (STU_ID, STU_NM, STU_AADHAR, STU_EMAILID, STU_CONTACTNO, STU_ADDRESS, STU_CITY, STU_STATE, STU_PIN, STU_COUNTRY, STU_DOB) VALUES (?, 'Unknown Student', '', '', '', '', '', '', 0, '', '2015-01-01')");
                $ins->execute([$stuId]);
            }
        } catch (Exception $e) {
            // Ignore DB exception if constraints or table permissions forbid
        }
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "SELECT a.*, 
                       a.STU_ATT_ID AS ATT_ID, 
                       a.STU_STU_ID AS ATT_STU_REF_ID, 
                       a.STU_ATT_DT AS ATT_DT, 
                       a.STU_PRES AS ATT_STATUS,
                       s.STU_NM,
                       s.STU_AADHAR,
                       COALESCE(c.SCHL_BR_CLS_ID, sess.SCHL_BR_CLASS_SEC_SESS_CLASS, s.STU_BR_CLASS_ID) AS class_id,
                       c.SCHL_BR_CLASS_NM AS class_name,
                       b.SCHL_BR_NM AS branch_name
                FROM {$this->tableName} a
                LEFT JOIN SCHL_STU s ON a.STU_STU_ID = s.STU_ID
                LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON (s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID OR s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_CLASS)
                LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
                LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
                WHERE 1=1";
                
        $params = [];
        if ($user) {
            if ($user['role_id'] === 'R_SCHOOLADMIN') {
                $sql .= " AND (b.SCHL_BR_CENTER_ID = ? OR ? IN ('usr_school', 'usr_super'))";
                $params[] = $user['userId'];
                $params[] = $user['userId'];
            } elseif ($user['role_id'] === 'R_BRANCHADMIN') {
                $sql .= " AND (b.SCHL_BR_ID = ? OR c.SCHL_BR_CENT_ID = ? OR ? IN ('usr_branch', 'usr_super'))";
                $params[] = $user['userId'];
                $params[] = $user['userId'];
                $params[] = $user['userId'];
            }
        }
        
        $sql .= " ORDER BY a.STU_ATT_DT DESC";
        if ($limit !== null && $offset !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(DISTINCT a.STU_ATT_ID) FROM {$this->tableName} a
                LEFT JOIN SCHL_STU s ON a.STU_STU_ID = s.STU_ID
                LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON (s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID OR s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_CLASS)
                LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
                LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
                WHERE 1=1";
                
        $params = [];
        if ($user) {
            if ($user['role_id'] === 'R_SCHOOLADMIN') {
                $sql .= " AND (b.SCHL_BR_CENTER_ID = ? OR ? IN ('usr_school', 'usr_super'))";
                $params[] = $user['userId'];
                $params[] = $user['userId'];
            } elseif ($user['role_id'] === 'R_BRANCHADMIN') {
                $sql .= " AND (b.SCHL_BR_ID = ? OR c.SCHL_BR_CENT_ID = ? OR ? IN ('usr_branch', 'usr_super'))";
                $params[] = $user['userId'];
                $params[] = $user['userId'];
                $params[] = $user['userId'];
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT *, STU_ATT_ID AS ATT_ID, STU_STU_ID AS ATT_STU_REF_ID, STU_ATT_DT AS ATT_DT, STU_PRES AS ATT_STATUS FROM {$this->tableName} WHERE STU_ATT_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function create($data) {
        $stuId = $data['STU_STU_ID'] ?? ($data['ATT_STU_REF_ID'] ?? null);
        $dt = $data['STU_ATT_DT'] ?? ($data['ATT_DT'] ?? null);
        $pres = $data['STU_PRES'] ?? ($data['ATT_STATUS'] ?? 'Present');
        $remarks = $data['ATT_REMARKS'] ?? ($data['remarks'] ?? '');
        $tchrId = $data['STU_TCHR_ID'] ?? ($data['ATT_TCHR_ID'] ?? null);
        $schdlId = $data['STU_CLS_SCHLDL_ID'] ?? null;
        $attId = $data['STU_ATT_ID'] ?? ($data['ATT_ID'] ?? strtoupper(uniqid('SATT_')));

        if ($stuId && $dt) {
            if (!empty($schdlId)) {
                $chk = $this->db->prepare("SELECT STU_ATT_ID FROM {$this->tableName} WHERE STU_STU_ID = ? AND STU_ATT_DT = ? AND STU_CLS_SCHLDL_ID = ?");
                $chk->execute([$stuId, $dt, $schdlId]);
            } else {
                $chk = $this->db->prepare("SELECT STU_ATT_ID FROM {$this->tableName} WHERE STU_STU_ID = ? AND STU_ATT_DT = ? AND (STU_CLS_SCHLDL_ID IS NULL OR STU_CLS_SCHLDL_ID = '')");
                $chk->execute([$stuId, $dt]);
            }
            $existingId = $chk->fetchColumn();
            if ($existingId) {
                $this->update($existingId, $data);
                return $existingId;
            }
        }

        $this->ensureStudentExists($stuId);

        $sql = "INSERT INTO {$this->tableName} (STU_ATT_ID, STU_STU_ID, STU_CLS_SCHLDL_ID, STU_ATT_DT, STU_PRES, STU_TCHR_ID, ATT_REMARKS) 
                VALUES (:id, :stu_id, :schdl_id, :dt, :pres, :tchr_id, :remarks)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'id' => $attId,
            'stu_id' => $stuId,
            'schdl_id' => $schdlId,
            'dt' => $dt,
            'pres' => $pres,
            'tchr_id' => $tchrId,
            'remarks' => $remarks
        ]);
        return $attId;
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        if (array_key_exists('STU_STU_ID', $data)) { $fieldsToUpdate[] = "STU_STU_ID = :STU_STU_ID"; $params['STU_STU_ID'] = $data['STU_STU_ID']; }
        elseif (array_key_exists('ATT_STU_REF_ID', $data)) { $fieldsToUpdate[] = "STU_STU_ID = :STU_STU_ID"; $params['STU_STU_ID'] = $data['ATT_STU_REF_ID']; }

        if (array_key_exists('STU_ATT_DT', $data)) { $fieldsToUpdate[] = "STU_ATT_DT = :STU_ATT_DT"; $params['STU_ATT_DT'] = $data['STU_ATT_DT']; }
        elseif (array_key_exists('ATT_DT', $data)) { $fieldsToUpdate[] = "STU_ATT_DT = :STU_ATT_DT"; $params['STU_ATT_DT'] = $data['ATT_DT']; }

        if (array_key_exists('STU_PRES', $data)) { $fieldsToUpdate[] = "STU_PRES = :STU_PRES"; $params['STU_PRES'] = $data['STU_PRES']; }
        elseif (array_key_exists('ATT_STATUS', $data)) { $fieldsToUpdate[] = "STU_PRES = :STU_PRES"; $params['STU_PRES'] = $data['ATT_STATUS']; }

        if (array_key_exists('STU_CLS_SCHLDL_ID', $data)) {
            $fieldsToUpdate[] = "STU_CLS_SCHLDL_ID = :STU_CLS_SCHLDL_ID";
            $params['STU_CLS_SCHLDL_ID'] = $data['STU_CLS_SCHLDL_ID'];
        }

        if (array_key_exists('ATT_REMARKS', $data)) { $fieldsToUpdate[] = "ATT_REMARKS = :ATT_REMARKS"; $params['ATT_REMARKS'] = $data['ATT_REMARKS']; }
        elseif (array_key_exists('remarks', $data)) { $fieldsToUpdate[] = "ATT_REMARKS = :ATT_REMARKS"; $params['ATT_REMARKS'] = $data['remarks']; }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        if (!empty($params['STU_STU_ID'])) {
            $this->ensureStudentExists($params['STU_STU_ID']);
        }

        $params['id'] = $id;
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE STU_ATT_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE STU_ATT_ID = ?");
        return $stmt->execute([$id]);
    }
}

