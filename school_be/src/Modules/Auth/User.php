<?php

class User {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureColumns();
    }

    private function ensureColumns() {
        // NOTE: "ADD COLUMN IF NOT EXISTS" is MariaDB-only and fails on MySQL,
        // so check information_schema and add each missing column separately.
        try {
            $needed = [
                'USER_FIRST_NAME' => 'VARCHAR(100) NULL',
                'USER_LAST_NAME'  => 'VARCHAR(100) NULL',
                'USER_SCHOOL_ID'  => 'VARCHAR(100) NULL',
                'USER_BRANCH_ID'  => 'VARCHAR(100) NULL',
            ];
            $stmt = $this->db->query("SELECT UPPER(COLUMN_NAME) FROM information_schema.COLUMNS
                                      WHERE TABLE_SCHEMA = DATABASE() AND UPPER(TABLE_NAME) = 'SM_USER_LOGIN'");
            $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($needed as $col => $def) {
                if (!in_array($col, $existing, true)) {
                    try { $this->db->exec("ALTER TABLE SM_USER_LOGIN ADD COLUMN $col $def"); } catch (Exception $e) {}
                }
            }
            $this->db->exec("ALTER TABLE SM_USER_LOGIN MODIFY COLUMN USER_IMG MEDIUMBLOB");
            $this->db->exec("ALTER TABLE SM_USER_LOGIN MODIFY COLUMN USER_ROLE VARCHAR(500) NULL");
        } catch (Exception $e) {}
    }

    /** Is this email already used by another login? */
    public function emailTaken($email, $exceptUserId = null) {
        $sql = "SELECT user_id FROM SM_USER_LOGIN WHERE LOWER(user_email_id) = LOWER(?)";
        $params = [$email];
        if ($exceptUserId !== null) {
            $sql .= " AND user_id <> ?";
            $params[] = $exceptUserId;
        }
        $stmt = $this->db->prepare($sql . " LIMIT 1");
        $stmt->execute($params);
        return (bool)$stmt->fetch();
    }

    public function getAll($user = null) {
        $sql = "SELECT u.user_id, u.user_email_id, u.user_first_name, u.user_last_name, 
                       u.user_cr_dt, u.user_role, u.user_school_id, u.user_branch_id, u.user_img,
                       r.MAS_role_DESC as role_name,
                       s.SCHL_MN_NM as school_name,
                       b.SCHL_BR_NM as branch_name
                FROM SM_USER_LOGIN u
                LEFT JOIN SM_MAS_ROLE r ON u.user_role = r.MAS_role_id
                LEFT JOIN MSTR_SCHOOL_MAIN s ON u.user_school_id = s.SCHL_MN_ID
                LEFT JOIN SCHL_BRANCH b ON u.user_branch_id = b.SCHL_BR_ID
                WHERE 1=1";
        $params = [];

        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $scopeId = $user['school_id'] ?? $userId;
                $sql .= " AND (u.user_school_id = ? OR u.user_branch_id IN (SELECT SCHL_BR_ID FROM SCHL_BRANCH WHERE SCHL_BR_CENTER_ID = ?) OR u.user_id = ?)";
                $params[] = $scopeId;
                $params[] = $scopeId;
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND (u.user_branch_id = ? OR u.user_id = ?)";
                $params[] = $user['branch_id'] ?? $userId;
                $params[] = $userId;
            }
        }

        $sql .= " ORDER BY u.user_cr_dt DESC, u.user_id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll();

        foreach ($users as &$u) {
            if ($u['user_img'] !== null && $u['user_img'] !== '') {
                $raw = $u['user_img'];
                if (is_string($raw) && strpos($raw, 'data:image') === 0) {
                    $u['user_img'] = $raw;
                } else {
                    $u['user_img'] = 'data:image/jpeg;base64,' . base64_encode($raw);
                }
            } else {
                $u['user_img'] = null;
            }
            $u['full_name'] = trim(($u['user_first_name'] ?? '') . ' ' . ($u['user_last_name'] ?? ''));
            if (!$u['full_name']) $u['full_name'] = $u['user_id'];

            // Handle multi-role support
            $rolesArr = array_filter(array_map('trim', explode(',', $u['user_role'] ?? '')));
            $u['roles'] = $rolesArr;
            if (count($rolesArr) > 1) {
                // Fetch descriptions for all assigned roles
                $inQuery = implode(',', array_fill(0, count($rolesArr), '?'));
                $rStmt = $this->db->prepare("SELECT MAS_role_id, MAS_role_DESC FROM SM_MAS_ROLE WHERE MAS_role_id IN ($inQuery)");
                $rStmt->execute($rolesArr);
                $rMap = $rStmt->fetchAll(PDO::FETCH_KEY_PAIR);
                $descList = [];
                foreach ($rolesArr as $rk) {
                    $descList[] = $rMap[$rk] ?? $rk;
                }
                $u['role_name'] = implode(', ', $descList);
            }
        }
        return $users;
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT u.user_id, u.user_email_id, u.user_first_name, u.user_last_name, 
                                           u.user_cr_dt, u.user_role, u.user_school_id, u.user_branch_id, u.user_img,
                                           r.MAS_role_DESC as role_name,
                                           s.SCHL_MN_NM as school_name,
                                           b.SCHL_BR_NM as branch_name
                                    FROM SM_USER_LOGIN u
                                    LEFT JOIN SM_MAS_ROLE r ON u.user_role = r.MAS_role_id
                                    LEFT JOIN MSTR_SCHOOL_MAIN s ON u.user_school_id = s.SCHL_MN_ID
                                    LEFT JOIN SCHL_BRANCH b ON u.user_branch_id = b.SCHL_BR_ID
                                    WHERE u.user_id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if ($user && $user['user_img'] !== null && $user['user_img'] !== '') {
            $raw = $user['user_img'];
            if (is_string($raw) && strpos($raw, 'data:image') === 0) {
                $user['user_img'] = $raw;
            } else {
                $user['user_img'] = 'data:image/jpeg;base64,' . base64_encode($raw);
            }
        } else if ($user) {
            $user['user_img'] = null;
        }
        if ($user) {
            $user['full_name'] = trim(($user['user_first_name'] ?? '') . ' ' . ($user['user_last_name'] ?? ''));
            if (!$user['full_name']) $user['full_name'] = $user['user_id'];

            // Handle multi-role support
            $rolesArr = array_filter(array_map('trim', explode(',', $user['user_role'] ?? '')));
            $user['roles'] = $rolesArr;
            if (count($rolesArr) > 1) {
                $inQuery = implode(',', array_fill(0, count($rolesArr), '?'));
                $rStmt = $this->db->prepare("SELECT MAS_role_id, MAS_role_DESC FROM SM_MAS_ROLE WHERE MAS_role_id IN ($inQuery)");
                $rStmt->execute($rolesArr);
                $rMap = $rStmt->fetchAll(PDO::FETCH_KEY_PAIR);
                $descList = [];
                foreach ($rolesArr as $rk) {
                    $descList[] = $rMap[$rk] ?? $rk;
                }
                $user['role_name'] = implode(', ', $descList);
            }
        }
        return $user;
    }

    public function getByEmailWithPassword($email) {
        $sql = "SELECT u.user_id, u.user_email_id, u.user_first_name, u.user_last_name, u.user_passwd, 
                       u.user_role, u.user_school_id, u.user_branch_id, u.user_img, r.MAS_role_DESC 
                FROM SM_USER_LOGIN u 
                LEFT JOIN SM_MAS_ROLE r ON u.user_role = r.MAS_role_id 
                WHERE u.user_email_id = ? OR u.user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email, $email]);
        return $stmt->fetch();
    }

    public function create($data) {
        $img = null;
        if (!empty($data['user_img'])) {
            $imgRaw = $data['user_img'];
            if (is_string($imgRaw) && preg_match('/^data:image\/(\w+);base64,/', $imgRaw)) {
                $imgRaw = substr($imgRaw, strpos($imgRaw, ',') + 1);
            }
            $img = base64_decode($imgRaw) ?: $data['user_img'];
        }
        
        $passwd = isset($data['user_passwd']) ? password_hash($data['user_passwd'], PASSWORD_BCRYPT) : null;
        $cr_dt = $data['user_cr_dt'] ?? date('Y-m-d');

        $stmt = $this->db->prepare("INSERT INTO SM_USER_LOGIN (user_id, user_email_id, user_first_name, user_last_name, user_passwd, user_cr_dt, user_role, user_school_id, user_branch_id, user_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        return $stmt->execute([
            $data['user_id'],
            $data['user_email_id'] ?? null,
            $data['user_first_name'] ?? null,
            $data['user_last_name'] ?? null,
            $passwd,
            $cr_dt,
            $data['user_role'] ?? null,
            $data['user_school_id'] ?? null,
            $data['user_branch_id'] ?? null,
            $img
        ]);
    }

    public function update($id, $data) {
        $updates = [];
        $params = [];
        
        if (array_key_exists('user_email_id', $data)) {
            $updates[] = "user_email_id = ?";
            $params[] = $data['user_email_id'];
        }
        if (array_key_exists('user_first_name', $data)) {
            $updates[] = "user_first_name = ?";
            $params[] = $data['user_first_name'];
        }
        if (array_key_exists('user_last_name', $data)) {
            $updates[] = "user_last_name = ?";
            $params[] = $data['user_last_name'];
        }
        if (!empty($data['user_passwd'])) {
            $updates[] = "user_passwd = ?";
            $params[] = password_hash($data['user_passwd'], PASSWORD_BCRYPT);
        }
        if (array_key_exists('user_cr_dt', $data)) {
            $updates[] = "user_cr_dt = ?";
            $params[] = $data['user_cr_dt'];
        }
        if (array_key_exists('user_role', $data)) {
            $updates[] = "user_role = ?";
            $params[] = $data['user_role'];
        }
        if (array_key_exists('user_school_id', $data)) {
            $updates[] = "user_school_id = ?";
            $params[] = $data['user_school_id'] ?: null;
        }
        if (array_key_exists('user_branch_id', $data)) {
            $updates[] = "user_branch_id = ?";
            $params[] = $data['user_branch_id'] ?: null;
        }
        if (array_key_exists('user_img', $data)) {
            $updates[] = "user_img = ?";
            if (empty($data['user_img'])) {
                $params[] = null;
            } else {
                $imgRaw = $data['user_img'];
                if (is_string($imgRaw) && preg_match('/^data:image\/(\w+);base64,/', $imgRaw)) {
                    $imgRaw = substr($imgRaw, strpos($imgRaw, ',') + 1);
                }
                $params[] = base64_decode($imgRaw) ?: $data['user_img'];
            }
        }

        if (empty($updates)) {
            return true;
        }

        $sql = "UPDATE SM_USER_LOGIN SET " . implode(", ", $updates) . " WHERE user_id = ?";
        $params[] = $id;

        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM SM_USER_LOGIN WHERE user_id = ?");
        return $stmt->execute([$id]);
    }
}