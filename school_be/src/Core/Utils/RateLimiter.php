<?php

class RateLimiter {
    private static $storageDir = null;

    private static function getStorageDir() {
        if (self::$storageDir === null) {
            self::$storageDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'school_erp_rate_limit';
            if (!is_dir(self::$storageDir)) {
                @mkdir(self::$storageDir, 0777, true);
            }
        }
        return self::$storageDir;
    }

    private static function getClientIp() {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($parts[0]);
        }
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        }
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }

    /**
     * Check if a key has exceeded max requests within window
     * 
     * @param string $action Action key e.g. 'bulk_upload'
     * @param string|null $identifier User ID or unique identifier
     * @param int $maxRequests Max attempts allowed in window
     * @param int $windowSeconds Window in seconds
     * @return array ['allowed' => bool, 'remaining' => int, 'retry_after' => int]
     */
    public static function check($action, $identifier = null, $maxRequests = 10, $windowSeconds = 300) {
        $ip = self::getClientIp();
        $id = $identifier ? preg_replace('/[^a-zA-Z0-9_\-]/', '_', $identifier) : preg_replace('/[^a-zA-Z0-9_\-]/', '_', $ip);
        $key = 'rl_' . $action . '_' . $id;

        $dir = self::getStorageDir();
        $filePath = $dir . DIRECTORY_SEPARATOR . md5($key) . '.json';

        $now = time();
        $records = [];

        if (file_exists($filePath)) {
            $content = @file_get_contents($filePath);
            if ($content) {
                $decoded = json_decode($content, true);
                if (is_array($decoded)) {
                    $threshold = $now - $windowSeconds;
                    foreach ($decoded as $timestamp) {
                        if ($timestamp > $threshold) {
                            $records[] = $timestamp;
                        }
                    }
                }
            }
        }

        $count = count($records);
        if ($count >= $maxRequests) {
            $oldestInWindow = reset($records);
            $retryAfter = max(1, ($oldestInWindow + $windowSeconds) - $now);
            return [
                'allowed' => false,
                'remaining' => 0,
                'retry_after' => $retryAfter,
                'limit' => $maxRequests
            ];
        }

        $records[] = $now;
        @file_put_contents($filePath, json_encode($records), LOCK_EX);

        return [
            'allowed' => true,
            'remaining' => $maxRequests - count($records),
            'retry_after' => 0,
            'limit' => $maxRequests
        ];
    }
}

