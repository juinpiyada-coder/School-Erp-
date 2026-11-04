<?php

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$apiPos = strpos($uri, '/api');
if ($apiPos !== false) {
    $uri = substr($uri, $apiPos);
}

$controller = new DashboardController();

if (preg_match('#^/api/dashboard/overview/?$#', $uri)) {
    if ($method === 'GET') {
        $controller->getOverview();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} else {
    Response::error("Endpoint Not Found", 404);
}
