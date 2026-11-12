<?php

require_once dirname(__DIR__, 2) . '/Modules/Academic/AcademicController.php';

function routeAcademicApi($uriPath, $method, $id, $data) {
    $controller = new AcademicController();

    switch ($uriPath) {
        case '/api/academic/schools':
        case '/api/academic/school':
            require_once dirname(__DIR__, 2) . '/Modules/Auth/AuthController.php';
            $authController = new AuthController();
            if ($method === 'GET') {
                if ($id) {
                    $authController->getSchool($id);
                } else {
                    $authController->getSchools();
                }
            } elseif ($method === 'POST') {
                $authController->createSchool();
            } elseif ($method === 'PUT') {
                $authController->updateSchool($id);
            } elseif ($method === 'DELETE') {
                $authController->deleteSchool($id);
            } else {
                Response::error("Method Not Allowed", 405);
            }
            break;
        case '/api/academic/boards':
            $controller->handleBoards($method, $id, $data);
            break;
        case '/api/academic/branches':
            $controller->handleBranches($method, $id, $data);
            break;
        case '/api/academic/rooms':
            $controller->handleRooms($method, $id, $data);
            break;
        case '/api/academic/room-categories':
            $controller->handleRoomCategories($method, $id, $data);
            break;
        case '/api/academic/classes':
            $controller->handleClasses($method, $id, $data);
            break;
        case '/api/academic/sessions':
            $controller->handleSessions($method, $id, $data);
            break;
        case '/api/academic/timetable':
        case '/api/academic/timetable/entry':
            $controller->handleTimetable($method, $id, $data);
            break;
        case '/api/academic/subjects':
            $controller->handleSubjects($method, $id, $data);
            break;
        case '/api/academic/matrix':
        case '/api/academic/matrices':
            $controller->handleMatrix($method, $id, $data);
            break;
        default:
            return false; // Not handled here
    }
    return true;
}