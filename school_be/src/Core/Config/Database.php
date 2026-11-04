<?php
// DB connection setup

class Database {
    private static $conn = null;

    public static function getConnection() {
        if (self::$conn === null) {
            $dbHost = null;
            $dbName = null;
            $dbUser = null;
            $dbPass = null;
            $dbPort = '3306';
            $dbType = 'mysql';

            $envPath = dirname(dirname(dirname(__DIR__))) . '/.env';
            if (file_exists($envPath)) {
                $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line === '' || strpos($line, '#') === 0) {
                        continue;
                    }
                    if (strpos($line, '=') !== false) {
                        list($key, $value) = explode('=', $line, 2);
                        $key = trim(strtolower($key));
                        $value = trim($value, " \t\n\r\0\x0B\"'");
                        
                        if ($key === 'db_host') $dbHost = $value;
                        if ($key === 'db_name') $dbName = $value;
                        if ($key === 'db_user') $dbUser = $value;
                        if ($key === 'db_pass' || $key === 'db_password') $dbPass = $value;
                        if ($key === 'db_port') $dbPort = $value;
                        if ($key === 'db_type') $dbType = strtolower($value);
                    }
                }
            }

            // Fallback default values for local development if not provided
            $dbHost = $dbHost !== null && $dbHost !== '' ? $dbHost : '127.0.0.1';
            $dbName = $dbName !== null ? $dbName : 'sms_db';
            $dbUser = $dbUser !== null ? $dbUser : 'root';
            $dbPass = $dbPass !== null ? $dbPass : '';

            try {
                if ($dbType === 'sqlite') {
                    $dbFile = dirname(__DIR__) . '/school.db';
                    $isNew = !file_exists($dbFile);
                    self::$conn = new PDO("sqlite:" . $dbFile);
                    self::$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    self::$conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                    
                    // Enable Foreign Key support in SQLite
                    self::$conn->exec("PRAGMA foreign_keys = ON;");

                    if ($isNew) {
                        self::initializeSchema();
                    }
                } else {
                    $hostsToTry = array_unique([$dbHost, ($dbHost === 'localhost' ? '127.0.0.1' : 'localhost')]);
                    $credsToTry = [
                        ['user' => $dbUser, 'pass' => $dbPass]
                    ];
                    if (in_array($dbHost, ['localhost', '127.0.0.1'])) {
                        // Order matters: Try default XAMPP root with blank pass first before custom attempts
                        $credsToTry[] = ['user' => 'root', 'pass' => ''];
                        $credsToTry[] = ['user' => 'root', 'pass' => 'root'];
                        $credsToTry[] = ['user' => 'root', 'pass' => 'admin'];
                        $credsToTry[] = ['user' => 'admin', 'pass' => 'admin'];
                    }
                    
                    $lastException = null;
                    $connected = false;

                    // Step 1: Attempt direct connection to database with configured credentials
                    try {
                        $dsn = "mysql:host=$dbHost;port=$dbPort;dbname=$dbName;charset=utf8mb4";
                        self::$conn = new PDO($dsn, $dbUser, $dbPass);
                        self::$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                        self::$conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                        $connected = true;
                    } catch (PDOException $directEx) {
                        $lastException = $directEx;
                    }

                    // Step 2: If direct connection failed, attempt local fallbacks (for local dev/XAMPP environments)
                    if (!$connected) {
                        foreach ($hostsToTry as $host) {
                            foreach ($credsToTry as $creds) {
                                try {
                                    $dsnNoDb = "mysql:host=$host;port=$dbPort;charset=utf8mb4";
                                    $tempConn = new PDO($dsnNoDb, $creds['user'], $creds['pass']);
                                    $tempConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                                    
                                    try {
                                        $tempConn->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                                    } catch (Exception $e) {}
                                    
                                    $dsn = "mysql:host=$host;port=$dbPort;dbname=$dbName;charset=utf8mb4";
                                    self::$conn = new PDO($dsn, $creds['user'], $creds['pass']);
                                    self::$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                                    self::$conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                                    
                                    $connected = true;
                                    break 2;
                                } catch (PDOException $ex) {
                                    $lastException = $ex;
                                }
                            }
                        }
                    }

                    if (!$connected && $lastException !== null) {
                        throw $lastException;
                    }

                    // Step 4: Check if tables exist; if not, automatically initialize schema and demo users from main.sql
                    try {
                        self::$conn->query("SELECT 1 FROM SM_USER_LOGIN LIMIT 1");
                    } catch (PDOException $tableEx) {
                        self::initializeMysqlSchema();
                    }
                }
            } catch (PDOException $e) {
                http_response_code(500);
                // Production-safe error message: Do not leak Host, DB name, or raw PDO error messages
                echo json_encode([
                    "status" => "error",
                    "message" => "Database connection failed. Please contact the system administrator."
                ]);
                // Log the actual error internally (if logging is configured)
                error_log("Database connection error: " . $e->getMessage());
                exit;
            }
        }
        return self::$conn;
    }

    private static function initializeMysqlSchema() {
        $root = dirname(dirname(dirname(__DIR__)));
        $sqlPath = file_exists($root . '/sms_db.sql') ? $root . '/sms_db.sql' : $root . '/database/main.sql';
        if (file_exists($sqlPath)) {
            $sql = file_get_contents($sqlPath);
            if (!empty(trim($sql))) {
                try {
                    self::$conn->exec($sql);
                } catch (Exception $e) {
                    try {
                        $statements = explode(';', $sql);
                        foreach ($statements as $stmt) {
                            $stmt = trim($stmt);
                            if (!empty($stmt)) {
                                self::$conn->exec($stmt);
                            }
                        }
                    } catch (Exception $ex) {}
                }
            }
        }
    }

    private static function initializeSchema() {
        $schemaPath = dirname(__DIR__) . '/shema.md';
        if (file_exists($schemaPath)) {
            $sql = file_get_contents($schemaPath);
            if (!empty(trim($sql))) {
                // Execute the SQL queries
                self::$conn->exec($sql);
            }
        }
    }
}
