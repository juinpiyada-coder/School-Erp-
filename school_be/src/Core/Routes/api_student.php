<?php
// APIs: SCHL_MSTR_PRNT, SCHL_STU, SCHL_CLS_SCHLDL, SCHL_STU_ATT



function routeStudentApi($uriPath, $method, $id, $data) {
    $controller = new StudentController();

    switch ($uriPath) {
        case '/api/student/parents':
            $controller->handleParents($method, $id, $data);
            break;
        case '/api/student/students':
            $controller->handleStudents($method, $id, $data);
            break;
        case '/api/student/schedules':
            $controller->handleSchedules($method, $id, $data);
            break;
        case '/api/student/attendance':
            $controller->handleAttendance($method, $id, $data);
            break;
        case '/api/student/wards':
            $controller->handleWards($method, $id, $data);
            break;
        case '/api/student/routine':
            $controller->handleDailyRoutine($method, $id, $data);
            break;
        case '/api/student/profile':
            $controller->handleStudentProfile($method, $id, $data);
            break;
        case '/api/student/class-completion':
            $controller->handleClassCompletion($method, $id, $data);
            break;
        case '/api/student/subject-attendance':
            $controller->handleSubjectAttendance($method, $id, $data);
            break;
        case '/api/student/fees-report':
            $controller->handleFeesReport($method, $id, $data);
            break;
        default:
            return false; // Not handled here
    }
    return true;
}