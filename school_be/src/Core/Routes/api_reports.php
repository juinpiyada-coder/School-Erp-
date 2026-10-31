<?php
require_once dirname(__DIR__, 2) . '/Modules/Reports/ReportsController.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$apiPos = strpos($uri, '/api');
if ($apiPos !== false) {
    $uri = substr($uri, $apiPos);
}

$controller = new ReportsController();

if (preg_match('#^/api/reports/overview/?$#', $uri)) {
    if ($method === 'GET') {
        $controller->getOverview();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/reports/students-by-branch/?$#', $uri)) {
    if ($method === 'GET') {
        $controller->getStudentsByBranch();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/reports/teachers-by-branch/?$#', $uri)) {
    if ($method === 'GET') {
        $controller->getTeachersByBranch();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} else {
    Response::error("Endpoint Not Found", 404);
}
