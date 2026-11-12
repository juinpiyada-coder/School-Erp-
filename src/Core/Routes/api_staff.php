<?php
// APIs: SCHL_BR_TCHR, SCHL_BR_CLS_SUBJECT, SCHL_TCHR_SUB, SCHL_TCHR_ATT, SCHL_TCHR_TIME_DTLS



function routeStaffApi($uriPath, $method, $id, $data) {
    $controller = new StaffController();

    switch ($uriPath) {
        case '/api/staff/teachers':
            $controller->handleTeachers($method, $id, $data);
            break;
        case '/api/staff/subjects':
            $controller->handleSubjects($method, $id, $data);
            break;
        case '/api/staff/mappings':
            $controller->handleMappings($method, $id, $data);
            break;
        case '/api/staff/attendance':
            $controller->handleAttendance($method, $id, $data);
            break;
        default:
            return false; // Not handled here
    }
    return true;
}
