<?php
require_once __DIR__ . '/../../Core/Utils/Response.php';

class SettingsController {
    private $model;
    private $user;

    public function __construct() {
        require_once dirname(__DIR__) . '/Auth/User.php';
        require_once dirname(__DIR__, 2) . '/Core/Utils/JwtHandler.php';
        $this->user = JwtHandler::validateTokenFromHeader();
        
        // Instantiate the model dynamically like we did for Reports
        require_once __DIR__ . '/SettingsModel.php';
        $this->model = new SettingsModel();
    }

    public function getWhiteLabel() {
        // Read BMN_ID and BRN_ID from request.
        $bmnId = $_GET['bmn_id'] ?? null;
        $brnId = $_GET['brn_id'] ?? null;

        if ($this->user) {
            $roleId = strtoupper($this->user['role_id'] ?? $this->user['role'] ?? '');
            if ($roleId === 'R_SCHOOLADMIN' || strpos($roleId, 'SCHOOL') !== false) {
                if (empty($bmnId)) $bmnId = $this->user['userId'] ?? $this->user['id'] ?? null;
            } elseif ($roleId === 'R_BRANCHADMIN' || strpos($roleId, 'BRANCH') !== false) {
                if (empty($brnId)) $brnId = $this->user['userId'] ?? $this->user['id'] ?? null;
            }
        }

        $settings = $this->model->getSettings($bmnId, $brnId);

        if ($settings) {
            Response::success($settings, "Settings fetched successfully", 200);
        } else {
            // Return default/empty if not found
            Response::success(['WL_DESC' => '{}', 'WL_IMG_BASE64' => null], "No settings found, using defaults", 200);
        }
    }

    public function updateWhiteLabel() {
        if (!$this->user) {
            Response::error("Unauthorized access. Token missing or expired.", 401);
            exit;
        }
        
        // Since it's a POST/PUT, we read the JSON payload
        $inputJson = file_get_contents('php://input');
        $data = json_decode($inputJson, true) ?: [];

        $bmnId = !empty($data['bmn_id']) ? $data['bmn_id'] : null;
        $brnId = !empty($data['brn_id']) ? $data['brn_id'] : null;

        $roleId = strtoupper($this->user['role_id'] ?? $this->user['role'] ?? '');
        if ($roleId === 'R_SCHOOLADMIN' || strpos($roleId, 'SCHOOL') !== false) {
            if (empty($bmnId)) $bmnId = $this->user['userId'] ?? $this->user['id'] ?? null;
        } elseif ($roleId === 'R_BRANCHADMIN' || strpos($roleId, 'BRANCH') !== false) {
            if (empty($brnId)) $brnId = $this->user['userId'] ?? $this->user['id'] ?? null;
        }
        
        $settingsObj = $data['settings'] ?? [];
        $descJson = json_encode($settingsObj);
        
        $imgBase64 = $data['logo_base64'] ?? null;
        $bannerBase64 = $data['banner_base64'] ?? null;

        try {
            $result = $this->model->saveSettings($bmnId, $brnId, $descJson, $imgBase64, $bannerBase64);

            if ($result === true) {
                Response::success(null, "Settings updated successfully", 200);
            } else {
                Response::error("Failed to update settings: " . $result, 500);
            }
        } catch (Exception $e) {
            Response::error("Failed to update settings: " . $e->getMessage(), 500);
        }
    }
}
