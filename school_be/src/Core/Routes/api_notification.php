<?php

require_once dirname(__DIR__, 2) . '/Modules/Notification/NotificationController.php';

function routeNotificationApi($uriPath, $method, $id, $data) {
    $controller = new NotificationController();

    // 1. Image serving: /api/notifications/details/{detailId}/image
    if (preg_match('#^/api/notifications/details/([^/]+)/image/?$#', $uriPath, $matches)) {
        if ($method === 'GET') {
            $controller->getDetailImage($matches[1]);
            return true;
        } else {
            Response::error("Method Not Allowed", 405);
        }
    }

    // 2. Notification Details CRUD: /api/notifications/details/{detailId}
    if (preg_match('#^/api/notifications/details/([^/]+)/?$#', $uriPath, $matches)) {
        $detailId = $matches[1];
        if ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
            $controller->updateDetail($detailId, $data);
            return true;
        } elseif ($method === 'DELETE') {
            $controller->deleteDetail($detailId);
            return true;
        } else {
            Response::error("Method Not Allowed", 405);
        }
    }

    // 3. Add detail to notification: /api/notifications/{id}/details
    if (preg_match('#^/api/notifications/([^/]+)/details/?$#', $uriPath, $matches)) {
        $notifId = $matches[1];
        if ($method === 'POST') {
            $controller->addDetail($notifId, $data);
            return true;
        } else {
            Response::error("Method Not Allowed", 405);
        }
    }

    // 4. Notifications collection & single resource: /api/notifications or /api/notifications/{id}
    if (preg_match('#^/api/notifications(?:/([^/]+))?/?$#', $uriPath, $matches)) {
        $notifId = !empty($matches[1]) ? $matches[1] : $id;

        if ($method === 'GET') {
            if (!empty($notifId)) {
                $controller->getNotification($notifId);
            } else {
                $controller->getNotifications($data);
            }
            return true;
        } elseif ($method === 'POST') {
            $controller->createNotification($data);
            return true;
        } elseif ($method === 'PUT' || $method === 'PATCH') {
            if (!empty($notifId)) {
                $controller->updateNotification($notifId, $data);
                return true;
            } else {
                Response::error("Notification ID required for update", 400);
            }
        } elseif ($method === 'DELETE') {
            if (!empty($notifId)) {
                $controller->deleteNotification($notifId);
                return true;
            } else {
                Response::error("Notification ID required for deletion", 400);
            }
        } else {
            Response::error("Method Not Allowed", 405);
        }
    }

    return false;
}
