<?php

class Response {
    public static function json($data, $statusCode = 200) {
        header("Content-Type: application/json; charset=utf-8");
        http_response_code($statusCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success($param1, $param2 = null, $param3 = null, $param4 = null) {
        // Support both signatures:
        // success($data, $message, $statusCode, $pagination) - school_erp style
        // success($message, $data, $statusCode, $pagination) - School-Management-Backend style
        
        $data = null;
        $message = "Success";
        $statusCode = 200;
        $pagination = null;
        
        // Detect which signature is being used
        if (is_array($param1) && is_string($param2)) {
            // school_erp style: success($data, $message, $statusCode)
            $data = $param1;
            $message = $param2;
            $statusCode = $param3 ?? 200;
            $pagination = $param4;
        } elseif (is_array($param1) && $param2 === null) {
            // school_erp style but message is omitted: success($data)
            $data = $param1;
            $statusCode = 200;
        } elseif (is_string($param1)) {
            // School-Management-Backend style: success($message, $data, $statusCode)
            $message = $param1;
            $data = $param2;
            $statusCode = $param3 ?? 200;
            $pagination = $param4;
        }
        
        $response = [
            'success' => true,
            'message' => $message
        ];
        if ($data !== null) {
            $response['data'] = $data;
        }
        if ($pagination !== null) {
            $response['pagination'] = $pagination;
        }
        self::json($response, $statusCode);
    }

    public static function error($message, $statusCode = 400, $errors = null) {
        $response = [
            'success' => false,
            'message' => $message
        ];
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        self::json($response, $statusCode);
    }
}
