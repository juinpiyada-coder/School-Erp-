<?php

require_once dirname(__DIR__, 2) . '/Core/Utils/Response.php';
require_once dirname(__DIR__, 2) . '/Core/Utils/JwtHandler.php';
require_once __DIR__ . '/NotificationModel.php';

class NotificationController {
    private $model;
    private $user;

    public function __construct() {
        $this->user = JwtHandler::validateTokenFromHeader();
        if (!$this->user) {
            Response::error("Unauthorized access. Token missing or expired.", 401);
            exit;
        }

        $this->model = new NotificationModel();
    }

    /**
     * Helper to get user context with school and branch scope
     */
    private function getUserContext() {
        $userId = $this->user['userId'] ?? $this->user['user_id'] ?? '';
        $context = $this->model->resolveUserContext($userId);
        if (!$context) {
            return [
                'userId' => $userId,
                'email' => $this->user['email'] ?? '',
                'role' => strtoupper($this->user['role_id'] ?? $this->user['role'] ?? ''),
                'schoolId' => null,
                'branchId' => null
            ];
        }
        return $context;
    }

    /**
     * Check if user is SuperAdmin, SchoolAdmin, or BranchAdmin
     */
    private function canCreateBroadcast($role) {
        return in_array($role, [
            'R_SUPERADMIN', 
            'R_SCHOOLADMIN', 
            'R_SCHOOLEXECUTIVE', 
            'R_BRANCHADMIN', 
            'R_BRANCHEXECUTIVE'
        ]);
    }

    /**
     * GET /api/notifications
     * List notifications visible to caller
     */
    public function getNotifications($params = []) {
        try {
            $context = $this->getUserContext();
            $category = $params['category'] ?? null;
            $activeOnly = isset($params['active_only']) ? (bool)$params['active_only'] : false;
            $page = isset($params['page']) ? (int)$params['page'] : 1;
            $limit = isset($params['limit']) ? (int)$params['limit'] : 20;

            if ($page < 1) $page = 1;
            if ($limit < 1 || $limit > 100) $limit = 20;
            $offset = ($page - 1) * $limit;

            $items = $this->model->getAll($context, $category, $activeOnly, $limit, $offset);
            $total = $this->model->getCount($context, $category, $activeOnly);

            $pagination = [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($total / $limit)
            ];

            Response::success($items, "Notifications fetched successfully", 200, $pagination);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/notifications/{id}
     * Get single notification with conversation/detail entries
     */
    public function getNotification($id) {
        try {
            if (empty($id)) {
                Response::error("Notification ID is required", 400);
                return;
            }

            $notification = $this->model->getById($id);
            if (!$notification) {
                Response::error("Notification not found", 404);
                return;
            }

            Response::success($notification, "Notification retrieved successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/notifications
     * Create a notification (SuperAdmin, SchoolAdmin, BranchAdmin, or Teacher/Student/Parent query)
     */
    public function createNotification($data) {
        try {
            $context = $this->getUserContext();
            $userId = $context['userId'];
            $role = $context['role'];

            if (empty($data['SMS_NO_CAT'])) {
                Response::error("Notification category (SMS_NO_CAT) is required", 400);
                return;
            }

            if (empty($data['SMS_NO_DESC'])) {
                Response::error("Notification description (SMS_NO_DESC) is required", 400);
                return;
            }

            // Students and parents cannot broadcast system-wide, but can create support/enquiry/leave request notifications
            $created = $this->model->createNotification($data, $userId);
            Response::success($created, "Notification created successfully", 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/notifications/{id}
     * Update notification header
     */
    public function updateNotification($id, $data) {
        try {
            if (empty($id)) {
                Response::error("Notification ID is required", 400);
                return;
            }

            $existing = $this->model->getById($id);
            if (!$existing) {
                Response::error("Notification not found", 404);
                return;
            }

            $context = $this->getUserContext();
            $userId = $context['userId'];
            $role = $context['role'];

            // Only SuperAdmin, SchoolAdmin, BranchAdmin or owner/creator can update
            if (!$this->canCreateBroadcast($role) && $existing['SMS_NO_USERID'] !== $userId && $existing['SMS_NO_OWNEDBY'] !== $userId) {
                Response::error("Forbidden. You do not have permission to update this notification.", 403);
                return;
            }

            $updated = $this->model->updateNotification($id, $data, $userId);
            Response::success($updated, "Notification updated successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/notifications/{id}
     * Delete notification
     */
    public function deleteNotification($id) {
        try {
            if (empty($id)) {
                Response::error("Notification ID is required", 400);
                return;
            }

            $existing = $this->model->getById($id);
            if (!$existing) {
                Response::error("Notification not found", 404);
                return;
            }

            $context = $this->getUserContext();
            $userId = $context['userId'];
            $role = $context['role'];

            if ($role !== 'R_SUPERADMIN' && $existing['SMS_NO_USERID'] !== $userId && $existing['SMS_NO_OWNEDBY'] !== $userId) {
                Response::error("Forbidden. You do not have permission to delete this notification.", 403);
                return;
            }

            $this->model->deleteNotification($id);
            Response::success(null, "Notification deleted successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/notifications/{id}/details
     * Add conversation message / action / assignment / update to notification
     */
    public function addDetail($notificationId, $data) {
        try {
            if (empty($notificationId)) {
                Response::error("Notification ID is required", 400);
                return;
            }

            $existing = $this->model->getById($notificationId);
            if (!$existing) {
                Response::error("Notification not found", 404);
                return;
            }

            $context = $this->getUserContext();
            $userId = $context['userId'];

            $detail = $this->model->addDetail($notificationId, $data, $userId);
            Response::success($detail, "Notification detail entry added successfully", 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/notifications/details/{detailId}
     * Update detail entry or close/assign
     */
    public function updateDetail($detailId, $data) {
        try {
            if (empty($detailId)) {
                Response::error("Detail ID is required", 400);
                return;
            }

            $context = $this->getUserContext();
            $userId = $context['userId'];

            $updated = $this->model->updateDetail($detailId, $data, $userId);
            Response::success($updated, "Notification detail updated successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/notifications/details/{detailId}
     */
    public function deleteDetail($detailId) {
        try {
            if (empty($detailId)) {
                Response::error("Detail ID is required", 400);
                return;
            }

            $this->model->deleteDetail($detailId);
            Response::success(null, "Notification detail deleted successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/notifications/details/{detailId}/image
     * Serve image BLOB directly
     */
    public function getDetailImage($detailId) {
        try {
            $imageBlob = $this->model->getDetailImage($detailId);
            if (!$imageBlob) {
                Response::error("Image not found", 404);
                return;
            }

            // Check if stored as base64 data url or raw binary
            if (is_string($imageBlob) && strpos($imageBlob, 'data:image') === 0) {
                $parts = explode(',', $imageBlob, 2);
                $contentType = 'image/png';
                if (preg_match('#data:(image/[^;]+);base64#', $parts[0], $m)) {
                    $contentType = $m[1];
                }
                header("Content-Type: " . $contentType);
                echo base64_decode($parts[1]);
                exit;
            }

            header("Content-Type: image/jpeg");
            echo $imageBlob;
            exit;
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
}
