<?php
require_once dirname(__DIR__, 2) . '/Modules/Settings/SettingsController.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$apiPos = strpos($uri, '/api');
if ($apiPos !== false) {
    $uri = substr($uri, $apiPos);
}

$controller = new SettingsController();

if (preg_match('#^/api/settings/whitelabel/?$#', $uri)) {
    if ($method === 'GET') {
        $controller->getWhiteLabel();
    } elseif ($method === 'POST' || $method === 'PUT') {
        $controller->updateWhiteLabel();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} else {
    Response::error("Endpoint Not Found", 404);
}
