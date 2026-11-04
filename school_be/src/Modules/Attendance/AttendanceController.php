<?php
require_once dirname(__DIR__, 2) . '/Core/Config/Database.php';
require_once dirname(__DIR__, 2) . '/Core/Utils/Response.php';
require_once dirname(__DIR__, 2) . '/Core/Utils/JwtHandler.php';

class AttendanceController {
    private $db;
    private $user;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->user = JwtHandler::validateTokenFromHeader();
    }

    private function requireAuth() {
        if (!$this->user) {
            Response::error('Unauthorized access. Token missing or expired.', 401);
        }
        return $this->user;
    }

    private function requireAdminRole() {
        $user = $this->requireAuth();
        if (!in_array($user['role_id'] ?? '', ['R_SUPERADMIN', 'R_SCHOOLADMIN', 'R_BRANCHADMIN'])) {
            Response::error('Admin privileges required.', 403);
        }
        return $user;
    }

    private function requireDeviceKey() {
        $envPath = dirname(__DIR__, 3) . '/.env';
        $expected = 'CHANGE_ME_DEVICE_KEY';
        if (file_exists($envPath)) {
            foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
                list($k, $v) = explode('=', $line, 2);
                if (trim(strtolower($k)) === 'attendance_device_key') {
                    $expected = trim($v, " \t\n\r\0\x0B\"'");
                    break;
                }
            }
        }
        $given = $_SERVER['HTTP_X_DEVICE_KEY'] ?? ($_GET['device_key'] ?? null);
        if (!$given || !hash_equals($expected, $given)) {
            Response::error('Invalid or missing device key (X-Device-Key header).', 401);
        }
    }

    private function resolveTeacherIdFromJwt($jwtUser) {
        // Prefer the resolved teacher id carried in the JWT (set at login).
        $teacherId = $jwtUser['teacher_id'] ?? $jwtUser['teacherId'] ?? null;
        if ($teacherId) {
            $stmt = $this->db->prepare("SELECT BR_TCHR_ID FROM SCHL_BR_TCHR WHERE BR_TCHR_ID = ? LIMIT 1");
            $stmt->execute([$teacherId]);
            $found = $stmt->fetchColumn();
            if ($found) return $found;
        }

        $userId = $jwtUser['userId'] ?? $jwtUser['user_id'] ?? $jwtUser['id'] ?? null;
        $email  = $jwtUser['email'] ?? $jwtUser['user_email_id'] ?? null;

        $stmt = $this->db->prepare("SELECT BR_TCHR_ID FROM SCHL_BR_TCHR WHERE BR_TCHR_ID = ? OR (BR_TCHR_EMAI_ID = ? AND BR_TCHR_EMAI_ID IS NOT NULL AND BR_TCHR_EMAI_ID != '') LIMIT 1");
        $stmt->execute([$userId, $email]);
        $found = $stmt->fetchColumn();
        if ($found) return $found;

        return $teacherId ?: $userId;
    }

    private function verifyTeacherForSchedule($scheduleId, $loggedInTeacherId) {
        $stmt = $this->db->prepare("SELECT SCHL_BR_TCHR_ID FROM SCHL_CLS_SCHLDL WHERE SCHL_CLS_SCHLDL_ID = ?");
        $stmt->execute([$scheduleId]);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $exists = $stmt->fetch();
        if ($exists === false) {
            Response::error('Class schedule not found: ' . $scheduleId, 404);
        }
        $assignedTeacherId = $exists['SCHL_BR_TCHR_ID'];
        if ($assignedTeacherId && $assignedTeacherId !== $loggedInTeacherId) {
            Response::error('Teacher (' . $loggedInTeacherId . ') is not assigned to this schedule (' . $assignedTeacherId . ').', 403);
        }
    }

    private function upsertStudentAttendance($studentId, $scheduleId, $date, $status, $loggedInTeacherId) {
        $chk = $this->db->prepare(
            "SELECT STU_ATT_ID FROM SCHL_STU_ATT WHERE STU_STU_ID = ? AND STU_ATT_DT = ? AND STU_CLS_SCHLDL_ID = ?"
        );
        $chk->execute([$studentId, $date, $scheduleId]);
        $existingId = $chk->fetchColumn();

        if ($existingId) {
            $u = $this->db->prepare(
                "UPDATE SCHL_STU_ATT SET STU_PRES = ?, STU_TCHR_ID = ? WHERE STU_ATT_ID = ?"
            );
            $u->execute([$status, $loggedInTeacherId, $existingId]);
            return $existingId;
        }

        $attId = strtoupper(uniqid('SATT_'));
        $i = $this->db->prepare(
            "INSERT INTO SCHL_STU_ATT (STU_ATT_ID, STU_STU_ID, STU_CLS_SCHLDL_ID, STU_ATT_DT, STU_PRES, STU_TCHR_ID)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $i->execute([$attId, $studentId, $scheduleId, $date, $status, $loggedInTeacherId]);
        return $attId;
    }

    // ==========================================
    // Student Attendance Endpoints
    // ==========================================

    public function getClassRoster($scheduleId, $date) {
        $user = $this->requireAuth();
        $teacherId = $this->resolveTeacherIdFromJwt($user);
        if (!$teacherId) Response::error('This login is not linked to a Teacher record.', 403);
        if (!$scheduleId) Response::error('schedule_id is required.', 400);

        $this->verifyTeacherForSchedule($scheduleId, $teacherId);

        $stmt = $this->db->prepare("SELECT sch.SCHL_CLS_SCHLDL_SEC_SESS_ID FROM SCHL_CLS_SCHLDL sch WHERE sch.SCHL_CLS_SCHLDL_ID = ?");
        $stmt->execute([$scheduleId]);
        $secSessId = $stmt->fetchColumn();
        if (!$secSessId) Response::error('Class schedule not found or has no section linked.', 404);

        $sql = "SELECT s.STU_ID AS student_id, s.STU_NM AS student_name,
                       COALESCE(a.STU_PRES, 'Not Marked') AS status,
                       a.STU_ATT_ID AS attendance_id
                FROM SCHL_STU s
                LEFT JOIN SCHL_STU_ATT a
                       ON a.STU_STU_ID = s.STU_ID
                      AND a.STU_ATT_DT = ?
                      AND a.STU_CLS_SCHLDL_ID = ?
                WHERE s.STU_BR_CLASS_ID = ?
                ORDER BY s.STU_NM ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$date, $scheduleId, $secSessId]);

        Response::success([
            'schedule_id' => $scheduleId,
            'date' => $date,
            'students' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ], 'Class roster fetched successfully');
    }

    public function markClassAttendance($data) {
        $user = $this->requireAuth();
        $teacherId = $this->resolveTeacherIdFromJwt($user);
        if (!$teacherId) Response::error('This login is not linked to a Teacher record.', 403);

        $scheduleId = $data['schedule_id'] ?? ($data['SCHL_CLS_SCHLDL_ID'] ?? null);
        $date       = $data['date'] ?? ($data['ATT_DT'] ?? date('Y-m-d'));
        $students   = $data['students'] ?? null;

        if (!$scheduleId || empty($students) || !is_array($students)) {
            Response::error('schedule_id and a non-empty students[] array are required.', 400);
        }

        $this->verifyTeacherForSchedule($scheduleId, $teacherId);

        $results = [];
        $this->db->beginTransaction();
        try {
            foreach ($students as $row) {
                $studentId = $row['student_id'] ?? ($row['STU_STU_ID'] ?? null);
                $status    = $row['status'] ?? ($row['STU_PRES'] ?? 'Absent');
                if (!$studentId) continue;

                $attId = $this->upsertStudentAttendance($studentId, $scheduleId, $date, $status, $teacherId);
                $results[] = ['student_id' => $studentId, 'status' => $status, 'attendance_id' => $attId];
            }
            $this->db->commit();
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        Response::success([
            'schedule_id' => $scheduleId,
            'date' => $date,
            'taken_by_teacher_id' => $teacherId,
            'marked_count' => count($results),
            'results' => $results
        ], 'Class attendance recorded successfully.');
    }

    public function markSingleStudentAttendance($data) {
        $user = $this->requireAuth();
        $teacherId = $this->resolveTeacherIdFromJwt($user);
        if (!$teacherId) Response::error('This login is not linked to a Teacher record.', 403);

        $scheduleId = $data['SCHL_CLS_SCHLDL_ID'] ?? ($data['schedule_id'] ?? null);
        $studentId  = $data['STU_STU_ID'] ?? ($data['student_id'] ?? null);
        $date       = $data['ATT_DT'] ?? ($data['date'] ?? date('Y-m-d'));
        $status     = $data['STU_PRES'] ?? ($data['status'] ?? 'Present');

        if (!$scheduleId || !$studentId) {
            Response::error('schedule_id and student_id are required.', 400);
        }

        $this->verifyTeacherForSchedule($scheduleId, $teacherId);
        $attId = $this->upsertStudentAttendance($studentId, $scheduleId, $date, $status, $teacherId);

        Response::success([
            'attendance_id' => $attId,
            'student_id' => $studentId,
            'schedule_id' => $scheduleId,
            'taken_by_teacher_id' => $teacherId,
            'status' => $status,
            'date' => $date
        ], 'Student attendance recorded.');
    }

    // ==========================================
    // Teacher Attendance Endpoints
    // ==========================================

    public function teacherCheckIn($teacherId) {
        $this->requireDeviceKey();
        if (empty($teacherId)) Response::error('teacher_id is required', 400);

        $stmt = $this->db->prepare("SELECT BR_TCHR_ID, BR_TCHR_NM, BR_TCHR_BR_ID FROM SCHL_BR_TCHR WHERE BR_TCHR_ID = ?");
        $stmt->execute([$teacherId]);
        $teacher = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$teacher) Response::error('Teacher not found: ' . $teacherId, 404);

        $stmt = $this->db->prepare(
            "SELECT TCHR_TIME_ID FROM SCHL_TCHR_TIME_DTLS
             WHERE TCHR_ID = ? AND TCHR_OUT_TIME IS NULL
             ORDER BY TCHR_IN_TIME DESC LIMIT 1"
        );
        $stmt->execute([$teacherId]);
        if ($stmt->fetchColumn()) {
            Response::error('Active open check-in already exists. Checkout before checking in again.', 409);
        }

        $timeId = strtoupper(uniqid('TTIME_'));
        $now = date('Y-m-d H:i:s');
        $ins = $this->db->prepare(
            "INSERT INTO SCHL_TCHR_TIME_DTLS (TCHR_TIME_ID, TCHR_ID, TCHR_IN_TIME, TCHR_REMARKS)
             VALUES (?, ?, ?, 'Punch IN via device')"
        );
        $ins->execute([$timeId, $teacherId, $now]);

        Response::success([
            'time_id' => $timeId,
            'teacher_id' => $teacherId,
            'teacher_name' => $teacher['BR_TCHR_NM'],
            'check_in_time' => $now
        ], 'Check-in recorded successfully.');
    }

    public function teacherCheckOut($teacherId) {
        $this->requireDeviceKey();
        if (empty($teacherId)) Response::error('teacher_id is required', 400);

        $stmt = $this->db->prepare(
            "SELECT TCHR_TIME_ID, TCHR_IN_TIME FROM SCHL_TCHR_TIME_DTLS
             WHERE TCHR_ID = ? AND TCHR_OUT_TIME IS NULL
             ORDER BY TCHR_IN_TIME DESC LIMIT 1"
        );
        $stmt->execute([$teacherId]);
        $open = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$open) {
            Response::error('No active check-in found for this teacher.', 404);
        }

        $now = date('Y-m-d H:i:s');
        $u = $this->db->prepare(
            "UPDATE SCHL_TCHR_TIME_DTLS
             SET TCHR_OUT_TIME = ?,
                 TCHR_REMARKS = CONCAT(COALESCE(TCHR_REMARKS, ''), ' | Punch OUT via device')
             WHERE TCHR_TIME_ID = ?"
        );
        $u->execute([$now, $open['TCHR_TIME_ID']]);

        $durationMinutes = round((strtotime($now) - strtotime($open['TCHR_IN_TIME'])) / 60);

        Response::success([
            'time_id' => $open['TCHR_TIME_ID'],
            'teacher_id' => $teacherId,
            'check_in_time' => $open['TCHR_IN_TIME'],
            'check_out_time' => $now,
            'duration_minutes' => $durationMinutes
        ], 'Check-out recorded successfully.');
    }

    public function getTeacherSummary($date, $branchId = null) {
        $this->requireAuth();
        $date = $date ?: date('Y-m-d');

        $sql = "SELECT tc.BR_TCHR_ID AS teacher_id, tc.BR_TCHR_NM AS teacher_name,
                       tc.BR_TCHR_CONTACT_NO AS contact_no, b.SCHL_BR_NM AS branch_name,
                       att.TCHR_PRES AS status, att.TCHR_TOTAL_HRS AS total_hours,
                       att.TCHR_ATT_ID AS attendance_id
                FROM SCHL_BR_TCHR tc
                JOIN SCHL_BRANCH b ON tc.BR_TCHR_BR_ID = b.SCHL_BR_ID
                LEFT JOIN SCHL_TCHR_ATT att
                       ON att.TCHR_TCHR_ID = tc.BR_TCHR_ID
                      AND att.TCHR_ATT_DT = ?
                WHERE 1=1";
        $params = [$date];

        if ($branchId) {
            $sql .= " AND tc.BR_TCHR_BR_ID = ?";
            $params[] = $branchId;
        }

        $sql .= " ORDER BY tc.BR_TCHR_NM ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $counts = ['Present' => 0, 'Half-Day' => 0, 'Absent' => 0, 'Not Evaluated' => 0];
        foreach ($rows as $r) {
            $status = $r['status'] ?: 'Not Evaluated';
            if (isset($counts[$status])) $counts[$status]++;
            else $counts['Not Evaluated']++;
        }

        Response::success([
            'date' => $date,
            'branch_id' => $branchId,
            'summary' => $counts,
            'teachers' => $rows
        ], 'Teacher attendance summary');
    }

    public function runTeacherBatch($targetDate = null) {
        $this->requireAdminRole();
        $targetDate = $targetDate ?: date('Y-m-d', strtotime('-1 day'));

        $sql = "SELECT DISTINCT TCHR_ID FROM SCHL_TCHR_TIME_DTLS
                WHERE DATE(TCHR_IN_TIME) = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$targetDate]);
        $teacherIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $processed = 0;
        foreach ($teacherIds as $tId) {
            $pSql = "SELECT TCHR_IN_TIME, TCHR_OUT_TIME FROM SCHL_TCHR_TIME_DTLS
                     WHERE TCHR_ID = ? AND DATE(TCHR_IN_TIME) = ? AND TCHR_OUT_TIME IS NOT NULL";
            $pStmt = $this->db->prepare($pSql);
            $pStmt->execute([$tId, $targetDate]);
            $punches = $pStmt->fetchAll(PDO::FETCH_ASSOC);

            $totalSeconds = 0;
            foreach ($punches as $p) {
                $in = strtotime($p['TCHR_IN_TIME']);
                $out = strtotime($p['TCHR_OUT_TIME']);
                if ($out > $in) $totalSeconds += ($out - $in);
            }
            $totalHours = round($totalSeconds / 3600, 2);

            $status = 'Absent';
            if ($totalHours >= 6.0) $status = 'Present';
            elseif ($totalHours >= 3.0) $status = 'Half-Day';

            $chk = $this->db->prepare("SELECT TCHR_ATT_ID FROM SCHL_TCHR_ATT WHERE TCHR_TCHR_ID = ? AND TCHR_ATT_DT = ?");
            $chk->execute([$tId, $targetDate]);
            $existingId = $chk->fetchColumn();

            if ($existingId) {
                $u = $this->db->prepare("UPDATE SCHL_TCHR_ATT SET TCHR_PRES = ?, TCHR_TOTAL_HRS = ? WHERE TCHR_ATT_ID = ?");
                $u->execute([$status, $totalHours, $existingId]);
            } else {
                $attId = strtoupper(uniqid('TATT_'));
                $i = $this->db->prepare("INSERT INTO SCHL_TCHR_ATT (TCHR_ATT_ID, TCHR_TCHR_ID, TCHR_ATT_DT, TCHR_PRES, TCHR_TOTAL_HRS) VALUES (?, ?, ?, ?, ?)");
                $i->execute([$attId, $tId, $targetDate, $status, $totalHours]);
            }
            $processed++;
        }

        Response::success([
            'date' => $targetDate,
            'processed_count' => $processed
        ], 'Batch calculation completed successfully.');
    }
}
