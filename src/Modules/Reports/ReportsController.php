<?php
require_once __DIR__ . '/ReportsModel.php';
require_once dirname(__DIR__, 2) . '/Core/Utils/Response.php';

class ReportsController {
    private $model;
    private $user;

    public function __construct() {
        require_once dirname(__DIR__) . '/Auth/User.php';
        require_once dirname(__DIR__, 2) . '/Core/Utils/JwtHandler.php';
        $this->user = JwtHandler::validateTokenFromHeader();
        if (!$this->user) {
            Response::error("Unauthorized access. Token missing or expired.", 401);
            exit;
        }
        
        require_once __DIR__ . '/ReportsModel.php';
        $this->model = new ReportsModel();
    }

    public function getOverview() {
        // Still allow branchId from GET for superadmin filtering, but model will enforce security
        $branchId = $_GET['branch_id'] ?? null;
        $stats = $this->model->getOverviewStats($branchId, $this->user);
        Response::success($stats, "Reports overview fetched successfully", 200);
    }

    public function getStudentsByBranch() {
        $data = $this->model->getStudentsByBranch($this->user);
        Response::success($data, "Students by branch fetched successfully", 200);
    }

    public function getTeachersByBranch() {
        $data = $this->model->getTeachersByBranch($this->user);
        Response::success($data, "Teachers by branch fetched successfully", 200);
    }
}
