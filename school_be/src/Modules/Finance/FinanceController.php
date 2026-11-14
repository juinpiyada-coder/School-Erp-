<?php

class FinanceController
{
    private $model;

    public function __construct()
    {
        $this->model = new FinanceModel();
    }

    /**
     * Authenticate and extract user payload
     */
    private function authenticate()
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (empty($authHeader) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            Response::error("Unauthorized: Token missing", 401);
            exit;
        }

        $token = $matches[1];
        $payload = JwtHandler::validateToken($token);

        if (!$payload) {
            Response::error("Unauthorized: Invalid or expired token", 401);
            exit;
        }

        return $payload;
    }

    /**
     * Determine branch scope based on user role and optional filter
     */
    private function resolveBranchScope($user, $requestedBranchId = null)
    {
        $role = $user['role_code'] ?? '';
        $userBranch = !empty($user['branch_id']) ? (int)$user['branch_id'] : null;

        // School Admin & School Executive can see all branches or filter by requested
        if (in_array($role, ['R_SCHOOLADMIN', 'R_SCHOOLEXECUTIVE', 'R_SUPERADMIN'], true)) {
            return !empty($requestedBranchId) ? (int)$requestedBranchId : null;
        }

        // Branch-level roles are strictly scoped to their assigned branch
        return $userBranch;
    }

    /**
     * GET /api/finance/overview
     */
    public function handleOverview($method, $data = [])
    {
        $user = $this->authenticate();

        if ($method !== 'GET') {
            Response::error("Method not allowed", 405);
            return;
        }

        $branchId = $this->resolveBranchScope($user, $data['branch_id'] ?? null);
        $academicYear = $data['academic_year'] ?? null;

        $metrics = $this->model->getOverviewMetrics($branchId, $academicYear);
        Response::success($metrics, "Finance overview loaded successfully");
    }

    /**
     * /api/finance/class-fees
     */
    public function handleClassFees($method, $id = null, $data = [])
    {
        $user = $this->authenticate();
        $role = $user['role_code'] ?? '';
        $branchId = $this->resolveBranchScope($user, $data['branch_id'] ?? null);

        switch ($method) {
            case 'GET':
                if ($id) {
                    $fee = $this->model->getClassFeeById($id);
                    if (!$fee) {
                        Response::error("Fee structure not found", 404);
                        return;
                    }
                    Response::success($fee, "Fee structure fetched successfully");
                } else {
                    $filters = [
                        'class_id' => $data['class_id'] ?? null,
                        'academic_year' => $data['academic_year'] ?? null,
                        'is_active' => $data['is_active'] ?? null
                    ];
                    $fees = $this->model->getClassFees($branchId, $filters);
                    Response::success($fees, "Class fees fetched successfully");
                }
                break;

            case 'POST':
                if (in_array($role, ['R_STUDENT', 'R_PARENT', 'R_GUARDIAN'], true)) {
                    Response::error("Forbidden: Insufficient privileges", 403);
                    return;
                }

                $assignedBranch = $this->resolveBranchScope($user, $data['brch_id'] ?? null);
                if (empty($assignedBranch)) {
                    Response::error("Branch ID is required", 400);
                    return;
                }

                $feeData = [
                    'brch_id' => $assignedBranch,
                    'class_id' => $data['class_id'] ?? null,
                    'academic_year' => $data['academic_year'] ?? date('Y') . '-' . (date('Y') + 1),
                    'total_annual_fee' => $data['total_annual_fee'] ?? 0,
                    'currency' => $data['currency'] ?? 'INR',
                    'is_active' => isset($data['is_active']) ? (int)$data['is_active'] : 1
                ];

                $components = !empty($data['components']) && is_array($data['components']) ? $data['components'] : [];

                $result = $this->model->createClassFeeWithDetails($feeData, $components);
                if ($result) {
                    Response::success($result, "Class fee structure created successfully", 201);
                } else {
                    Response::error("Failed to create class fee structure", 500);
                }
                break;

            case 'PUT':
            case 'PATCH':
                if (in_array($role, ['R_STUDENT', 'R_PARENT', 'R_GUARDIAN'], true)) {
                    Response::error("Forbidden: Insufficient privileges", 403);
                    return;
                }

                if (!$id) {
                    Response::error("Fee structure ID required", 400);
                    return;
                }

                $feeData = [];
                if (isset($data['total_annual_fee'])) $feeData['total_annual_fee'] = $data['total_annual_fee'];
                if (isset($data['currency'])) $feeData['currency'] = $data['currency'];
                if (isset($data['is_active'])) $feeData['is_active'] = $data['is_active'];
                if (isset($data['academic_year'])) $feeData['academic_year'] = $data['academic_year'];

                $components = isset($data['components']) && is_array($data['components']) ? $data['components'] : null;

                $success = $this->model->updateClassFee($id, $feeData, $components);
                if ($success) {
                    Response::success(["fee_id" => $id], "Class fee structure updated successfully");
                } else {
                    Response::error("Failed to update class fee structure", 500);
                }
                break;

            case 'DELETE':
                if (!in_array($role, ['R_SUPERADMIN', 'R_SCHOOLADMIN', 'R_BRANCHADMIN'], true)) {
                    Response::error("Forbidden: Only administrators can delete fee structures", 403);
                    return;
                }

                if (!$id) {
                    Response::error("Fee structure ID required", 400);
                    return;
                }

                $success = $this->model->deleteClassFee($id);
                if ($success) {
                    Response::success(null, "Class fee structure deleted successfully");
                } else {
                    Response::error("Failed to delete fee structure", 500);
                }
                break;

            default:
                Response::error("Method not allowed", 405);
                break;
        }
    }

    /**
     * /api/finance/fee-details
     */
    public function handleFeeDetails($method, $id = null, $data = [])
    {
        $this->authenticate();

        if ($method === 'GET') {
            $feeId = $data['fee_id'] ?? $id;
            if (!$feeId) {
                Response::error("Class Fee ID is required", 400);
                return;
            }
            $details = $this->model->getFeeDetailsByFeeId($feeId);
            Response::success($details, "Fee breakdown components fetched");
        } else {
            Response::error("Method not allowed", 405);
        }
    }

    /**
     * /api/finance/student-fee-maps
     */
    public function handleStudentFeeMaps($method, $id = null, $data = [])
    {
        $user = $this->authenticate();
        $role = $user['role_code'] ?? '';
        $branchId = $this->resolveBranchScope($user, $data['branch_id'] ?? null);

        // If student or parent, restrict to self
        if ($role === 'R_STUDENT') {
            $data['student_id'] = $user['user_id'] ?? null;
        }

        switch ($method) {
            case 'GET':
                if ($id) {
                    $item = $this->model->getStudentFeeMapById($id);
                    if (!$item) {
                        Response::error("Student fee record not found", 404);
                        return;
                    }
                    Response::success($item, "Student fee record fetched");
                } else {
                    $filters = [
                        'class_id' => $data['class_id'] ?? null,
                        'student_id' => $data['student_id'] ?? null,
                        'fee_month' => $data['fee_month'] ?? null,
                        'fee_year' => $data['fee_year'] ?? null,
                        'status' => $data['status'] ?? null
                    ];
                    $records = $this->model->getStudentFeeMaps($branchId, $filters);
                    Response::success($records, "Student fee maps fetched successfully");
                }
                break;

            case 'POST':
                if (in_array($role, ['R_STUDENT', 'R_PARENT', 'R_GUARDIAN'], true)) {
                    Response::error("Forbidden", 403);
                    return;
                }

                $assignedBranch = $this->resolveBranchScope($user, $data['brch_id'] ?? null);
                if (empty($assignedBranch) || empty($data['student_id']) || empty($data['fee_id'])) {
                    Response::error("Branch, Student, and Fee ID are required", 400);
                    return;
                }

                $record = [
                    'brch_id' => $assignedBranch,
                    'student_id' => $data['student_id'],
                    'fee_id' => $data['fee_id'],
                    'fee_month' => $data['fee_month'] ?? (int)date('m'),
                    'fee_year' => $data['fee_year'] ?? (int)date('Y'),
                    'due_date' => $data['due_date'] ?? date('Y-m-d', strtotime('+15 days')),
                    'total_amount' => $data['total_amount'] ?? 0,
                    'discount_amount' => $data['discount_amount'] ?? 0,
                    'fine_amount' => $data['fine_amount'] ?? 0,
                    'payable_amount' => $data['payable_amount'] ?? 0,
                    'status' => $data['status'] ?? 'PENDING'
                ];

                $mapId = $this->model->createStudentFeeMap($record);
                if ($mapId) {
                    Response::success(["stu_fee_id" => $mapId], "Student fee mapped successfully", 201);
                } else {
                    Response::error("Failed to map student fee", 500);
                }
                break;

            case 'PUT':
            case 'PATCH':
                if (in_array($role, ['R_STUDENT', 'R_PARENT', 'R_GUARDIAN'], true)) {
                    Response::error("Forbidden", 403);
                    return;
                }

                if (!$id) {
                    Response::error("Student fee ID required", 400);
                    return;
                }

                $success = $this->model->updateStudentFeeMap($id, $data);
                if ($success) {
                    Response::success(["stu_fee_id" => $id], "Student fee record updated");
                } else {
                    Response::error("Failed to update student fee record", 500);
                }
                break;

            default:
                Response::error("Method not allowed", 405);
                break;
        }
    }

    /**
     * POST /api/finance/batch-assign
     * Assign a class fee structure to all students in a class for a specific month/year
     */
    public function handleBatchAssign($method, $data = [])
    {
        $user = $this->authenticate();
        $role = $user['role_code'] ?? '';

        if ($method !== 'POST') {
            Response::error("Method not allowed", 405);
            return;
        }

        if (in_array($role, ['R_STUDENT', 'R_PARENT', 'R_GUARDIAN'], true)) {
            Response::error("Forbidden", 403);
            return;
        }

        $branchId = $this->resolveBranchScope($user, $data['brch_id'] ?? null);
        $classId = $data['class_id'] ?? null;
        $feeId = $data['fee_id'] ?? null;
        $feeMonth = $data['fee_month'] ?? (int)date('m');
        $feeYear = $data['fee_year'] ?? (int)date('Y');
        $dueDate = $data['due_date'] ?? date('Y-m-d', strtotime('+15 days'));

        if (empty($branchId) || empty($classId) || empty($feeId)) {
            Response::error("Branch, Class, and Fee ID are mandatory", 400);
            return;
        }

        $res = $this->model->batchAssignClassFee($branchId, $classId, $feeId, $feeMonth, $feeYear, $dueDate);
        Response::success($res, "Batch fee allocation completed successfully");
    }

    /**
     * /api/finance/payments
     */
    public function handlePayments($method, $id = null, $data = [])
    {
        $user = $this->authenticate();
        $role = $user['role_code'] ?? '';
        $branchId = $this->resolveBranchScope($user, $data['branch_id'] ?? null);

        switch ($method) {
            case 'GET':
                if ($id) {
                    $item = $this->model->getPaymentById($id);
                    if (!$item) {
                        Response::error("Payment not found", 404);
                        return;
                    }
                    Response::success($item, "Payment details fetched");
                } else {
                    $filters = [
                        'stu_fee_id' => $data['stu_fee_id'] ?? null,
                        'student_id' => ($role === 'R_STUDENT') ? ($user['user_id'] ?? null) : ($data['student_id'] ?? null),
                        'payment_mode' => $data['payment_mode'] ?? null,
                        'status' => $data['status'] ?? null,
                        'start_date' => $data['start_date'] ?? null,
                        'end_date' => $data['end_date'] ?? null
                    ];
                    $payments = $this->model->getPayments($branchId, $filters);
                    Response::success($payments, "Payments fetched successfully");
                }
                break;

            case 'POST':
                if (in_array($role, ['R_STUDENT', 'R_PARENT', 'R_GUARDIAN'], true)) {
                    Response::error("Students/Parents must use the verified online payment gateway", 403);
                    return;
                }

                $assignedBranch = $this->resolveBranchScope($user, $data['brch_id'] ?? null);
                if (empty($assignedBranch) || empty($data['stu_fee_id']) || empty($data['student_id']) || empty($data['paid_amount'])) {
                    Response::error("Branch, Student Fee ID, Student ID, and Paid Amount are required", 400);
                    return;
                }

                $paymentData = [
                    'brch_id' => $assignedBranch,
                    'stu_fee_id' => $data['stu_fee_id'],
                    'student_id' => $data['student_id'],
                    'paid_amount' => $data['paid_amount'],
                    'payment_date' => $data['payment_date'] ?? date('Y-m-d H:i:s'),
                    'payment_mode' => $data['payment_mode'] ?? 'CASH',
                    'transaction_ref' => $data['transaction_ref'] ?? null,
                    'collected_by' => $user['user_id'] ?? null,
                    'status' => 'SUCCESS',
                    'remarks' => $data['remarks'] ?? null
                ];

                $paymentId = $this->model->recordPayment($paymentData);
                if ($paymentId) {
                    $paymentRecord = $this->model->getPaymentById($paymentId);
                    Response::success($paymentRecord, "Payment recorded successfully", 201);
                } else {
                    Response::error("Failed to record payment", 500);
                }
                break;

            default:
                Response::error("Method not allowed", 405);
                break;
        }
    }

    /**
     * /api/finance/fines
     */
    public function handleFines($method, $id = null, $data = [])
    {
        $user = $this->authenticate();
        $role = $user['role_code'] ?? '';
        $branchId = $this->resolveBranchScope($user, $data['branch_id'] ?? null);

        switch ($method) {
            case 'GET':
                $filters = [
                    'student_id' => ($role === 'R_STUDENT') ? ($user['user_id'] ?? null) : ($data['student_id'] ?? null),
                    'status' => $data['status'] ?? null
                ];
                $fines = $this->model->getStudentFines($branchId, $filters);
                Response::success($fines, "Fines fetched successfully");
                break;

            case 'POST':
                if (in_array($role, ['R_STUDENT', 'R_PARENT', 'R_GUARDIAN'], true)) {
                    Response::error("Forbidden", 403);
                    return;
                }

                $assignedBranch = $this->resolveBranchScope($user, $data['brch_id'] ?? null);
                if (empty($assignedBranch) || empty($data['student_id']) || empty($data['fine_amount'])) {
                    Response::error("Branch, Student, and Fine Amount are required", 400);
                    return;
                }

                $fineData = [
                    'brch_id' => $assignedBranch,
                    'student_id' => $data['student_id'],
                    'fine_reason' => $data['fine_reason'] ?? 'Late fee submission',
                    'fine_amount' => $data['fine_amount'],
                    'fine_date' => $data['fine_date'] ?? date('Y-m-d'),
                    'status' => $data['status'] ?? 'PENDING'
                ];

                $fineId = $this->model->addFine($fineData);
                if ($fineId) {
                    Response::success(["fine_id" => $fineId], "Fine imposed successfully", 201);
                } else {
                    Response::error("Failed to record fine", 500);
                }
                break;

            case 'PUT':
            case 'PATCH':
                if (in_array($role, ['R_STUDENT', 'R_PARENT', 'R_GUARDIAN'], true)) {
                    Response::error("Forbidden", 403);
                    return;
                }

                if (!$id) {
                    Response::error("Fine ID required", 400);
                    return;
                }

                $status = $data['status'] ?? 'PAID';
                $success = $this->model->updateFineStatus($id, $status);
                if ($success) {
                    Response::success(["fine_id" => $id, "status" => $status], "Fine status updated");
                } else {
                    Response::error("Failed to update fine status", 500);
                }
                break;

            default:
                Response::error("Method not allowed", 405);
                break;
        }
    }

    /**
     * /api/finance/branch-collections
     */
    public function handleBranchCollections($method, $id = null, $data = [])
    {
        $user = $this->authenticate();
        $branchId = $this->resolveBranchScope($user, $data['branch_id'] ?? null);

        if ($method === 'GET') {
            $filters = [
                'collection_year' => $data['collection_year'] ?? null,
                'collection_month' => $data['collection_month'] ?? null
            ];
            $collections = $this->model->getBranchCollections($branchId, $filters);
            Response::success($collections, "Branch collection reports fetched");
        } else {
            Response::error("Method not allowed", 405);
        }
    }
}

