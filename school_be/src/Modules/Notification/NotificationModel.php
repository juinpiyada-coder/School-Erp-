<?php

require_once dirname(__DIR__, 2) . '/Core/Config/Database.php';

class NotificationModel {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTables();
    }

    private function ensureTables() {
        try {
            $this->db->exec("CREATE TABLE IF NOT EXISTS SMS_NOTIFICATION (
                SMS_NO_ID VARCHAR(100) PRIMARY KEY,
                SMS_NO_CAT VARCHAR(100) NOT NULL,
                SMS_NO_DESC VARCHAR(2000),
                SMS_NO_ACTIVE VARCHAR(10),
                SMS_NO_USERID VARCHAR(100),
                SMS_NO_CREATEDT DATETIME,
                SMS_NO_OWNEDBY VARCHAR(100)
            )");

            $this->db->exec("CREATE TABLE IF NOT EXISTS SMS_NO_DTLS (
                SMS_NODTLS_ID VARCHAR(100) PRIMARY KEY,
                SMS_NODTLS_DESC VARCHAR(2000),
                SMS_NODTLS_IMG LONGBLOB,
                SMS_NOID VARCHAR(100),
                SMS_DTLS_ASSIGN_TO VARCHAR(100),
                SMS_DTLS_UPDTDBY VARCHAR(100),
                SMS_DTLS_UPDT DATETIME,
                SMS_DTLS_CLOSED VARCHAR(100),
                SMS_DTLS_CLOSEDBY VARCHAR(100)
            )");
        } catch (Exception $e) {
            // Ignore if tables already exist
        }
    }

    /**
     * Resolve user scope: school_id, branch_id, role, etc.
     */
    public function resolveUserContext($userId) {
        $stmt = $this->db->prepare("SELECT user_id, user_email_id, user_role, user_school_id, user_branch_id FROM SM_USER_LOGIN WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            return null;
        }

        $role = strtoupper($user['user_role'] ?? '');
        $schoolId = $user['user_school_id'] ?? null;
        $branchId = $user['user_branch_id'] ?? null;

        // Resolve branch / school context based on role if not directly stored in SM_USER_LOGIN
        if (!$branchId && ($role === 'R_BRANCHADMIN' || strpos($role, 'BRANCH') !== false)) {
            $bStmt = $this->db->prepare("SELECT SCHL_BR_ID, SCHL_BR_CENTER_ID FROM SCHL_BRANCH WHERE SCHL_BR_ID = ? OR SCHL_BR_EMAILID = ? LIMIT 1");
            $bStmt->execute([$user['user_id'], $user['user_email_id']]);
            if ($bRow = $bStmt->fetch(PDO::FETCH_ASSOC)) {
                $branchId = $bRow['SCHL_BR_ID'];
                $schoolId = $schoolId ?: $bRow['SCHL_BR_CENTER_ID'];
            }
        } elseif (!$schoolId && ($role === 'R_SCHOOLADMIN' || strpos($role, 'SCHOOL') !== false)) {
            $sStmt = $this->db->prepare("SELECT SCHL_MN_ID FROM MSTR_SCHOOL_MAIN WHERE SCHL_MN_ID = ? OR SCHL_MN_EMAILID = ? LIMIT 1");
            $sStmt->execute([$user['user_id'], $user['user_email_id']]);
            if ($sRow = $sStmt->fetch(PDO::FETCH_ASSOC)) {
                $schoolId = $sRow['SCHL_MN_ID'];
            }
        } elseif ($role === 'R_TEACHER' || strpos($role, 'TEACHER') !== false) {
            $tStmt = $this->db->prepare("SELECT t.BR_TCHR_ID, t.BR_TCHR_BR_ID, b.SCHL_BR_CENTER_ID FROM SCHL_BR_TCHR t LEFT JOIN SCHL_BRANCH b ON t.BR_TCHR_BR_ID = b.SCHL_BR_ID WHERE t.BR_TCHR_ID = ? OR t.BR_TCHR_EMAI_ID = ? LIMIT 1");
            $tStmt->execute([$user['user_id'], $user['user_email_id']]);
            if ($tRow = $tStmt->fetch(PDO::FETCH_ASSOC)) {
                $branchId = $tRow['BR_TCHR_BR_ID'];
                $schoolId = $schoolId ?: $tRow['SCHL_BR_CENTER_ID'];
            }
        } elseif ($role === 'R_STUDENT') {
            $stStmt = $this->db->prepare("SELECT s.STU_ID, sess.SCHL_BR_CLASS_SEC_SESS_BR_ID as br_id, b.SCHL_BR_CENTER_ID FROM SCHL_STU s LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID LEFT JOIN SCHL_BRANCH b ON sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID WHERE s.STU_ID = ? OR s.USER_ID = ? LIMIT 1");
            $stStmt->execute([$user['user_id'], $user['user_id']]);
            if ($stRow = $stStmt->fetch(PDO::FETCH_ASSOC)) {
                $branchId = $stRow['br_id'];
                $schoolId = $schoolId ?: $stRow['SCHL_BR_CENTER_ID'];
            }
        } elseif ($role === 'R_PARENT') {
            $pStmt = $this->db->prepare("SELECT p.PRNT_ID, p.PRNT_BRANCH_ID, sess.SCHL_BR_CLASS_SEC_SESS_BR_ID as br_id, b.SCHL_BR_CENTER_ID FROM SCHL_MSTR_PRNT p LEFT JOIN SCHL_STU s ON p.PRNT_ID = s.STU_PRNT_ID LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID LEFT JOIN SCHL_BRANCH b ON sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID WHERE p.PRNT_ID = ? OR p.USER_ID = ? OR p.PRNT_EMAILID = ? LIMIT 1");
            $pStmt->execute([$user['user_id'], $user['user_id'], $user['user_email_id']]);
            if ($pRow = $pStmt->fetch(PDO::FETCH_ASSOC)) {
                $branchId = $pRow['PRNT_BRANCH_ID'] ?: $pRow['br_id'];
                $schoolId = $schoolId ?: $pRow['SCHL_BR_CENTER_ID'];
            }
        }

        return [
            'userId' => $user['user_id'],
            'email' => $user['user_email_id'],
            'role' => $role,
            'schoolId' => $schoolId,
            'branchId' => $branchId
        ];
    }

    /**
     * Get notifications visible to the given user based on their role
     */
    public function getAll($userContext, $category = null, $activeOnly = false, $limit = 50, $offset = 0) {
        $role = $userContext['role'] ?? '';
        $userId = $userContext['userId'] ?? '';
        $branchId = $userContext['branchId'] ?? null;
        $schoolId = $userContext['schoolId'] ?? null;

        $sql = "SELECT n.SMS_NO_ID, n.SMS_NO_CAT, n.SMS_NO_DESC, n.SMS_NO_ACTIVE, 
                       n.SMS_NO_USERID, n.SMS_NO_CREATEDT, n.SMS_NO_OWNEDBY,
                       u1.user_first_name as created_by_first_name, u1.user_last_name as created_by_last_name, u1.user_role as created_by_role,
                       u2.user_first_name as owned_by_first_name, u2.user_last_name as owned_by_last_name,
                       (SELECT COUNT(*) FROM SMS_NO_DTLS d WHERE d.SMS_NOID = n.SMS_NO_ID) as details_count
                FROM SMS_NOTIFICATION n
                LEFT JOIN SM_USER_LOGIN u1 ON n.SMS_NO_USERID = u1.user_id
                LEFT JOIN SM_USER_LOGIN u2 ON n.SMS_NO_OWNEDBY = u2.user_id
                WHERE 1=1";

        $params = [];

        if ($activeOnly) {
            $sql .= " AND (n.SMS_NO_ACTIVE = '1' OR n.SMS_NO_ACTIVE = 'Y' OR n.SMS_NO_ACTIVE = 'ACTIVE' OR n.SMS_NO_ACTIVE IS NULL)";
        }

        if (!empty($category)) {
            $sql .= " AND n.SMS_NO_CAT = ?";
            $params[] = $category;
        }

        // Role-based visibility
        if ($role === 'R_SUPERADMIN') {
            // Super Admin sees all notifications
        } elseif ($role === 'R_SCHOOLADMIN' || $role === 'R_SCHOOLEXECUTIVE') {
            // School Admin sees notifications in their school or created by their users or targeted to them
            if ($schoolId) {
                $sql .= " AND (n.SMS_NO_USERID = ? OR n.SMS_NO_OWNEDBY = ? 
                               OR u1.user_school_id = ? 
                               OR u1.user_branch_id IN (SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ?)
                               OR EXISTS (SELECT 1 FROM SMS_NO_DTLS dtls WHERE dtls.SMS_NOID = n.SMS_NO_ID AND dtls.SMS_DTLS_ASSIGN_TO = ?))";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $schoolId;
                $params[] = $schoolId;
                $params[] = $userId;
            } else {
                $sql .= " AND (n.SMS_NO_USERID = ? OR n.SMS_NO_OWNEDBY = ? OR EXISTS (SELECT 1 FROM SMS_NO_DTLS dtls WHERE dtls.SMS_NOID = n.SMS_NO_ID AND dtls.SMS_DTLS_ASSIGN_TO = ?))";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
            }
        } elseif ($role === 'R_BRANCHADMIN' || $role === 'R_BRANCHEXECUTIVE' || $role === 'R_BRANCHOFFICIAL') {
            // Branch Admin sees notifications in their branch, created by branch staff/admin, or assigned to them
            if ($branchId) {
                $sql .= " AND (n.SMS_NO_USERID = ? OR n.SMS_NO_OWNEDBY = ? 
                               OR u1.user_branch_id = ? 
                               OR EXISTS (SELECT 1 FROM SMS_NO_DTLS dtls WHERE dtls.SMS_NOID = n.SMS_NO_ID AND (dtls.SMS_DTLS_ASSIGN_TO = ? OR dtls.SMS_DTLS_ASSIGN_TO IN (SELECT user_id FROM SM_USER_LOGIN WHERE user_branch_id = ?))))";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $branchId;
                $params[] = $userId;
                $params[] = $branchId;
            } else {
                $sql .= " AND (n.SMS_NO_USERID = ? OR n.SMS_NO_OWNEDBY = ? OR EXISTS (SELECT 1 FROM SMS_NO_DTLS dtls WHERE dtls.SMS_NOID = n.SMS_NO_ID AND dtls.SMS_DTLS_ASSIGN_TO = ?))";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
            }
        } else {
            // Teacher, Student, Parent
            // Sees notifications assigned specifically to them, created by them, or broadcast for their category/branch
            $sql .= " AND (n.SMS_NO_USERID = ? 
                           OR n.SMS_NO_OWNEDBY = ? 
                           OR EXISTS (SELECT 1 FROM SMS_NO_DTLS dtls WHERE dtls.SMS_NOID = n.SMS_NO_ID AND (dtls.SMS_DTLS_ASSIGN_TO = ? OR dtls.SMS_DTLS_ASSIGN_TO = 'ALL' OR dtls.SMS_DTLS_ASSIGN_TO = ?))";
            $params[] = $userId;
            $params[] = $userId;
            $params[] = $userId;
            $params[] = $role;

            if ($branchId) {
                $sql .= " OR (u1.user_branch_id = ? AND (n.SMS_NO_CAT IN ('NOTICE', 'ANNOUNCEMENT', 'GENERAL', 'CIRCULAR', 'EXAM', 'EVENT') OR n.SMS_NO_OWNEDBY IS NULL))";
                $params[] = $branchId;
            }
            $sql .= ")";
        }

        $sql .= " ORDER BY n.SMS_NO_CREATEDT DESC";
        if ($limit > 0) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get count for pagination
     */
    public function getCount($userContext, $category = null, $activeOnly = false) {
        $role = $userContext['role'] ?? '';
        $userId = $userContext['userId'] ?? '';
        $branchId = $userContext['branchId'] ?? null;
        $schoolId = $userContext['schoolId'] ?? null;

        $sql = "SELECT COUNT(DISTINCT n.SMS_NO_ID) as total
                FROM SMS_NOTIFICATION n
                LEFT JOIN SM_USER_LOGIN u1 ON n.SMS_NO_USERID = u1.user_id
                WHERE 1=1";
        $params = [];

        if ($activeOnly) {
            $sql .= " AND (n.SMS_NO_ACTIVE = '1' OR n.SMS_NO_ACTIVE = 'Y' OR n.SMS_NO_ACTIVE = 'ACTIVE' OR n.SMS_NO_ACTIVE IS NULL)";
        }
        if (!empty($category)) {
            $sql .= " AND n.SMS_NO_CAT = ?";
            $params[] = $category;
        }

        if ($role === 'R_SUPERADMIN') {
            // No filter
        } elseif ($role === 'R_SCHOOLADMIN' || $role === 'R_SCHOOLEXECUTIVE') {
            if ($schoolId) {
                $sql .= " AND (n.SMS_NO_USERID = ? OR n.SMS_NO_OWNEDBY = ? OR u1.user_school_id = ? OR u1.user_branch_id IN (SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ?) OR EXISTS (SELECT 1 FROM SMS_NO_DTLS dtls WHERE dtls.SMS_NOID = n.SMS_NO_ID AND dtls.SMS_DTLS_ASSIGN_TO = ?))";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $schoolId;
                $params[] = $schoolId;
                $params[] = $userId;
            } else {
                $sql .= " AND (n.SMS_NO_USERID = ? OR n.SMS_NO_OWNEDBY = ? OR EXISTS (SELECT 1 FROM SMS_NO_DTLS dtls WHERE dtls.SMS_NOID = n.SMS_NO_ID AND dtls.SMS_DTLS_ASSIGN_TO = ?))";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
            }
        } elseif ($role === 'R_BRANCHADMIN' || $role === 'R_BRANCHEXECUTIVE' || $role === 'R_BRANCHOFFICIAL') {
            if ($branchId) {
                $sql .= " AND (n.SMS_NO_USERID = ? OR n.SMS_NO_OWNEDBY = ? OR u1.user_branch_id = ? OR EXISTS (SELECT 1 FROM SMS_NO_DTLS dtls WHERE dtls.SMS_NOID = n.SMS_NO_ID AND (dtls.SMS_DTLS_ASSIGN_TO = ? OR dtls.SMS_DTLS_ASSIGN_TO IN (SELECT user_id FROM SM_USER_LOGIN WHERE user_branch_id = ?))))";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $branchId;
                $params[] = $userId;
                $params[] = $branchId;
            } else {
                $sql .= " AND (n.SMS_NO_USERID = ? OR n.SMS_NO_OWNEDBY = ? OR EXISTS (SELECT 1 FROM SMS_NO_DTLS dtls WHERE dtls.SMS_NOID = n.SMS_NO_ID AND dtls.SMS_DTLS_ASSIGN_TO = ?))";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
            }
        } else {
            $sql .= " AND (n.SMS_NO_USERID = ? OR n.SMS_NO_OWNEDBY = ? OR EXISTS (SELECT 1 FROM SMS_NO_DTLS dtls WHERE dtls.SMS_NOID = n.SMS_NO_ID AND (dtls.SMS_DTLS_ASSIGN_TO = ? OR dtls.SMS_DTLS_ASSIGN_TO = 'ALL' OR dtls.SMS_DTLS_ASSIGN_TO = ?))";
            $params[] = $userId;
            $params[] = $userId;
            $params[] = $userId;
            $params[] = $role;
            if ($branchId) {
                $sql .= " OR (u1.user_branch_id = ? AND (n.SMS_NO_CAT IN ('NOTICE', 'ANNOUNCEMENT', 'GENERAL', 'CIRCULAR', 'EXAM', 'EVENT') OR n.SMS_NO_OWNEDBY IS NULL))";
                $params[] = $branchId;
            }
            $sql .= ")";
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($row['total'] ?? 0);
    }

    /**
     * Get single notification with all details entries
     */
    public function getById($id) {
        $stmt = $this->db->prepare("SELECT n.SMS_NO_ID, n.SMS_NO_CAT, n.SMS_NO_DESC, n.SMS_NO_ACTIVE, 
                                           n.SMS_NO_USERID, n.SMS_NO_CREATEDT, n.SMS_NO_OWNEDBY,
                                           u1.user_first_name as created_by_first_name, u1.user_last_name as created_by_last_name, u1.user_role as created_by_role,
                                           u2.user_first_name as owned_by_first_name, u2.user_last_name as owned_by_last_name
                                    FROM SMS_NOTIFICATION n
                                    LEFT JOIN SM_USER_LOGIN u1 ON n.SMS_NO_USERID = u1.user_id
                                    LEFT JOIN SM_USER_LOGIN u2 ON n.SMS_NO_OWNEDBY = u2.user_id
                                    WHERE n.SMS_NO_ID = ? LIMIT 1");
        $stmt->execute([$id]);
        $notification = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$notification) {
            return null;
        }

        $notification['details'] = $this->getDetailsByNotificationId($id);
        return $notification;
    }

    /**
     * Get details for a notification
     */
    public function getDetailsByNotificationId($notificationId) {
        $stmt = $this->db->prepare("SELECT d.SMS_NODTLS_ID, d.SMS_NODTLS_DESC, d.SMS_NOID, 
                                           d.SMS_DTLS_ASSIGN_TO, d.SMS_DTLS_UPDTDBY, d.SMS_DTLS_UPDT, 
                                           d.SMS_DTLS_CLOSED, d.SMS_DTLS_CLOSEDBY,
                                           CASE WHEN d.SMS_NODTLS_IMG IS NOT NULL AND LENGTH(d.SMS_NODTLS_IMG) > 0 THEN 1 ELSE 0 END as has_image,
                                           u_ass.user_first_name as assign_first_name, u_ass.user_last_name as assign_last_name, u_ass.user_role as assign_role,
                                           u_upd.user_first_name as updated_by_first_name, u_upd.user_last_name as updated_by_last_name,
                                           u_cls.user_first_name as closed_by_first_name, u_cls.user_last_name as closed_by_last_name
                                    FROM SMS_NO_DTLS d
                                    LEFT JOIN SM_USER_LOGIN u_ass ON d.SMS_DTLS_ASSIGN_TO = u_ass.user_id
                                    LEFT JOIN SM_USER_LOGIN u_upd ON d.SMS_DTLS_UPDTDBY = u_upd.user_id
                                    LEFT JOIN SM_USER_LOGIN u_cls ON d.SMS_DTLS_CLOSEDBY = u_cls.user_id
                                    WHERE d.SMS_NOID = ?
                                    ORDER BY d.SMS_DTLS_UPDT DESC, d.SMS_NODTLS_ID ASC");
        $stmt->execute([$notificationId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $rows;
    }

    /**
     * Get image for detail entry
     */
    public function getDetailImage($detailId) {
        $stmt = $this->db->prepare("SELECT SMS_NODTLS_IMG FROM SMS_NO_DTLS WHERE SMS_NODTLS_ID = ? LIMIT 1");
        $stmt->execute([$detailId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['SMS_NODTLS_IMG'] : null;
    }

    /**
     * Create notification header and optional initial detail
     */
    public function createNotification($data, $userId) {
        $notifId = $data['SMS_NO_ID'] ?? ('NOTIF_' . strtoupper(uniqid()));
        $cat = $data['SMS_NO_CAT'] ?? 'NOTICE';
        $desc = $data['SMS_NO_DESC'] ?? '';
        $active = isset($data['SMS_NO_ACTIVE']) ? (string)$data['SMS_NO_ACTIVE'] : 'ACTIVE';
        $ownedBy = $data['SMS_NO_OWNEDBY'] ?? $userId;
        $createDt = date('Y-m-d H:i:s');

        $stmt = $this->db->prepare("INSERT INTO SMS_NOTIFICATION 
            (SMS_NO_ID, SMS_NO_CAT, SMS_NO_DESC, SMS_NO_ACTIVE, SMS_NO_USERID, SMS_NO_CREATEDT, SMS_NO_OWNEDBY)
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$notifId, $cat, $desc, $active, $userId, $createDt, $ownedBy]);

        // If initial detail message or assignment is passed, create it in SMS_NO_DTLS
        if (!empty($data['detail_desc']) || !empty($data['assign_to']) || !empty($data['image'])) {
            $dtlId = 'NDTL_' . strtoupper(uniqid());
            $dtlDesc = $data['detail_desc'] ?? $desc;
            $assignTo = $data['assign_to'] ?? null;
            $img = !empty($data['image']) ? $data['image'] : null;

            $dStmt = $this->db->prepare("INSERT INTO SMS_NO_DTLS 
                (SMS_NODTLS_ID, SMS_NODTLS_DESC, SMS_NODTLS_IMG, SMS_NOID, SMS_DTLS_ASSIGN_TO, SMS_DTLS_UPDTDBY, SMS_DTLS_UPDT, SMS_DTLS_CLOSED, SMS_DTLS_CLOSEDBY)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), 'OPEN', NULL)");
            $dStmt->execute([$dtlId, $dtlDesc, $img, $notifId, $assignTo, $userId]);
        }

        return $this->getById($notifId);
    }

    /**
     * Update notification header
     */
    public function updateNotification($id, $data, $userId) {
        $fields = [];
        $params = [];

        if (isset($data['SMS_NO_CAT'])) {
            $fields[] = "SMS_NO_CAT = ?";
            $params[] = $data['SMS_NO_CAT'];
        }
        if (isset($data['SMS_NO_DESC'])) {
            $fields[] = "SMS_NO_DESC = ?";
            $params[] = $data['SMS_NO_DESC'];
        }
        if (isset($data['SMS_NO_ACTIVE'])) {
            $fields[] = "SMS_NO_ACTIVE = ?";
            $params[] = $data['SMS_NO_ACTIVE'];
        }
        if (isset($data['SMS_NO_OWNEDBY'])) {
            $fields[] = "SMS_NO_OWNEDBY = ?";
            $params[] = $data['SMS_NO_OWNEDBY'];
        }

        if (empty($fields)) {
            return $this->getById($id);
        }

        $params[] = $id;
        $sql = "UPDATE SMS_NOTIFICATION SET " . implode(', ', $fields) . " WHERE SMS_NO_ID = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /**
     * Delete notification and its details
     */
    public function deleteNotification($id) {
        $dStmt = $this->db->prepare("DELETE FROM SMS_NO_DTLS WHERE SMS_NOID = ?");
        $dStmt->execute([$id]);

        $stmt = $this->db->prepare("DELETE FROM SMS_NOTIFICATION WHERE SMS_NO_ID = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Add Detail entry to a notification
     */
    public function addDetail($notificationId, $data, $userId) {
        $dtlId = $data['SMS_NODTLS_ID'] ?? ('NDTL_' . strtoupper(uniqid()));
        $desc = $data['SMS_NODTLS_DESC'] ?? ($data['detail_desc'] ?? '');
        $img = !empty($data['image']) ? $data['image'] : (!empty($data['SMS_NODTLS_IMG']) ? $data['SMS_NODTLS_IMG'] : null);
        $assignTo = $data['SMS_DTLS_ASSIGN_TO'] ?? ($data['assign_to'] ?? null);
        $closed = $data['SMS_DTLS_CLOSED'] ?? 'OPEN';
        $closedBy = ($closed === 'CLOSED' || $closed === '1') ? ($data['SMS_DTLS_CLOSEDBY'] ?? $userId) : null;

        $stmt = $this->db->prepare("INSERT INTO SMS_NO_DTLS 
            (SMS_NODTLS_ID, SMS_NODTLS_DESC, SMS_NODTLS_IMG, SMS_NOID, SMS_DTLS_ASSIGN_TO, SMS_DTLS_UPDTDBY, SMS_DTLS_UPDT, SMS_DTLS_CLOSED, SMS_DTLS_CLOSEDBY)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)");
        $stmt->execute([$dtlId, $desc, $img, $notificationId, $assignTo, $userId, $closed, $closedBy]);

        return $this->getDetailById($dtlId);
    }

    /**
     * Update detail entry
     */
    public function updateDetail($detailId, $data, $userId) {
        $fields = [];
        $params = [];

        if (isset($data['SMS_NODTLS_DESC']) || isset($data['detail_desc'])) {
            $fields[] = "SMS_NODTLS_DESC = ?";
            $params[] = $data['SMS_NODTLS_DESC'] ?? $data['detail_desc'];
        }
        if (isset($data['image']) || isset($data['SMS_NODTLS_IMG'])) {
            $fields[] = "SMS_NODTLS_IMG = ?";
            $params[] = $data['image'] ?? $data['SMS_NODTLS_IMG'];
        }
        if (isset($data['SMS_DTLS_ASSIGN_TO']) || isset($data['assign_to'])) {
            $fields[] = "SMS_DTLS_ASSIGN_TO = ?";
            $params[] = $data['SMS_DTLS_ASSIGN_TO'] ?? $data['assign_to'];
        }
        if (isset($data['SMS_DTLS_CLOSED']) || isset($data['closed'])) {
            $isClosed = $data['SMS_DTLS_CLOSED'] ?? $data['closed'];
            $fields[] = "SMS_DTLS_CLOSED = ?";
            $params[] = $isClosed;

            if ($isClosed === 'CLOSED' || $isClosed === '1' || $isClosed === true) {
                $fields[] = "SMS_DTLS_CLOSEDBY = ?";
                $params[] = $userId;
            }
        }

        $fields[] = "SMS_DTLS_UPDTDBY = ?";
        $params[] = $userId;
        $fields[] = "SMS_DTLS_UPDT = NOW()";

        $params[] = $detailId;
        $sql = "UPDATE SMS_NO_DTLS SET " . implode(', ', $fields) . " WHERE SMS_NODTLS_ID = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $this->getDetailById($detailId);
    }

    /**
     * Delete a single detail entry
     */
    public function deleteDetail($detailId) {
        $stmt = $this->db->prepare("DELETE FROM SMS_NO_DTLS WHERE SMS_NODTLS_ID = ?");
        return $stmt->execute([$detailId]);
    }

    public function getDetailById($detailId) {
        $stmt = $this->db->prepare("SELECT d.SMS_NODTLS_ID, d.SMS_NODTLS_DESC, d.SMS_NOID, 
                                           d.SMS_DTLS_ASSIGN_TO, d.SMS_DTLS_UPDTDBY, d.SMS_DTLS_UPDT, 
                                           d.SMS_DTLS_CLOSED, d.SMS_DTLS_CLOSEDBY,
                                           CASE WHEN d.SMS_NODTLS_IMG IS NOT NULL AND LENGTH(d.SMS_NODTLS_IMG) > 0 THEN 1 ELSE 0 END as has_image,
                                           u_ass.user_first_name as assign_first_name, u_ass.user_last_name as assign_last_name,
                                           u_upd.user_first_name as updated_by_first_name, u_upd.user_last_name as updated_by_last_name,
                                           u_cls.user_first_name as closed_by_first_name, u_cls.user_last_name as closed_by_last_name
                                    FROM SMS_NO_DTLS d
                                    LEFT JOIN SM_USER_LOGIN u_ass ON d.SMS_DTLS_ASSIGN_TO = u_ass.user_id
                                    LEFT JOIN SM_USER_LOGIN u_upd ON d.SMS_DTLS_UPDTDBY = u_upd.user_id
                                    LEFT JOIN SM_USER_LOGIN u_cls ON d.SMS_DTLS_CLOSEDBY = u_cls.user_id
                                    WHERE d.SMS_NODTLS_ID = ? LIMIT 1");
        $stmt->execute([$detailId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
