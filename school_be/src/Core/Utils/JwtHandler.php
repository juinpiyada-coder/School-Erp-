<?php

class JwtHandler {
    private static function getEnvVar($key, $default) {
        $envPath = dirname(dirname(dirname(__DIR__))) . '/.env';
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0) {
                    continue;
                }
                if (strpos($line, '=') !== false) {
                    list($k, $v) = explode('=', $line, 2);
                    if (trim($k) === $key) {
                        return trim($v);
                    }
                }
            }
        }
        return $default;
    }

    public static function generateToken($payload) {
        $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
        
        $expiresIn = (int) self::getEnvVar('JWT_EXPIRES_IN', 480);
        $payload['exp'] = time() + ($expiresIn * 60);

        $payloadStr = json_encode($payload);
        
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payloadStr));
        
        $secret = self::getEnvVar('JWT_SECRET', 'premium_school_erp_secret_key_2026');
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function validateToken($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }
        
        list($headerB64, $payloadB64, $signatureB64) = $parts;
        $secret = self::getEnvVar('JWT_SECRET', 'premium_school_erp_secret_key_2026');
        
        $signature = hash_hmac('sha256', $headerB64 . "." . $payloadB64, $secret, true);
        $expectedSignatureB64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        if (hash_equals($expectedSignatureB64, $signatureB64)) {
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payloadB64)), true);
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return false; // Token expired
            }
            return $payload;
        }
        
        return false;
    }

    public static function validateTokenFromHeader() {
        $authHeader = null;

        // Fetch auth header across different PHP environments
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        } elseif (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (!empty($headers['Authorization'])) {
                $authHeader = $headers['Authorization'];
            } elseif (!empty($headers['authorization'])) {
                $authHeader = $headers['authorization'];
            }
        } elseif (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (!empty($headers['Authorization'])) {
                $authHeader = $headers['Authorization'];
            } elseif (!empty($headers['authorization'])) {
                $authHeader = $headers['authorization'];
            }
        }

        if ($authHeader) {
            if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
                $token = $matches[1];
                $payload = self::validateToken($token);
                if ($payload) {
                    return $payload;
                }
            }
        }

        // Return false if token is missing or invalid, not a mock payload
        return false;
    }
}
