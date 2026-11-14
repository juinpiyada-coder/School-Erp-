<?php
require_once __DIR__ . '/../../Core/Config/Database.php';

class FinanceModel {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTables();
    }

    /**
     * Ensure all 6 Finance Module Tables exist seamlessly in database
     */
    private function ensureTables() {
        try {
            // 1. SMS_BRCH_CLASS_FEE (Fee structure per class & stream)
            $this->db->exec("
                CREATE TABLE IF NOT EXISTS `SMS_BRCH_CLASS_FEE` (
                  `SMS_BR_CLS_FEE_ID` varchar(100) NOT NULL,
                  `SMS_BR_CLS_ID` varchar(100) DEFAULT NULL,
                  `SMS_BR_CLS_STREAM` varchar(50) NOT NULL DEFAULT 'GENERAL',
                  `SMS_BR_FEE_TOTAL` decimal(12,2) NOT NULL DEFAULT 0.00,
                  `SMS_BR_FEE_YEAR` varchar(20) DEFAULT NULL,
                  `SMS_BR_FEE_CREATEDBY` varchar(100) DEFAULT NULL,
                  `SMS_BR_FEE_CREATEDAT` datetime DEFAULT current_timestamp(),
                  PRIMARY KEY (`SMS_BR_CLS_FEE_ID`),
                  KEY `IDX_FEE_CLASS_ID` (`SMS_BR_CLS_ID`)
                ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
            ");

            // 2. SMS_BRCH_CLS_FEE_DTLS (Itemized fee breakdown)
            $this->db->exec("
                CREATE TABLE IF NOT EXISTS `SMS_BRCH_CLS_FEE_DTLS` (
                  `SMS_BRCH_FEE_DTLS_ID` varchar(100) NOT NULL,
                  `SMS_BRCH_CLS_FEE_ID` varchar(100) NOT NULL,
                  `SMS_FEE_DESC` varchar(150) NOT NULL,
                  `SMS_FEE_AMT` decimal(12,2) NOT NULL DEFAULT 0.00,
                  PRIMARY KEY (`SMS_BRCH_FEE_DTLS_ID`),
                  KEY `IDX_FEE_HEADER_ID` (`SMS_BRCH_CLS_FEE_ID`)
                ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
            ");

            // 3. SMS_STU_FINE (Student penalties & fines)
            $this->db->exec("
                CREATE TABLE IF NOT EXISTS `SMS_STU_FINE` (
                  `SMS_STU_FINE_ID` varchar(100) NOT NULL,
                  `SMS_FINE_STU_ID` varchar(100) NOT NULL,
                  `SMS_FINE_AMOUNT` decimal(12,2) NOT NULL DEFAULT 0.00,
                  `SMS_FINE_PAID` varchar(1) DEFAULT 'N',
                  `SMS_FINE_DESC` varchar(255) DEFAULT NULL,
                  `SMS_FINE_POSTED` datetime DEFAULT current_timestamp(),
                  `SMS_FINE_PAID_DT` datetime DEFAULT NULL,
                  PRIMARY KEY (`SMS_STU_FINE_ID`),
                  KEY `IDX_FINE_STUDENT_ID` (`SMS_FINE_STU_ID`)
                ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
            ");

            // 4. SMS_STU_FEE_MAP (Student allocation, monthly due & discounts)
            $this->db->exec("
                CREATE TABLE IF NOT EXISTS `SMS_STU_FEE_MAP` (
                  `SMS_STU_FEE_MAP_ID` varchar(100) NOT NULL,
                  `SMS_STU_ID` varchar(100) NOT NULL,
                  `SMS_STU_FEE_AMT` decimal(12,2) NOT NULL DEFAULT 0.00,
                  `SMS_STU_FEE_MTH` varchar(20) NOT NULL,
                  `SMS_STU_DISCOUNT` decimal(12,2) DEFAULT 0.00,
                  `SMS_STU_YEAR` varchar(20) DEFAULT NULL,
                  `SMS_STU_FEE_PAID_FULL` varchar(1) DEFAULT 'N',
                  PRIMARY KEY (`SMS_STU_FEE_MAP_ID`),
                  KEY `IDX_FEEMAP_STUDENT_ID` (`SMS_STU_ID`)
                ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
            ");

            // 5. SMS_STU_FEE_PAYMENT (Payments, transaction dates, modes & receipts)
            $this->db->exec("
                CREATE TABLE IF NOT EXISTS `SMS_STU_FEE_PAYMENT` (
                  `SMS_FEE_PMT_ID` varchar(100) NOT NULL,
                  `SMS_STU_ID` varchar(100) NOT NULL,
                  `SMS_STU_PMT_DT` datetime DEFAULT current_timestamp(),
                  `SMS_STU_PMT_AMT` decimal(12,2) NOT NULL DEFAULT 0.00,
                  `SMS_STU_PMT_MTH` varchar(20) DEFAULT NULL,
                  `SMS_STU_PAID_FULL` varchar(1) DEFAULT 'Y',
                  `SMS_STU_RECEIPT` mediumblob DEFAULT NULL,
                  PRIMARY KEY (`SMS_FEE_PMT_ID`),
                  KEY `IDX_PMT_STUDENT_ID` (`SMS_STU_ID`)
                ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
            ");

            // 6. BRCH_FEE_COLLECTED (Branch fee aggregation report)
            $this->db->exec("
                CREATE TABLE IF NOT EXISTS `BRCH_FEE_COLLECTED` (
                  `BRCH_FEE_COLL_ID` varchar(100) NOT NULL,
                  `BRCH_ID` varchar(100) NOT NULL,
                  `BRCH_CLASS_ID` varchar(100) NOT NULL,
                  `BRCH_FEE_AMT` decimal(15,2) NOT NULL DEFAULT 0.00,
                  `BRCH_FEE_MTH` varchar(20) DEFAULT NULL,
                  `BRCH_FEE_YR` varchar(20) DEFAULT NULL,
                  `BRCH_FEE_DELAY` int(11) DEFAULT 0,
                  PRIMARY KEY (`BRCH_FEE_COLL_ID`),
                  KEY `IDX_COLL_BRANCH_ID` (`BRCH_ID`),
                  KEY `IDX_COLL_CLASS_ID` (`BRCH_CLASS_ID`)
                ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
            ");
        } catch (Exception $e) {
            error_log("FinanceModel ensureTables failed: " . $e->getMessage());
        }
    }

    public function getDb() {
        return $this->db;
    }

    // =========================================================================
    // 1. CLASS FEE STRUCTURE CRUD (SMS_BRCH_CLASS_FEE)
    // =========================================================================

    public function getClassFees($user = null, $branchId = null) {
        $sql = "
            SELECT f.*, 
                   c.SCHL_BR_CLASS_NM as className, 
                   c.SCHL_BR_CENT_ID as branchId,
                   b.SCHL_BR_NM as branchName,
                   (SELECT COUNT(*) FROM SMS_BRCH_CLS_FEE_DTLS d WHERE d.SMS_BRCH_CLS_FEE_ID = f.SMS_BR_CLS_FEE_ID) as componentCount
            FROM SMS_BRCH_CLASS_FEE f
            LEFT JOIN SCHL_BR_CLASS c ON f.SMS_BR_CLS_ID = c.SCHL_BR_CLS_ID
            LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
            WHERE 1=1
        ";
        $params = [];

        if (!empty($branchId)) {
            $sql .= " AND c.SCHL_BR_CENT_ID = ?";
            $params[] = $branchId;
        } elseif ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND (b.SCHL_BR_CENTER_ID = ? OR c.SCHL_BR_CENT_ID IN (SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ?))";
                $params[] = $userId;
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE') {
                $userBranchId = $user['branch_id'] ?? $user['user_branch_id'] ?? $userId;
                $sql .= " AND c.SCHL_BR_CENT_ID = ?";
                $params[] = $userBranchId;
            }
        }

        $sql .= " ORDER BY c.SCHL_BR_CLASS_NM ASC, f.SMS_BR_FEE_YEAR DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getClassFeeById($id) {
        $sql = "
            SELECT f.*, 
                   c.SCHL_BR_CLASS_NM as className, 
                   c.SCHL_BR_CENT_ID as branchId,
                   b.SCHL_BR_NM as branchName
            FROM SMS_BRCH_CLASS_FEE f
            LEFT JOIN SCHL_BR_CLASS c ON f.SMS_BR_CLS_ID = c.SCHL_BR_CLS_ID
            LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
            WHERE f.SMS_BR_CLS_FEE_ID = ?
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $row['components'] = $this->getFeeDetails($id);
        }
        return $row ?: null;
    }

    public function createClassFee($data) {
        if (empty($data['SMS_BR_CLS_FEE_ID'])) {
            $data['SMS_BR_CLS_FEE_ID'] = 'FEE_' . strtoupper(bin2hex(random_bytes(4)));
        }
        $stmt = $this->db->prepare("
            INSERT INTO SMS_BRCH_CLASS_FEE (
                SMS_BR_CLS_FEE_ID, SMS_BR_CLS_ID, SMS_BR_CLS_STREAM, SMS_BR_FEE_TOTAL, SMS_BR_FEE_YEAR, SMS_BR_FEE_CREATEDBY
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['SMS_BR_CLS_FEE_ID'],
            $data['SMS_BR_CLS_ID'] ?? null,
            $data['SMS_BR_CLS_STREAM'] ?? 'GENERAL',
            $data['SMS_BR_FEE_TOTAL'] ?? 0.00,
            $data['SMS_BR_FEE_YEAR'] ?? date('Y') . '-' . (date('Y') + 1),
            $data['SMS_BR_FEE_CREATEDBY'] ?? null
        ]);

        // Insert components if passed
        if (!empty($data['components']) && is_array($data['components'])) {
            foreach ($data['components'] as $comp) {
                if (!empty($comp['SMS_FEE_DESC'])) {
                    $this->createFeeDetail([
                        'SMS_BRCH_CLS_FEE_ID' => $data['SMS_BR_CLS_FEE_ID'],
                        'SMS_FEE_DESC' => $comp['SMS_FEE_DESC'],
                        'SMS_FEE_AMT' => $comp['SMS_FEE_AMT'] ?? 0.00
                    ]);
                }
            }
        }

        return $data['SMS_BR_CLS_FEE_ID'];
    }

    public function updateClassFee($id, $data) {
        $stmt = $this->db->prepare("
            UPDATE SMS_BRCH_CLASS_FEE SET 
                SMS_BR_CLS_ID = COALESCE(?, SMS_BR_CLS_ID),
                SMS_BR_CLS_STREAM = COALESCE(?, SMS_BR_CLS_STREAM),
                SMS_BR_FEE_TOTAL = COALESCE(?, SMS_BR_FEE_TOTAL),
                SMS_BR_FEE_YEAR = COALESCE(?, SMS_BR_FEE_YEAR)
            WHERE SMS_BR_CLS_FEE_ID = ?
        ");
        $stmt->execute([
            $data['SMS_BR_CLS_ID'] ?? null,
            $data['SMS_BR_CLS_STREAM'] ?? null,
            $data['SMS_BR_FEE_TOTAL'] ?? null,
            $data['SMS_BR_FEE_YEAR'] ?? null,
            $id
        ]);

        if (isset($data['components']) && is_array($data['components'])) {
            // Replace existing details with new ones
            $this->db->prepare("DELETE FROM SMS_BRCH_CLS_FEE_DTLS WHERE SMS_BRCH_CLS_FEE_ID = ?")->execute([$id]);
            foreach ($data['components'] as $comp) {
                if (!empty($comp['SMS_FEE_DESC'])) {
                    $this->createFeeDetail([
                        'SMS_BRCH_CLS_FEE_ID' => $id,
                        'SMS_FEE_DESC' => $comp['SMS_FEE_DESC'],
                        'SMS_FEE_AMT' => $comp['SMS_FEE_AMT'] ?? 0.00
                    ]);
                }
            }
        }

        return true;
    }

    public function deleteClassFee($id) {
        $this->db->prepare("DELETE FROM SMS_BRCH_CLS_FEE_DTLS WHERE SMS_BRCH_CLS_FEE_ID = ?")->execute([$id]);
        $stmt = $this->db->prepare("DELETE FROM SMS_BRCH_CLASS_FEE WHERE SMS_BR_CLS_FEE_ID = ?");
        return $stmt->execute([$id]);
    }

    // =========================================================================
    // 2. FEE BREAKDOWN DETAILS CRUD (SMS_BRCH_CLS_FEE_DTLS)
    // =========================================================================

    public function getFeeDetails($feeHeaderId) {
        $stmt = $this->db->prepare("SELECT * FROM SMS_BRCH_CLS_FEE_DTLS WHERE SMS_BRCH_CLS_FEE_ID = ? ORDER BY SMS_FEE_AMT DESC");
        $stmt->execute([$feeHeaderId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function createFeeDetail($data) {
        $dtlId = 'FD_' . strtoupper(bin2hex(random_bytes(4)));
        $stmt = $this->db->prepare("
            INSERT INTO SMS_BRCH_CLS_FEE_DTLS (
                SMS_BRCH_FEE_DTLS_ID, SMS_BRCH_CLS_FEE_ID, SMS_FEE_DESC, SMS_FEE_AMT
            ) VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([
            $dtlId,
            $data['SMS_BRCH_CLS_FEE_ID'],
            $data['SMS_FEE_DESC'],
            $data['SMS_FEE_AMT'] ?? 0.00
        ]);
        return $dtlId;
    }

    // =========================================================================
    // 3. STUDENT FINES & PENALTIES CRUD (SMS_STU_FINE)
    // =========================================================================

    public function getFines($user = null, $branchId = null, $studentId = null) {
        $sql = "
            SELECT f.*, 
                   s.STU_NM as studentName,
                   s.STU_AADHAR as studentAadhar,
                   c.SCHL_BR_CLASS_NM as className,
                   sess.SCHL_BR_CLASS_SEC_SESS_SECT as sectionName,
                   b.SCHL_BR_NM as branchName,
                   b.SCHL_BR_ID as branchId
            FROM SMS_STU_FINE f
            JOIN SCHL_STU s ON f.SMS_FINE_STU_ID = s.STU_ID
            LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
            LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
            WHERE 1=1
        ";
        $params = [];

        if (!empty($studentId)) {
            $sql .= " AND f.SMS_FINE_STU_ID = ?";
            $params[] = $studentId;
        } elseif (!empty($branchId)) {
            $sql .= " AND (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ? OR c.SCHL_BR_CENT_ID = ?)";
            $params[] = $branchId;
            $params[] = $branchId;
        } elseif ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND (b.SCHL_BR_CENTER_ID = ? OR sess.SCHL_BR_CLASS_SEC_SESS_BR_ID IN (SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ?))";
                $params[] = $userId;
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE') {
                $userBranchId = $user['branch_id'] ?? $user['user_branch_id'] ?? $userId;
                $sql .= " AND (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ? OR c.SCHL_BR_CENT_ID = ?)";
                $params[] = $userBranchId;
                $params[] = $userBranchId;
            }
        }

        $sql .= " ORDER BY f.SMS_FINE_POSTED DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function createFine($data) {
        $fineId = 'FINE_' . strtoupper(bin2hex(random_bytes(4)));
        $stmt = $this->db->prepare("
            INSERT INTO SMS_STU_FINE (
                SMS_STU_FINE_ID, SMS_FINE_STU_ID, SMS_FINE_AMOUNT, SMS_FINE_PAID, SMS_FINE_DESC, SMS_FINE_POSTED
            ) VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $fineId,
            $data['SMS_FINE_STU_ID'],
            $data['SMS_FINE_AMOUNT'] ?? 0.00,
            $data['SMS_FINE_PAID'] ?? 'N',
            $data['SMS_FINE_DESC'] ?? 'Miscellaneous Fine'
        ]);
        return $fineId;
    }

    public function updateFineStatus($id, $isPaid) {
        $paidChar = strtoupper($isPaid) === 'Y' || $isPaid === true || $isPaid === 1 ? 'Y' : 'N';
        $paidDt = $paidChar === 'Y' ? date('Y-m-d H:i:s') : null;
        $stmt = $this->db->prepare("UPDATE SMS_STU_FINE SET SMS_FINE_PAID = ?, SMS_FINE_PAID_DT = ? WHERE SMS_STU_FINE_ID = ?");
        return $stmt->execute([$paidChar, $paidDt, $id]);
    }

    public function deleteFine($id) {
        $stmt = $this->db->prepare("DELETE FROM SMS_STU_FINE WHERE SMS_STU_FINE_ID = ?");
        return $stmt->execute([$id]);
    }

    // =========================================================================
    // 4. STUDENT FEE ALLOCATION & MAPPING (SMS_STU_FEE_MAP)
    // =========================================================================

    public function getStudentFeeMaps($user = null, $branchId = null, $studentId = null, $month = null, $year = null) {
        $sql = "
            SELECT m.*, 
                   s.STU_NM as studentName,
                   s.STU_AADHAR as studentAadhar,
                   s.STU_CONTACTNO as studentContact,
                   p.PRNT_NM as guardianName,
                   c.SCHL_BR_CLASS_NM as className,
                   sess.SCHL_BR_CLASS_SEC_SESS_SECT as sectionName,
                   b.SCHL_BR_NM as branchName,
                   b.SCHL_BR_ID as branchId,
                   (m.SMS_STU_FEE_AMT - COALESCE(m.SMS_STU_DISCOUNT, 0)) as netDue,
                   COALESCE((
                       SELECT SUM(p.SMS_STU_PMT_AMT) 
                       FROM SMS_STU_FEE_PAYMENT p 
                       WHERE p.SMS_STU_ID = m.SMS_STU_ID 
                         AND (p.SMS_STU_PMT_MTH = m.SMS_STU_FEE_MTH OR p.SMS_STU_PMT_MTH IS NULL)
                   ), 0.00) as paidAmount
            FROM SMS_STU_FEE_MAP m
            JOIN SCHL_STU s ON m.SMS_STU_ID = s.STU_ID
            LEFT JOIN SCHL_MSTR_PRNT p ON s.STU_PRNT_ID = p.PRNT_ID
            LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
            LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
            WHERE 1=1
        ";
        $params = [];

        if (!empty($studentId)) {
            $sql .= " AND m.SMS_STU_ID = ?";
            $params[] = $studentId;
        }
        if (!empty($month)) {
            $sql .= " AND m.SMS_STU_FEE_MTH = ?";
            $params[] = $month;
        }
        if (!empty($year)) {
            $sql .= " AND m.SMS_STU_YEAR = ?";
            $params[] = $year;
        }

        if (!empty($branchId)) {
            $sql .= " AND (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ? OR c.SCHL_BR_CENT_ID = ?)";
            $params[] = $branchId;
            $params[] = $branchId;
        } elseif ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND (b.SCHL_BR_CENTER_ID = ? OR sess.SCHL_BR_CLASS_SEC_SESS_BR_ID IN (SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ?))";
                $params[] = $userId;
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE') {
                $userBranchId = $user['branch_id'] ?? $user['user_branch_id'] ?? $userId;
                $sql .= " AND (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ? OR c.SCHL_BR_CENT_ID = ?)";
                $params[] = $userBranchId;
                $params[] = $userBranchId;
            }
        }

        $sql .= " ORDER BY m.SMS_STU_YEAR DESC, m.SMS_STU_FEE_MTH ASC, s.STU_NM ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function createStudentFeeMap($data) {
        $mapId = 'MAP_' . strtoupper(bin2hex(random_bytes(4)));
        $stmt = $this->db->prepare("
            INSERT INTO SMS_STU_FEE_MAP (
                SMS_STU_FEE_MAP_ID, SMS_STU_ID, SMS_STU_FEE_AMT, SMS_STU_FEE_MTH, SMS_STU_DISCOUNT, SMS_STU_YEAR, SMS_STU_FEE_PAID_FULL
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $mapId,
            $data['SMS_STU_ID'],
            $data['SMS_STU_FEE_AMT'] ?? 0.00,
            $data['SMS_STU_FEE_MTH'] ?? date('F'),
            $data['SMS_STU_DISCOUNT'] ?? 0.00,
            $data['SMS_STU_YEAR'] ?? date('Y'),
            $data['SMS_STU_FEE_PAID_FULL'] ?? 'N'
        ]);
        return $mapId;
    }

    public function batchAssignFeeToClass($classId, $feeAmount, $month, $year) {
        // Find all students currently in sessions belonging to this class
        $sql = "
            SELECT s.STU_ID 
            FROM SCHL_STU s
            JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            WHERE sess.SCHL_BR_CLASS_SEC_SESS_CLASS = ? OR s.STU_BR_CLASS_ID = ?
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$classId, $classId]);
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $assignedCount = 0;
        foreach ($students as $stu) {
            $stuId = $stu['STU_ID'];
            // Check if map already exists for this student, month and year
            $chk = $this->db->prepare("SELECT SMS_STU_FEE_MAP_ID FROM SMS_STU_FEE_MAP WHERE SMS_STU_ID = ? AND SMS_STU_FEE_MTH = ? AND SMS_STU_YEAR = ? LIMIT 1");
            $chk->execute([$stuId, $month, $year]);
            if (!$chk->fetch()) {
                $this->createStudentFeeMap([
                    'SMS_STU_ID' => $stuId,
                    'SMS_STU_FEE_AMT' => $feeAmount,
                    'SMS_STU_FEE_MTH' => $month,
                    'SMS_STU_YEAR' => $year,
                    'SMS_STU_DISCOUNT' => 0.00,
                    'SMS_STU_FEE_PAID_FULL' => 'N'
                ]);
                $assignedCount++;
            }
        }
        return $assignedCount;
    }

    public function deleteStudentFeeMap($id) {
        $stmt = $this->db->prepare("DELETE FROM SMS_STU_FEE_MAP WHERE SMS_STU_FEE_MAP_ID = ?");
        return $stmt->execute([$id]);
    }

    // =========================================================================
    // 5. STUDENT FEE PAYMENT TRANSACTIONS (SMS_STU_FEE_PAYMENT)
    // =========================================================================

    public function getPayments($user = null, $branchId = null, $studentId = null) {
        $sql = "
            SELECT p.*, 
                   s.STU_NM as studentName,
                   s.STU_AADHAR as studentAadhar,
                   pr.PRNT_NM as guardianName,
                   c.SCHL_BR_CLASS_NM as className,
                   b.SCHL_BR_NM as branchName,
                   b.SCHL_BR_ID as branchId
            FROM SMS_STU_FEE_PAYMENT p
            JOIN SCHL_STU s ON p.SMS_STU_ID = s.STU_ID
            LEFT JOIN SCHL_MSTR_PRNT pr ON s.STU_PRNT_ID = pr.PRNT_ID
            LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
            LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
            WHERE 1=1
        ";
        $params = [];

        if (!empty($studentId)) {
            $sql .= " AND p.SMS_STU_ID = ?";
            $params[] = $studentId;
        } elseif (!empty($branchId)) {
            $sql .= " AND (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ? OR c.SCHL_BR_CENT_ID = ?)";
            $params[] = $branchId;
            $params[] = $branchId;
        } elseif ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND (b.SCHL_BR_CENTER_ID = ? OR sess.SCHL_BR_CLASS_SEC_SESS_BR_ID IN (SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ?))";
                $params[] = $userId;
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE') {
                $userBranchId = $user['branch_id'] ?? $user['user_branch_id'] ?? $userId;
                $sql .= " AND (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = ? OR c.SCHL_BR_CENT_ID = ?)";
                $params[] = $userBranchId;
                $params[] = $userBranchId;
            }
        }

        $sql .= " ORDER BY p.SMS_STU_PMT_DT DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function recordPayment($data) {
        $pmtId = 'PMT_' . strtoupper(bin2hex(random_bytes(4)));
        $stmt = $this->db->prepare("
            INSERT INTO SMS_STU_FEE_PAYMENT (
                SMS_FEE_PMT_ID, SMS_STU_ID, SMS_STU_PMT_DT, SMS_STU_PMT_AMT, SMS_STU_PMT_MTH, SMS_STU_PAID_FULL, SMS_STU_RECEIPT
            ) VALUES (?, ?, NOW(), ?, ?, ?, ?)
        ");
        $stmt->execute([
            $pmtId,
            $data['SMS_STU_ID'],
            $data['SMS_STU_PMT_AMT'] ?? 0.00,
            $data['SMS_STU_PMT_MTH'] ?? date('F'),
            $data['SMS_STU_PAID_FULL'] ?? 'Y',
            $data['SMS_STU_RECEIPT'] ?? null
        ]);

        // Automatically update matching SMS_STU_FEE_MAP status to Y if fully paid
        if (!empty($data['SMS_STU_ID']) && !empty($data['SMS_STU_PMT_MTH'])) {
            try {
                $upd = $this->db->prepare("
                    UPDATE SMS_STU_FEE_MAP 
                    SET SMS_STU_FEE_PAID_FULL = 'Y' 
                    WHERE SMS_STU_ID = ? AND SMS_STU_FEE_MTH = ?
                ");
                $upd->execute([$data['SMS_STU_ID'], $data['SMS_STU_PMT_MTH']]);
            } catch (Exception $ex) {}
        }

        return $pmtId;
    }

    // =========================================================================
    // 6. BRANCH FEE COLLECTION AGGREGATION (BRCH_FEE_COLLECTED)
    // =========================================================================

    public function getBranchFeeCollections($user = null, $branchId = null) {
        $sql = "
            SELECT coll.*, 
                   b.SCHL_BR_NM as branchName,
                   c.SCHL_BR_CLASS_NM as className
            FROM BRCH_FEE_COLLECTED coll
            JOIN SCHL_BRANCH b ON coll.BRCH_ID = b.SCHL_BR_ID
            JOIN SCHL_BR_CLASS c ON coll.BRCH_CLASS_ID = c.SCHL_BR_CLS_ID
            WHERE 1=1
        ";
        $params = [];

        if (!empty($branchId)) {
            $sql .= " AND coll.BRCH_ID = ?";
            $params[] = $branchId;
        } elseif ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE') {
                $userBranchId = $user['branch_id'] ?? $user['user_branch_id'] ?? $userId;
                $sql .= " AND coll.BRCH_ID = ?";
                $params[] = $userBranchId;
            }
        }

        $sql .= " ORDER BY coll.BRCH_FEE_YR DESC, coll.BRCH_FEE_MTH DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // =========================================================================
    // 7. COMPREHENSIVE FINANCIAL OVERVIEW ANALYTICS
    // =========================================================================

    public function getFinanceOverview($user = null, $branchId = null) {
        // Multi-tenant scope
        $branchScope = "";
        $params = [];

        if (!empty($branchId)) {
            $branchScope = " AND (b.SCHL_BR_ID = ? OR c.SCHL_BR_CENT_ID = ?)";
            $params = [$branchId, $branchId];
        } elseif ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $branchScope = " AND (b.SCHL_BR_CENTER_ID = ? OR c.SCHL_BR_CENT_ID IN (SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ?))";
                $params = [$userId, $userId];
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE') {
                $userBranchId = $user['branch_id'] ?? $user['user_branch_id'] ?? $userId;
                $branchScope = " AND (b.SCHL_BR_ID = ? OR c.SCHL_BR_CENT_ID = ?)";
                $params = [$userBranchId, $userBranchId];
            }
        }

        // Total Expected Fee from allocations
        $expectedSql = "
            SELECT COALESCE(SUM(m.SMS_STU_FEE_AMT - COALESCE(m.SMS_STU_DISCOUNT, 0)), 0) as totalExpected
            FROM SMS_STU_FEE_MAP m
            JOIN SCHL_STU s ON m.SMS_STU_ID = s.STU_ID
            LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
            LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
            WHERE 1=1 {$branchScope}
        ";
        $stmtExp = $this->db->prepare($expectedSql);
        $stmtExp->execute($params);
        $totalExpected = (float)$stmtExp->fetchColumn();

        // Total Collected / Payments
        $collectedSql = "
            SELECT COALESCE(SUM(p.SMS_STU_PMT_AMT), 0) as totalCollected
            FROM SMS_STU_FEE_PAYMENT p
            JOIN SCHL_STU s ON p.SMS_STU_ID = s.STU_ID
            LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
            LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
            WHERE 1=1 {$branchScope}
        ";
        $stmtCol = $this->db->prepare($collectedSql);
        $stmtCol->execute($params);
        $totalCollected = (float)$stmtCol->fetchColumn();

        // Total Pending Fines
        $finesSql = "
            SELECT COALESCE(SUM(f.SMS_FINE_AMOUNT), 0) as totalFines,
                   COALESCE(SUM(CASE WHEN f.SMS_FINE_PAID = 'Y' THEN f.SMS_FINE_AMOUNT ELSE 0 END), 0) as finesCollected
            FROM SMS_STU_FINE f
            JOIN SCHL_STU s ON f.SMS_FINE_STU_ID = s.STU_ID
            LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
            LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
            LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
            WHERE 1=1 {$branchScope}
        ";
        $stmtFine = $this->db->prepare($finesSql);
        $stmtFine->execute($params);
        $fineRes = $stmtFine->fetch(PDO::FETCH_ASSOC);
        $totalFines = (float)($fineRes['totalFines'] ?? 0);
        $finesCollected = (float)($fineRes['finesCollected'] ?? 0);
        $pendingFines = $totalFines - $finesCollected;

        $totalDue = max(0, $totalExpected - $totalCollected);
        $collectionRate = $totalExpected > 0 ? round(($totalCollected / $totalExpected) * 100, 1) : 0;

        return [
            'totalExpected' => $totalExpected,
            'totalCollected' => $totalCollected,
            'totalDue' => $totalDue,
            'collectionRate' => $collectionRate,
            'totalFines' => $totalFines,
            'finesCollected' => $finesCollected,
            'pendingFines' => $pendingFines,
            'currency' => '₹',
            'academicYear' => date('Y') . '-' . (date('Y') + 1)
        ];
    }
}

