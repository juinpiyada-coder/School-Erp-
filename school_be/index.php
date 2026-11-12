<?php
// Front Controller

// Production Security & Environment Setup
// Hide errors from output to prevent JSON corruption and leaking sensitive paths
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-error.log');

// Universal support for standalone PHP CLI development server (e.g., php -S localhost:8000 index.php)
if (php_sapi_name() === 'cli-server') {
    $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $file = __DIR__ . $url;
    if ($url !== '/' && is_file($file)) {
        return false; // Let PHP built-in server serve static resources directly
    }
}

// Support CORS securely (loaded dynamically from environment, no hardcoded domains)
$envPath = __DIR__ . '/.env';
$allowedOrigins = [];
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($k, $v) = explode('=', $line, 2);
            if (trim($k) === 'CORS_ALLOWED_ORIGINS') {
                $rawOrigins = explode(',', trim($v));
                foreach ($rawOrigins as $o) {
                    $trimmed = trim($o, " \t\n\r\0\x0B\"'");
                    if ($trimmed !== '') {
                        $allowedOrigins[] = $trimmed;
                    }
                }
            }
        }
    }
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($origin) && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: " . $origin);
} elseif (empty($allowedOrigins)) {
    // If not configured, allow matching request origin in development or restrict
    header("Access-Control-Allow-Origin: " . ($origin ?: "*"));
}

