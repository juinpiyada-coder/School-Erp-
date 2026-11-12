<?php
require_once dirname(__DIR__, 2) . '/Core/Config/Database.php';

class ReportsModel {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getOverviewStats($branchId = null, $user = null) {
        $stats = [
            'total_students' => 0,
            'total_teachers' => 0,
            'total_branches' => 0,
            'total_classes'  => 0
        ];

        try {
            // Apply tenant filtering logic
            $filterCenterId = null;
            $filterBranchId = $branchId;

            if ($user) {
                if ($user['role_id'] === 'R_SCHOOLADMIN') {
                    $filterCenterId = $user['userId'];
                } elseif ($user['role_id'] === 'R_BRANCHADMIN') {
                    $filterBranchId = $user['userId']; // Override any requested branch with their own
                }
            }

            if ($filterBranchId) {
                // Verify branch belongs to center if school admin
                if ($filterCenterId) {
                    $chk = $this->db->prepare("SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_ID = ? AND SCHL_BR_CENTER_ID = ?");
                    $chk->execute([$filterBranchId, $filterCenterId]);
                    if (!$chk->fetchColumn()) {
                        return $stats; // Unauthorized access to this branch
                    }
                }
                
                // Students for branch
                $stmt = $this->db->prepare("
                    SELECT COUNT(s.STU_ID) 
                    FROM SCHL_STU s 
                    JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID 
                    WHERE sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ?
                ");
                $stmt->execute([$filterBranchId]);
                $stats['total_students'] = (int)$stmt->fetchColumn();

                // Teachers for branch
                $stmt = $this->db->prepare("SELECT COUNT(*) FROM SCHL_BR_TCHR WHERE BR_TCHR_BR_ID = ?");
                $stmt->execute([$filterBranchId]);
                $stats['total_teachers'] = (int)$stmt->fetchColumn();

                $stats['total_branches'] = 1;

                // Classes for branch
                $stmt = $this->db->prepare("SELECT COUNT(DISTINCT SCHL_BR_CLASS_SEC_SESS_CLASS) FROM SCHL_BR_CLASS_SEC_SESSION WHERE SCHL_BR_CLASS_SEC_SESS_BR_ID = ?");
                $stmt->execute([$filterBranchId]);
                $stats['total_classes'] = (int)$stmt->fetchColumn();

            } elseif ($filterCenterId) {
                // Overview for School Admin (All their branches)
                $stmt = $this->db->prepare("
                    SELECT COUNT(s.STU_ID) 
                    FROM SCHL_STU s 
                    JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID 
                    JOIN SCHL_BRANCH b ON sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID
                    WHERE b.SCHL_BR_CENTER_ID = ?
                ");
                $stmt->execute([$filterCenterId]);
                $stats['total_students'] = (int)$stmt->fetchColumn();

                $stmt = $this->db->prepare("
                    SELECT COUNT(t.BR_TCHR_ID) FROM SCHL_BR_TCHR t
                    JOIN SCHL_BRANCH b ON t.BR_TCHR_BR_ID = b.SCHL_BR_ID
                    WHERE b.SCHL_BR_CENTER_ID = ?
                ");
                $stmt->execute([$filterCenterId]);
                $stats['total_teachers'] = (int)$stmt->fetchColumn();

                $stmt = $this->db->prepare("SELECT COUNT(*) FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ?");
                $stmt->execute([$filterCenterId]);
                $stats['total_branches'] = (int)$stmt->fetchColumn();

                $stmt = $this->db->prepare("
                    SELECT COUNT(DISTINCT sess.SCHL_BR_CLASS_SEC_SESS_CLASS) 
                    FROM SCHL_BR_CLASS_SEC_SESSION sess
                    JOIN SCHL_BRANCH b ON sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID
                    WHERE b.SCHL_BR_CENTER_ID = ?
                ");
                $stmt->execute([$filterCenterId]);
                $stats['total_classes'] = (int)$stmt->fetchColumn();

            } else {
                // Overview for Super Admin (All data)
                $stmt = $this->db->query("SELECT COUNT(*) FROM SCHL_STU");
                $stats['total_students'] = (int)$stmt->fetchColumn();
                
                $stmt = $this->db->query("SELECT COUNT(*) FROM SCHL_BR_TCHR");
                $stats['total_teachers'] = (int)$stmt->fetchColumn();

                $stmt = $this->db->query("SELECT COUNT(*) FROM SCHL_BRANCH");
                $stats['total_branches'] = (int)$stmt->fetchColumn();

                $stmt = $this->db->query("SELECT COUNT(*) FROM SCHL_BR_CLASS");
                $stats['total_classes'] = (int)$stmt->fetchColumn();
            }
        } catch (Exception $e) {
            // Ignore missing tables or columns gracefully
        }

        return $stats;
    }

    public function getStudentsByBranch($user = null) {
        try {
            $sql = "
                SELECT 
                    b.SCHL_BR_NM AS name, 
                    COUNT(s.STU_ID) AS value
                FROM SCHL_BRANCH b
                LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON b.SCHL_BR_ID = sess.SCHL_BR_CLASS_SEC_SESS_BR_ID
                LEFT JOIN SCHL_STU s ON sess.SCHL_BR_CLASS_SEC_SESS_ID = s.STU_BR_CLASS_ID
                WHERE 1=1
            ";
            
            $params = [];
            if ($user && $user['role_id'] === 'R_SCHOOLADMIN') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $user['userId'];
            } elseif ($user && $user['role_id'] === 'R_BRANCHADMIN') {
                $sql .= " AND b.SCHL_BR_ID = ?";
                $params[] = $user['userId'];
            }

            $sql .= " GROUP BY b.SCHL_BR_ID, b.SCHL_BR_NM ORDER BY value DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return [];
        }
    }

    public function getTeachersByBranch($user = null) {
        try {
            $sql = "
                SELECT 
                    b.SCHL_BR_NM AS name, 
                    COUNT(t.BR_TCHR_ID) AS value
                FROM SCHL_BRANCH b
                LEFT JOIN SCHL_BR_TCHR t ON b.SCHL_BR_ID = t.BR_TCHR_BR_ID
                WHERE 1=1
            ";
            
            $params = [];
            if ($user && $user['role_id'] === 'R_SCHOOLADMIN') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $user['userId'];
            } elseif ($user && $user['role_id'] === 'R_BRANCHADMIN') {
                $sql .= " AND b.SCHL_BR_ID = ?";
                $params[] = $user['userId'];
            }

            $sql .= " GROUP BY b.SCHL_BR_ID, b.SCHL_BR_NM ORDER BY value DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return [];
        }
    }
}

