<?php
// Attendance API Router for student roster & tick attendance and teacher punch/biometric attendance

function routeAttendanceApi($uriPath, $method, $id, $data) {
    $controller = new AttendanceController();

    switch ($uriPath) {
        // --- Student Attendance ---
        case '/api/attendance/student/roster':
            if ($method !== 'GET') Response::error('Method not allowed', 405);
            $scheduleId = $_GET['schedule_id'] ?? ($data['schedule_id'] ?? null);
            $date = $_GET['date'] ?? ($data['date'] ?? date('Y-m-d'));
            $controller->getClassRoster($scheduleId, $date);
            return true;

        case '/api/attendance/student/mark-class':
            if ($method !== 'POST') Response::error('Method not allowed', 405);
            $controller->markClassAttendance($data);
            return true;

        case '/api/attendance/student/mark':
            if ($method !== 'POST') Response::error('Method not allowed', 405);
            $controller->markSingleStudentAttendance($data);
            return true;

        // --- Teacher Attendance ---
        case '/api/attendance/teachers/me':
        case '/api/attendance/teacher/me':
            if ($method !== 'GET') Response::error('Method not allowed', 405);
            require_once dirname(__DIR__, 2) . '/Modules/Staff/StaffController.php';
            $staffController = new StaffController();
            $staffController->handleAttendance('GET', 'me', $data);
            return true;

        case '/api/attendance/teacher/checkin':
            if ($method !== 'POST') Response::error('Method not allowed', 405);
            $teacherId = $data['teacher_id'] ?? ($_GET['teacher_id'] ?? null);
            $controller->teacherCheckIn($teacherId);
            return true;

        case '/api/attendance/teacher/checkout':
            if ($method !== 'POST') Response::error('Method not allowed', 405);
            $teacherId = $data['teacher_id'] ?? ($_GET['teacher_id'] ?? null);
            $controller->teacherCheckOut($teacherId);
            return true;

        case '/api/attendance/teacher/summary':
            if ($method !== 'GET') Response::error('Method not allowed', 405);
            $date = $_GET['date'] ?? ($data['date'] ?? null);
            $branchId = $_GET['branch_id'] ?? ($data['branch_id'] ?? null);
            $controller->getTeacherSummary($date, $branchId);
            return true;

        case '/api/attendance/teacher/batch':
            if ($method !== 'POST') Response::error('Method not allowed', 405);
            $date = $data['date'] ?? ($_GET['date'] ?? null);
            $controller->runTeacherBatch($date);
            return true;

        default:
            return false;
    }
}