header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Autoloader for classes
spl_autoload_register(function ($class) {
    $paths = [
        'Database' => __DIR__ . '/src/Core/Config/Database.php',
        'Response' => __DIR__ . '/src/Core/Utils/Response.php',
        'JwtHandler' => __DIR__ . '/src/Core/Utils/JwtHandler.php',
        'RateLimiter' => __DIR__ . '/src/Core/Utils/RateLimiter.php',
        'AuthController' => __DIR__ . '/src/Modules/Auth/AuthController.php',
        'BranchController' => __DIR__ . '/src/Modules/Academic/BranchController.php',
        'StaffController' => __DIR__ . '/src/Modules/Staff/StaffController.php',
        'StudentController' => __DIR__ . '/src/Modules/Student/StudentController.php',
        'DashboardController' => __DIR__ . '/src/Modules/Dashboard/DashboardController.php',
        'AttendanceController' => __DIR__ . '/src/Modules/Attendance/AttendanceController.php',
        'NotificationController' => __DIR__ . '/src/Modules/Notification/NotificationController.php',
        'NotificationModel' => __DIR__ . '/src/Modules/Notification/NotificationModel.php',
    ];

    if (isset($paths[$class]) && file_exists($paths[$class])) {
        require_once $paths[$class];
        return;
    }

    $directories = [
        __DIR__ . '/src/Modules/Auth',
        __DIR__ . '/src/Modules/Academic',
        __DIR__ . '/src/Modules/Staff',
        __DIR__ . '/src/Modules/Student',
        __DIR__ . '/src/Modules/Notification',
    ];

    foreach ($directories as $dir) {
        $file = $dir . '/' . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

// Parse request
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Extract /api prefix directly to guarantee consistent routing across XAMPP Apache, Builtin CLI Server, and production Nginx
$apiPos = strpos($requestUri, '/api');
if ($apiPos !== false) {
    $routePath = rtrim(substr($requestUri, $apiPos), '/');
} else {
    // Strip script directory prefix if running in a subdirectory without /api in the path
    if (php_sapi_name() !== 'cli-server') {
        $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
        if ($scriptDir !== '/' && $scriptDir !== '.' && strpos($requestUri, $scriptDir) === 0) {
            $requestUri = substr($requestUri, strlen($scriptDir));
        }
    }
    $routePath = rtrim($requestUri, '/');
}

// Support root route response
if ($routePath === '' || $routePath === '/') {
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode([
        "status" => "success",
        "message" => "School ERP API Gateway is running.",
        "endpoints" => [
            "auth" => [
                "roles" => "/api/auth/roles",
                "role_links" => "/api/auth/role-links",
                "users" => "/api/auth/users",
                "school" => "/api/auth/school"
            ],
            "student" => [
                "parents" => "/api/student/parents",
                "students" => "/api/student/students",
                "schedules" => "/api/student/schedules",
                "attendance" => "/api/student/attendance"
            ],
            "notifications" => [
                "list" => "/api/notifications",
                "detail" => "/api/notifications/{id}",
                "add_detail" => "/api/notifications/{id}/details",
                "update_detail" => "/api/notifications/details/{detailId}",
                "image" => "/api/notifications/details/{detailId}/image"
            ]
        ]
    ]);
    exit;
}

// Route to appropriate handler
if (strpos($routePath, '/api/auth/') === 0) {
    require_once __DIR__ . '/src/Core/Routes/api_auth.php';
} elseif (strpos($routePath, '/api/dashboard/') === 0) {
    require_once __DIR__ . '/src/Core/Routes/api_dashboard.php';
} elseif (strpos($routePath, '/api/reports/') === 0) {
    require_once __DIR__ . '/src/Core/Routes/api_reports.php';
} elseif (strpos($routePath, '/api/settings/') === 0) {
    require_once __DIR__ . '/src/Core/Routes/api_settings.php';
} elseif (strpos($routePath, '/api/academic/') === 0) {
    $id = null;
    $pathParts = explode('/', $routePath);
    $resources = ['boards', 'branches', 'classes', 'rooms', 'sessions', 'timetable', 'subjects', 'matrix', 'matrices'];
    
    if (count($pathParts) > 3) {
        $lastPart = end($pathParts);
        $prevPart = $pathParts[count($pathParts) - 2];
        
        // Special case for /api/academic/timetable/entry/:id
        if ($prevPart === 'entry' && isset($pathParts[count($pathParts) - 3]) && $pathParts[count($pathParts) - 3] === 'timetable') {
            $id = $lastPart;
            array_pop($pathParts); // pop ID
            $routePath = implode('/', $pathParts); // /api/academic/timetable/entry
        } elseif (in_array($prevPart, $resources)) {
            $id = $lastPart;
            array_pop($pathParts);
            $routePath = implode('/', $pathParts);
        }
    }

    if ($id === null && isset($_GET['id'])) {
        $id = $_GET['id'];
    }

    $inputJson = file_get_contents('php://input');
    $data = json_decode($inputJson, true) ?: [];

    if ($method === 'GET') {
        $data = array_merge($data, $_GET);
    }

    require_once __DIR__ . '/src/Core/Routes/api_academic.php';
    $handled = routeAcademicApi($routePath, $method, $id, $data);

    if (!$handled) {
        header("Content-Type: application/json; charset=utf-8");
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "API Route not found: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']
        ]);
        exit;
    }
} elseif (strpos($routePath, '/api/staff/') === 0) {
    $id = null;
    $pathParts = explode('/', $routePath);
    $resources = ['teachers', 'subjects', 'mappings', 'attendance'];
    if (count($pathParts) > 3) {
        $lastPart = end($pathParts);
        $prevPart = $pathParts[count($pathParts) - 2];
        if (in_array($prevPart, $resources)) {
            $id = $lastPart;
            array_pop($pathParts);
            $routePath = implode('/', $pathParts);
        }
    }

    if ($id === null && isset($_GET['id'])) {
        $id = $_GET['id'];
    }

    $inputJson = file_get_contents('php://input');
    $data = json_decode($inputJson, true) ?: [];

    if ($method === 'GET') {
        $data = array_merge($data, $_GET);
    }

    require_once __DIR__ . '/src/Core/Routes/api_staff.php';
    $handled = routeStaffApi($routePath, $method, $id, $data);

    if (!$handled) {
        header("Content-Type: application/json; charset=utf-8");
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "API Route not found: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']
        ]);
        exit;
    }
} elseif (strpos($routePath, '/api/student/') === 0) {
    // Extract ID from path if present (e.g., /api/student/parents/123)
    $id = null;
    $pathParts = explode('/', $routePath);
    $resources = ['parents', 'students', 'schedules', 'attendance', 'wards', 'routine', 'class-completion', 'subject-attendance', 'fees-report', 'profile'];
    if (count($pathParts) > 3) {
        $lastPart = end($pathParts);
        $prevPart = $pathParts[count($pathParts) - 2];
        if (in_array($prevPart, $resources)) {
            $id = $lastPart;
            array_pop($pathParts);
            $routePath = implode('/', $pathParts);
        }
    }

    // Fallback to query parameter ID if not in path
    if ($id === null && isset($_GET['id'])) {
        $id = $_GET['id'];
    }

    // Read raw body input
    $inputJson = file_get_contents('php://input');
    $data = json_decode($inputJson, true) ?: [];

    // Merge query parameters for GET requests
    if ($method === 'GET') {
        $data = array_merge($data, $_GET);
    }

    // Dispatch to student API module
    require_once __DIR__ . '/src/Core/Routes/api_student.php';
    $handled = routeStudentApi($routePath, $method, $id, $data);

    if (!$handled) {
        header("Content-Type: application/json; charset=utf-8");
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "API Route not found: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']
        ]);
        exit;
    }
} elseif (strpos($routePath, '/api/attendance/') === 0) {
    $id = null;
    $inputJson = file_get_contents('php://input');
    $data = json_decode($inputJson, true) ?: [];

    if ($method === 'GET') {
        $data = array_merge($data, $_GET);
    }

    require_once __DIR__ . '/src/Core/Routes/api_attendance.php';
    $handled = routeAttendanceApi($routePath, $method, $id, $data);

    if (!$handled) {
        header("Content-Type: application/json; charset=utf-8");
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "API Route not found: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']
        ]);
        exit;
    }
} elseif (strpos($routePath, '/api/notifications') === 0 || strpos($routePath, '/api/notification') === 0) {
    $id = null;
    $inputJson = file_get_contents('php://input');
    $data = json_decode($inputJson, true) ?: [];

    if ($method === 'GET') {
        $data = array_merge($data, $_GET);
    }

    require_once __DIR__ . '/src/Core/Routes/api_notification.php';
    $handled = routeNotificationApi($routePath, $method, $id, $data);

    if (!$handled) {
        header("Content-Type: application/json; charset=utf-8");
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "API Route not found: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']
        ]);
        exit;
    }
} else {
    Response::error("Endpoint Not Found", 404);
}