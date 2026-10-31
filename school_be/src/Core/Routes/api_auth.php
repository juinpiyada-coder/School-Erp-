<?php

require_once dirname(__DIR__, 2) . '/Core/Utils/Response.php';
require_once dirname(__DIR__, 2) . '/Core/Utils/JwtHandler.php';
require_once dirname(__DIR__, 2) . '/Modules/Auth/AuthController.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$apiPos = strpos($uri, '/api');
if ($apiPos !== false) {
    $uri = substr($uri, $apiPos);
}

// Enforce JWT authentication on all protected auth routes.
// Only /api/auth/login and /api/auth/logout are permitted without a valid JWT token.
$isPublicRoute = preg_match('#^/api/auth/(login|logout)/?$#', $uri);
if (!$isPublicRoute) {
    $jwtUser = JwtHandler::validateTokenFromHeader();
    if (!$jwtUser) {
        Response::error("Unauthorized access. Token missing or expired.", 401);
        exit;
    }
}

$controller = new AuthController();

if (preg_match('#^/api/auth/login/?$#', $uri)) {
    if ($method === 'POST') {
        $controller->login();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/logout/?$#', $uri)) {
    if ($method === 'POST') {
        $controller->logout();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/refresh/?$#', $uri)) {
    if ($method === 'POST') {
        $controller->refreshToken();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/(me|profile)/?$#', $uri)) {
    if ($method === 'GET') {
        $controller->me();
    } elseif ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
        $controller->updateProfile();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/change-password/?$#', $uri)) {
    if ($method === 'POST') {
        $controller->changePassword();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/roles/assign/?$#', $uri)) {
    if ($method === 'POST') {
        $controller->assignRole();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/roles/?$#', $uri)) {
    if ($method === 'GET') {
        $controller->getRoles();
    } elseif ($method === 'POST') {
        $controller->createRole();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/roles/([^/]+)/links/?$#', $uri, $matches)) {
    $roleId = urldecode($matches[1]);
    if ($method === 'GET') {
        $controller->getRoleLinksByRole($roleId);
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/roles/([^/]+)$#', $uri, $matches)) {
    $id = urldecode($matches[1]);
    if ($method === 'GET') {
        $controller->getRole($id);
    } elseif ($method === 'PUT') {
        $controller->updateRole($id);
    } elseif ($method === 'DELETE') {
        $controller->deleteRole($id);
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/role-links/?$#', $uri)) {
    if ($method === 'GET') {
        $controller->getRoleLinks();
    } elseif ($method === 'POST') {
        $controller->createRoleLink();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/role-links/([^/]+)/toggle-status/?$#', $uri, $matches)) {
    $id = urldecode($matches[1]);
    if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
        $controller->toggleRoleLinkStatus($id);
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/role-links/([^/]+)$#', $uri, $matches)) {
    $id = urldecode($matches[1]);
    if ($method === 'GET') {
        $controller->getRoleLink($id);
    } elseif ($method === 'PUT') {
        $controller->updateRoleLink($id);
    } elseif ($method === 'DELETE') {
        $controller->deleteRoleLink($id);
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/users/?$#', $uri)) {
    if ($method === 'GET') {
        $controller->getUsers();
    } elseif ($method === 'POST') {
        $controller->createUser();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/users/([^/]+)$#', $uri, $matches)) {
    $id = urldecode($matches[1]);
    if ($method === 'GET') {
        $controller->getUser($id);
    } elseif ($method === 'PUT') {
        $controller->updateUser($id);
    } elseif ($method === 'DELETE') {
        $controller->deleteUser($id);
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/schools?/?$#', $uri)) {
    if ($method === 'GET') {
        $controller->getSchools();
    } elseif ($method === 'POST') {
        $controller->createSchool();
    } else {
        Response::error("Method Not Allowed", 405);
    }
} elseif (preg_match('#^/api/auth/schools?/([^/]+)$#', $uri, $matches)) {
    $id = urldecode($matches[1]);
    if ($method === 'GET') {
        $controller->getSchool($id);
    } elseif ($method === 'PUT') {
        $controller->updateSchool($id);
    } elseif ($method === 'DELETE') {
        $controller->deleteSchool($id);
    } else {
        Response::error("Method Not Allowed", 405);
    }
} else {
    Response::error("Endpoint Not Found", 404);
}