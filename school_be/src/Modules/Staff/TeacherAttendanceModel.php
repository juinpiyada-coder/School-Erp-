<?php
require_once dirname(__DIR__, 2) . '/Core/Config/Database.php';
require_once __DIR__ . '/TeacherModel.php';

class TeacherAttendanceModel {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
        new TeacherModel(); // Ensure table schema columns exist before querying
        $this->ensureTableAndColumns();
    }

    private function ensureTableAndColumns() {
        try {
            // Ensure SCHL_TCHR_ATT columns exist
            try { $this->db->exec("ALTER TABLE SCHL_TCHR_ATT ADD COLUMN TCHR_PRES VARCHAR(50) NULL"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE SCHL_TCHR_ATT ADD COLUMN TCHR_TOTAL_HRS FLOAT NULL DEFAULT 0"); } catch (Exception $e) {}

            // Ensure SCHL_TCHR_TIME_DTLS datetime columns
            try { $this->db->exec("ALTER TABLE SCHL_TCHR_TIME_DTLS MODIFY COLUMN TCHR_IN_TIME DATETIME NULL, MODIFY COLUMN TCHR_OUT_TIME DATETIME NULL"); } catch (Exception $e) {}
        } catch (Exception $ex) {}
    }

    public function getAll($filters = [], $limit = null, $offset = null, $user = null) {
        $date = !empty($filters['date']) ? $filters['date'] : date('Y-m-d');
        
        $sql = "SELECT tc.BR_TCHR_ID as id, 
                       tc.BR_TCHR_ID as teacherId, 
                       :date1 as date, 
                       COALESCE(t.TCHR_REMARKS, att.TCHR_PRES, 
                         CASE 
                           WHEN t.TCHR_IN_TIME IS NOT NULL THEN 'Present'
                           ELSE 'Not Marked'
                         END
                       ) as status,
                       COALESCE(TIME_FORMAT(t.TCHR_IN_TIME, '%h:%i %p'), '—') as checkIn,
                       COALESCE(TIME_FORMAT(t.TCHR_OUT_TIME, '%h:%i %p'), '—') as checkOut,
                       CASE 
                         WHEN t.TCHR_IN_TIME IS NOT NULL AND t.TCHR_OUT_TIME IS NOT NULL AND t.TCHR_IN_TIME != t.TCHR_OUT_TIME
                         THEN CONCAT(
                               TIMESTAMPDIFF(HOUR, t.TCHR_IN_TIME, t.TCHR_OUT_TIME), 'h ',
                               MOD(TIMESTAMPDIFF(MINUTE, t.TCHR_IN_TIME, t.TCHR_OUT_TIME), 60), 'm'
                              )
                         WHEN att.TCHR_TOTAL_HRS > 0 
                         THEN CONCAT(att.TCHR_TOTAL_HRS, ' hrs')
                         ELSE '—'
                       END as duration,
                       (
                         SELECT COUNT(*) 
                         FROM SCHL_CLS_SCHLDL sch 
                         WHERE sch.SCHL_BR_TCHR_ID = tc.BR_TCHR_ID
                       ) as totalClasses,
                       (
                         SELECT COUNT(DISTINCT a.STU_CLS_SCHLDL_ID) 
                         FROM SCHL_STU_ATT a 
                         WHERE a.STU_TCHR_ID = tc.BR_TCHR_ID 
                           AND a.STU_ATT_DT = :date2
                       ) as classesConducted,
                       tc.BR_TCHR_NM as name
                FROM SCHL_BR_TCHR tc 
                LEFT JOIN SCHL_BRANCH b ON tc.BR_TCHR_BR_ID = b.SCHL_BR_ID
                LEFT JOIN SCHL_TCHR_ATT att 
                       ON att.TCHR_ID = tc.BR_TCHR_ID 
                      AND att.TCHR_ATT_DT = :date3
                LEFT JOIN SCHL_TCHR_TIME_DTLS t 
                       ON tc.BR_TCHR_ID = t.TCHR_ID 
                      AND DATE(t.TCHR_IN_TIME) = :date4";
        
        $where = [];
        $params = [
            'date1' => $date,
            'date2' => $date,
            'date3' => $date,
            'date4' => $date,
        ];

        if ($user) {
            if ($user['role_id'] === 'R_SCHOOLADMIN') {
                $where[] = "(b.SCHL_BR_CENTER_ID = :userId OR :userId1 IN ('usr_school', 'usr_super'))";
                $params['userId'] = $user['userId'];
                $params['userId1'] = $user['userId'];
            } elseif ($user['role_id'] === 'R_BRANCHADMIN') {
                $where[] = "(tc.BR_TCHR_BR_ID = :userId OR :userId1 IN ('usr_branch', 'usr_super'))";
                $params['userId'] = $user['userId'];
                $params['userId1'] = $user['userId'];
            }
        }

        if (count($where) > 0) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        $sql = "SELECT * FROM ($sql) as subquery";
        $outerWhere = [];
        if (!empty($filters['status']) && $filters['status'] !== 'All') {
            $outerWhere[] = "status = :status";
            $params['status'] = $filters['status'];
        }
        
        if (count($outerWhere) > 0) {
            $sql .= " WHERE " . implode(" AND ", $outerWhere);
        }

        if ($limit !== null && $offset !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTotalCount($filters = [], $user = null) {
        $data = $this->getAll($filters, null, null, $user);
        return count($data);
    }

    public function getById($id, $date = null) {
        if (!$date) {
            $date = date('Y-m-d');
        }
        $sql = "SELECT tc.BR_TCHR_ID as id, 
                       tc.BR_TCHR_ID as teacherId, 
                       :date1 as date, 
                       COALESCE(t.TCHR_REMARKS, att.TCHR_PRES, 'Not Marked') as status, 
                       COALESCE(TIME_FORMAT(t.TCHR_IN_TIME, '%h:%i %p'), '—') as checkIn, 
                       COALESCE(TIME_FORMAT(t.TCHR_OUT_TIME, '%h:%i %p'), '—') as checkOut,
                       tc.BR_TCHR_NM as name
                FROM SCHL_BR_TCHR tc 
                LEFT JOIN SCHL_TCHR_ATT att 
                       ON att.TCHR_ID = tc.BR_TCHR_ID 
                      AND att.TCHR_ATT_DT = :date2
                LEFT JOIN SCHL_TCHR_TIME_DTLS t 
                       ON tc.BR_TCHR_ID = t.TCHR_ID 
                      AND DATE(t.TCHR_IN_TIME) = :date3
                WHERE tc.BR_TCHR_ID = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['date1' => $date, 'date2' => $date, 'date3' => $date, 'id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function create($data) {
        return true;
    }

    public function update($teacherId, $data) {
        try {
            $this->db->beginTransaction();

            $date = isset($data['date']) ? $data['date'] : date('Y-m-d');
            $status = isset($data['status']) ? $data['status'] : 'Present';
            $checkIn = !empty($data['checkIn']) && $data['checkIn'] !== '—' ? $data['checkIn'] : null;
            $checkOut = !empty($data['checkOut']) && $data['checkOut'] !== '—' ? $data['checkOut'] : null;

            $inTime = $checkIn ? date('Y-m-d H:i:s', strtotime("$date $checkIn")) : "$date 09:00:00";
            $outTime = $checkOut ? date('Y-m-d H:i:s', strtotime("$date $checkOut")) : ($checkIn ? date('Y-m-d H:i:s', strtotime("$date $checkIn +8 hours")) : "$date 17:00:00");
            if ($status === 'Absent') {
                $inTime = null;
                $outTime = null;
            }
            
            // Check if record exists for this teacher on this date
            $stmt = $this->db->prepare("SELECT TCHR_TIME_ID FROM SCHL_TCHR_TIME_DTLS WHERE TCHR_ID = ? AND DATE(TCHR_IN_TIME) = ?");
            $stmt->execute([$teacherId, $date]);
            $existingId = $stmt->fetchColumn();

            if ($existingId) {
                // Update
                $sql = "UPDATE SCHL_TCHR_TIME_DTLS SET TCHR_REMARKS = :status, TCHR_IN_TIME = :inTime, TCHR_OUT_TIME = :outTime WHERE TCHR_TIME_ID = :id";
                $updateStmt = $this->db->prepare($sql);
                $updateStmt->execute([
                    'status' => $status,
                    'inTime' => $inTime,
                    'outTime' => $outTime,
                    'id' => $existingId
                ]);
            } else {
                // Insert
                $timeDtlsId = uniqid('TDTL_');
                $sqlTime = "INSERT INTO SCHL_TCHR_TIME_DTLS (TCHR_TIME_ID, TCHR_ID, TCHR_IN_TIME, TCHR_OUT_TIME, TCHR_REMARKS) 
                            VALUES (:TCHR_TIME_ID, :TCHR_ID, :TCHR_IN_TIME, :TCHR_OUT_TIME, :TCHR_REMARKS)";
                $stmtTime = $this->db->prepare($sqlTime);
                $stmtTime->execute([
                    'TCHR_TIME_ID' => $timeDtlsId,
                    'TCHR_ID' => $teacherId,
                    'TCHR_IN_TIME' => $inTime,
                    'TCHR_OUT_TIME' => $outTime,
                    'TCHR_REMARKS' => $status
                ]);
            }

            // Sync with SCHL_TCHR_ATT
            $chkAtt = $this->db->prepare("SELECT TCHR_ATT_ID FROM SCHL_TCHR_ATT WHERE TCHR_ID = ? AND TCHR_ATT_DT = ?");
            $chkAtt->execute([$teacherId, $date]);
            $attId = $chkAtt->fetchColumn();
            if ($attId) {
                $this->db->prepare("UPDATE SCHL_TCHR_ATT SET TCHR_PRES = ? WHERE TCHR_ATT_ID = ?")->execute([$status, $attId]);
            } else {
                $this->db->prepare("INSERT INTO SCHL_TCHR_ATT (TCHR_ATT_ID, TCHR_ID, TCHR_ATT_DT, TCHR_PRES) VALUES (?, ?, ?, ?)")->execute([uniqid('TATT_'), $teacherId, $date, $status]);
            }

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function delete($id) {
        return true;
    }
}

