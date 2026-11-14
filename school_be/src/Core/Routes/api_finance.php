<?php

require_once __DIR__ . '/../../Modules/Finance/FinanceController.php';

function routeFinanceApi($routePath, $method, $id, $data)
{
    $controller = new FinanceController();

    // Map base route endpoints
    if ($routePath === '/api/finance/overview') {
        $controller->handleOverview($method, $data);
        return true;
    }

    if ($routePath === '/api/finance/class-fees') {
        $controller->handleClassFees($method, $id, $data);
        return true;
    }

    if ($routePath === '/api/finance/fee-details') {
        $controller->handleFeeDetails($method, $id, $data);
        return true;
    }

    if ($routePath === '/api/finance/student-fee-maps') {
        $controller->handleStudentFeeMaps($method, $id, $data);
        return true;
    }

    if ($routePath === '/api/finance/batch-assign') {
        $controller->handleBatchAssign($method, $data);
        return true;
    }

    if ($routePath === '/api/finance/payments') {
        $controller->handlePayments($method, $id, $data);
        return true;
    }

    if ($routePath === '/api/finance/fines') {
        $controller->handleFines($method, $id, $data);
        return true;
    }

    if ($routePath === '/api/finance/branch-collections') {
        $controller->handleBranchCollections($method, $id, $data);
        return true;
    }

    return false;
}

