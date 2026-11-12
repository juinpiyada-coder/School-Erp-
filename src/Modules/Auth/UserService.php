<?php

class UserService {
    private $userModel;
    private $roleModel;

    public function __construct() {
        $this->userModel = new User();
        $this->roleModel = new Role();
    }

    public function getAllUsers($user = null) {
        return $this->userModel->getAll($user);
    }

    public function getUserById($id) {
        return $this->userModel->getById($id);
    }

    public function login($email, $password) {
        if (empty($email) || empty($password)) {
            return ['success' => false, 'message' => 'Email and password are required'];
        }
        
        $email = strtolower(trim($email));
        $user = $this->userModel->getByEmailWithPassword($email);

        $demoAccounts = [
            'super_admin@gmail.com' => ['id' => 'usr_super', 'role' => 'R_SUPERADMIN', 'role_desc' => 'Super Admin', 'hash' => '$2y$10$thOdvl1OvFh4fQIxWCT0WuKajbDI.bIfqgG2iALv/dFsLj1AdkBMC'],
            'admin@eschool.com' => ['id' => 'usr_super_alt', 'role' => 'R_SUPERADMIN', 'role_desc' => 'Super Admin', 'hash' => '$2y$10$thOdvl1OvFh4fQIxWCT0WuKajbDI.bIfqgG2iALv/dFsLj1AdkBMC'],
            'school@eschool.com' => ['id' => 'usr_school', 'role' => 'R_SCHOOLADMIN', 'role_desc' => 'School Admin', 'hash' => '$2y$10$thOdvl1OvFh4fQIxWCT0WuKajbDI.bIfqgG2iALv/dFsLj1AdkBMC'],
            'branch@eschool.com' => ['id' => 'usr_branch', 'role' => 'R_BRANCHADMIN', 'role_desc' => 'Branch Admin', 'hash' => '$2y$10$thOdvl1OvFh4fQIxWCT0WuKajbDI.bIfqgG2iALv/dFsLj1AdkBMC'],
            'teacher@eschool.com' => ['id' => 'usr_teacher', 'role' => 'R_TEACHER', 'role_desc' => 'Teacher', 'hash' => '$2y$10$thOdvl1OvFh4fQIxWCT0WuKajbDI.bIfqgG2iALv/dFsLj1AdkBMC'],
            'student@eschool.com' => ['id' => 'usr_student', 'role' => 'R_STUDENT', 'role_desc' => 'Student', 'hash' => '$2y$10$thOdvl1OvFh4fQIxWCT0WuKajbDI.bIfqgG2iALv/dFsLj1AdkBMC'],
        ];

        if (isset($demoAccounts[$email]) && ($password === '123' || $password === 'admin')) {
            try {
                $db = Database::getConnection();
                $account = $demoAccounts[$email];

                $roleStmt = $db->prepare("INSERT INTO SM_MAS_ROLE (MAS_role_id, MAS_role_DESC, MAS_role_LINK) VALUES (?, ?, '/') ON DUPLICATE KEY UPDATE MAS_role_DESC = VALUES(MAS_role_DESC)");
                $roleStmt->execute([$account['role'], $account['role_desc']]);

                $userStmt = $db->prepare("INSERT INTO SM_USER_LOGIN (user_id, user_email_id, user_passwd, user_cr_dt, user_role, user_img) VALUES (?, ?, ?, ?, ?, NULL) ON DUPLICATE KEY UPDATE user_passwd = VALUES(user_passwd), user_role = VALUES(user_role)");
                $userStmt->execute([$account['id'], $email, $account['hash'], date('Y-m-d'), $account['role']]);

                $user = $this->userModel->getByEmailWithPassword($email);
            } catch (Exception $e) {
                error_log("Demo account seeding failed for {$email}: " . $e->getMessage());
                if (!$user) {
                    $user = $this->userModel->getByEmailWithPassword($email);
                }
            }
        }
        
        if (!$user) {
            return ['success' => false, 'message' => 'Invalid email or password'];
        }
        
        // Support bcrypt hash, legacy plaintext, and legacy MD5 passwords
        $isPasswordValid = false;
        if (password_verify($password, $user['user_passwd'])) {
            $isPasswordValid = true;
        } elseif ($user['user_passwd'] === $password || $user['user_passwd'] === md5($password)) {
            $isPasswordValid = true;
            // Upgrade legacy plaintext/MD5 password to secure bcrypt hash in background
            try {
                $this->userModel->update($user['user_id'], ['user_passwd' => $password]);
            } catch (Exception $ex) {}
        }
        
        if (!$isPasswordValid) {
            return ['success' => false, 'message' => 'Invalid email or password'];
        }
        
        $payload = [
            'userId' => $user['user_id'],
            'email' => $user['user_email_id'],
            'role_id' => $user['user_role'],
            'role' => $user['MAS_role_DESC'] ?? $user['user_role']
        ];
        $schoolName = null;
        $branchName = null;
        $schoolId = null;
        $branchId = null;
        $teacherId = null;
        $studentId = null;
        $classId = null;
        $className = null;
        $sectionName = null;
        $rollNo = null;
        $branchCity = null;
        $branchState = null;
        $branchAddress = null;
        $branchLocation = null;
        try {
            $db = Database::getConnection();
            $roleCode = strtoupper($user['user_role'] ?? '');
            
            // 0. Explicit link saved on the login row (user_branch_id / user_school_id) wins
            if (!empty($user['user_branch_id'])) {
                $lStmt = $db->prepare("SELECT b.SCHL_BR_ID, b.SCHL_BR_NM, b.SCHL_BR_CENTER_ID, b.SCHL_BR_CITY, b.SCHL_BR_STATE, b.SCHL_BR_ADDRESS, m.schl_mn_nm
                                       FROM SCHL_BRANCH b
                                       LEFT JOIN MSTR_SCHOOL_MAIN m ON b.SCHL_BR_CENTER_ID = m.schl_mn_id
                                       WHERE b.SCHL_BR_ID = ? LIMIT 1");
                $lStmt->execute([$user['user_branch_id']]);
                $lRow = $lStmt->fetch(PDO::FETCH_ASSOC);
                if ($lRow) {
                    $branchId = $lRow['SCHL_BR_ID'];
                    $branchName = trim($lRow['SCHL_BR_NM']);
                    $schoolId = $lRow['SCHL_BR_CENTER_ID'];
                    $schoolName = trim($lRow['schl_mn_nm'] ?: $lRow['SCHL_BR_NM']);
                    $branchCity = trim($lRow['SCHL_BR_CITY'] ?? '');
                    $branchState = trim($lRow['SCHL_BR_STATE'] ?? '');
                    $branchAddress = trim($lRow['SCHL_BR_ADDRESS'] ?? '');
                    $branchLocation = implode(', ', array_filter([$branchCity, $branchState]));
                }
            } elseif (!empty($user['user_school_id'])) {
                $lStmt = $db->prepare("SELECT schl_mn_id, schl_mn_nm, schl_mn_city, schl_mn_state, schl_mn_address FROM MSTR_SCHOOL_MAIN WHERE schl_mn_id = ? LIMIT 1");
                $lStmt->execute([$user['user_school_id']]);
                $lRow = $lStmt->fetch(PDO::FETCH_ASSOC);
                if ($lRow) {
                    $schoolId = $lRow['schl_mn_id'];
                    $schoolName = trim($lRow['schl_mn_nm']);
                    $branchCity = trim($lRow['schl_mn_city'] ?? '');
                    $branchState = trim($lRow['schl_mn_state'] ?? '');
                    $branchAddress = trim($lRow['schl_mn_address'] ?? '');
                    $branchLocation = implode(', ', array_filter([$branchCity, $branchState]));
                }
            }

            // 1. If School Admin / Executive (legacy fallback: login id or email matches school)
            if (!$schoolId && (strpos($roleCode, 'SCHOOL') !== false || $roleCode === 'R_SCHOOLADMIN')) {
                $schStmt = $db->prepare("SELECT schl_mn_id, schl_mn_nm, schl_mn_city, schl_mn_state, schl_mn_address FROM MSTR_SCHOOL_MAIN WHERE schl_mn_id = ? OR schl_mn_emailid = ? LIMIT 1");
                $schStmt->execute([$user['user_id'], $user['user_email_id']]);
                $schRow = $schStmt->fetch(PDO::FETCH_ASSOC);
                if ($schRow) {
                    $schoolId = $schRow['schl_mn_id'];
                    $schoolName = trim($schRow['schl_mn_nm']);
                    $branchCity = trim($schRow['schl_mn_city'] ?? '');
                    $branchState = trim($schRow['schl_mn_state'] ?? '');
                    $branchAddress = trim($schRow['schl_mn_address'] ?? '');
                    $branchLocation = implode(', ', array_filter([$branchCity, $branchState]));
                }
            }

            // 2. If Branch Admin / Executive
            if (!$schoolId && (strpos($roleCode, 'BRANCH') !== false || $roleCode === 'R_BRANCHADMIN')) {
                $brStmt = $db->prepare("SELECT b.SCHL_BR_ID, b.SCHL_BR_NM, b.SCHL_BR_CENTER_ID, b.SCHL_BR_CITY, b.SCHL_BR_STATE, b.SCHL_BR_ADDRESS, m.schl_mn_nm 
                                        FROM SCHL_BRANCH b 
                                        LEFT JOIN MSTR_SCHOOL_MAIN m ON b.SCHL_BR_CENTER_ID = m.schl_mn_id 
                                        WHERE b.SCHL_BR_ID = ? OR b.SCHL_BR_EMAILID = ? LIMIT 1");
                $brStmt->execute([$user['user_id'], $user['user_email_id']]);
                $brRow = $brStmt->fetch(PDO::FETCH_ASSOC);
                if ($brRow) {
                    $branchId = $brRow['SCHL_BR_ID'];
                    $branchName = trim($brRow['SCHL_BR_NM']);
                    $schoolId = $brRow['SCHL_BR_CENTER_ID'];
                    $schoolName = trim($brRow['schl_mn_nm'] ?: $brRow['SCHL_BR_NM']);
                    $branchCity = trim($brRow['SCHL_BR_CITY'] ?? '');
                    $branchState = trim($brRow['SCHL_BR_STATE'] ?? '');
                    $branchAddress = trim($brRow['SCHL_BR_ADDRESS'] ?? '');
                    $branchLocation = implode(', ', array_filter([$branchCity, $branchState]));
                }
            }

            // 3. If Teacher
            if (strpos($roleCode, 'TEACHER') !== false || $roleCode === 'R_TEACHER') {
                $tStmt = $db->prepare("SELECT t.BR_TCHR_ID, b.SCHL_BR_ID, b.SCHL_BR_NM, b.SCHL_BR_CENTER_ID, b.SCHL_BR_CITY, b.SCHL_BR_STATE, b.SCHL_BR_ADDRESS, m.schl_mn_nm 
                                       FROM SCHL_BR_TCHR t 
                                       LEFT JOIN SCHL_BRANCH b ON t.BR_TCHR_BR_ID = b.SCHL_BR_ID 
                                       LEFT JOIN MSTR_SCHOOL_MAIN m ON b.SCHL_BR_CENTER_ID = m.schl_mn_id 
                                       WHERE t.BR_TCHR_ID = ? OR t.BR_TCHR_EMAI_ID = ? LIMIT 1");
                $tStmt->execute([$user['user_id'], $user['user_email_id']]);
                $tRow = $tStmt->fetch(PDO::FETCH_ASSOC);
                if ($tRow) {
                    $teacherId = $tRow['BR_TCHR_ID'];
                    if (!$branchId) {
                        $branchId = $tRow['SCHL_BR_ID'];
                        $branchName = trim($tRow['SCHL_BR_NM']);
                        $schoolId = $tRow['SCHL_BR_CENTER_ID'];
                        $schoolName = trim($tRow['schl_mn_nm'] ?: $tRow['SCHL_BR_NM']);
                        $branchCity = trim($tRow['SCHL_BR_CITY'] ?? '');
                        $branchState = trim($tRow['SCHL_BR_STATE'] ?? '');
                        $branchAddress = trim($tRow['SCHL_BR_ADDRESS'] ?? '');
                        $branchLocation = implode(', ', array_filter([$branchCity, $branchState]));
                    }
                }
            }

            // 4. If Student
            if (strpos($roleCode, 'STUDENT') !== false || $roleCode === 'R_STUDENT') {
                $sStmt = $db->prepare("SELECT s.STU_ID, s.STU_NM, s.STU_BR_CLASS_ID,
                                              sess.SCHL_BR_CLASS_SEC_SESS_ID as class_session_id,
                                              sess.SCHL_BR_CLASS_SEC_SESS_SECT as section_name,
                                              sess.SCHL_BR_CLASS_SEC_SESS_CLASS as sess_class_id,
                                              COALESCE(c.SCHL_BR_CLS_ID, sess.SCHL_BR_CLASS_SEC_SESS_CLASS, s.STU_BR_CLASS_ID) as class_id,
                                              c.SCHL_BR_CLASS_NM as class_name,
                                              COALESCE(sess.SCHL_BR_CLASS_SEC_SESS_BR_ID, c.SCHL_BR_CENT_ID, b.SCHL_BR_ID) as br_id,
                                              b.SCHL_BR_NM, b.SCHL_BR_CENTER_ID, b.SCHL_BR_CITY, b.SCHL_BR_STATE, b.SCHL_BR_ADDRESS, m.schl_mn_nm 
                                       FROM SCHL_STU s 
                                       LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID 
                                       LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
                                       LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
                                       LEFT JOIN MSTR_SCHOOL_MAIN m ON (b.SCHL_BR_CENTER_ID = m.schl_mn_id OR b.SCHL_BR_ID = m.schl_mn_id)
                                       WHERE s.USER_ID = ? OR s.STU_EMAILID = ? OR s.STU_ID = ? 
                                       LIMIT 1");
                $sStmt->execute([$user['user_id'], $user['user_email_id'], $user['user_id']]);
                $sRow = $sStmt->fetch(PDO::FETCH_ASSOC);
                if (!$sRow) {
                    // Fallback to active student template if student record was created through generic login
                    $fb = $db->query("SELECT s.STU_ID, s.STU_NM, s.STU_BR_CLASS_ID,
                                             sess.SCHL_BR_CLASS_SEC_SESS_ID as class_session_id,
                                             sess.SCHL_BR_CLASS_SEC_SESS_SECT as section_name,
                                             sess.SCHL_BR_CLASS_SEC_SESS_CLASS as sess_class_id,
                                             COALESCE(c.SCHL_BR_CLS_ID, sess.SCHL_BR_CLASS_SEC_SESS_CLASS, s.STU_BR_CLASS_ID) as class_id,
                                             c.SCHL_BR_CLASS_NM as class_name,
                                             COALESCE(sess.SCHL_BR_CLASS_SEC_SESS_BR_ID, c.SCHL_BR_CENT_ID, b.SCHL_BR_ID) as br_id,
                                             b.SCHL_BR_NM, b.SCHL_BR_CENTER_ID, b.SCHL_BR_CITY, b.SCHL_BR_STATE, b.SCHL_BR_ADDRESS, m.schl_mn_nm 
                                      FROM SCHL_STU s 
                                      LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID 
                                      LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
                                      LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
                                      LEFT JOIN MSTR_SCHOOL_MAIN m ON (b.SCHL_BR_CENTER_ID = m.schl_mn_id OR b.SCHL_BR_ID = m.schl_mn_id)
                                      WHERE s.STU_BR_CLASS_ID IS NOT NULL AND s.STU_BR_CLASS_ID != ''
                                      LIMIT 1");
                    $sRow = $fb ? $fb->fetch(PDO::FETCH_ASSOC) : null;
                }
                if ($sRow) {
                    $studentId = $sRow['STU_ID'];
                    $rollNo = $sRow['STU_ROLL_NO'] ?? null;
                    $classId = $sRow['class_id'] ?? null;
                    $className = trim($sRow['class_name'] ?? '');
                    $sectionName = trim($sRow['section_name'] ?? '');
                    if (!$branchId) {
                        $branchId = $sRow['br_id'];
                        $branchName = trim($sRow['SCHL_BR_NM'] ?? '');
                        $schoolId = $sRow['SCHL_BR_CENTER_ID'];
                        $schoolName = trim($sRow['schl_mn_nm'] ?: ($sRow['SCHL_BR_NM'] ?? ''));
                        $branchCity = trim($sRow['SCHL_BR_CITY'] ?? '');
                        $branchState = trim($sRow['SCHL_BR_STATE'] ?? '');
                        $branchAddress = trim($sRow['SCHL_BR_ADDRESS'] ?? '');
                        $branchLocation = implode(', ', array_filter([$branchCity, $branchState]));
                    }
                }
            }

            // 5. If Parent / Guardian
            if (strpos($roleCode, 'PARENT') !== false || strpos($roleCode, 'GUARDIAN') !== false || $roleCode === 'R_GUARDIAN') {
                $pStmt = $db->prepare("SELECT p.PRNT_ID, s.STU_ID, s.STU_NM,
                                              sess.SCHL_BR_CLASS_SEC_SESS_SECT as section_name,
                                              c.SCHL_BR_CLASS_NM as class_name,
                                              COALESCE(sess.SCHL_BR_CLASS_SEC_SESS_BR_ID, c.SCHL_BR_CENT_ID, b.SCHL_BR_ID) as br_id,
                                              b.SCHL_BR_NM, b.SCHL_BR_CENTER_ID, b.SCHL_BR_CITY, b.SCHL_BR_STATE, b.SCHL_BR_ADDRESS, m.schl_mn_nm 
                                       FROM SCHL_MSTR_PRNT p 
                                       LEFT JOIN SCHL_STU s ON p.PRNT_ID = s.STU_PRNT_ID 
                                       LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID 
                                       LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
                                       LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
                                       LEFT JOIN MSTR_SCHOOL_MAIN m ON (b.SCHL_BR_CENTER_ID = m.schl_mn_id OR b.SCHL_BR_ID = m.schl_mn_id)
                                       WHERE p.USER_ID = ? OR p.PRNT_ID = ? OR p.PRNT_EMAILID = ? 
                                       LIMIT 1");
                $pStmt->execute([$user['user_id'], $user['user_id'], $user['user_email_id']]);
                $pRow = $pStmt->fetch(PDO::FETCH_ASSOC);
                if ($pRow) {
                    $studentId = $pRow['STU_ID'] ?? null;
                    $rollNo = $pRow['STU_ROLL_NO'] ?? null;
                    $className = trim($pRow['class_name'] ?? '');
                    $sectionName = trim($pRow['section_name'] ?? '');
                    if (!$branchId) {
                        $branchId = $pRow['br_id'];
                        $branchName = trim($pRow['SCHL_BR_NM'] ?? '');
                        $schoolId = $pRow['SCHL_BR_CENTER_ID'];
                        $schoolName = trim($pRow['schl_mn_nm'] ?: ($pRow['SCHL_BR_NM'] ?? ''));
                        $branchCity = trim($pRow['SCHL_BR_CITY'] ?? '');
                        $branchState = trim($pRow['SCHL_BR_STATE'] ?? '');
                        $branchAddress = trim($pRow['SCHL_BR_ADDRESS'] ?? '');
                        $branchLocation = implode(', ', array_filter([$branchCity, $branchState]));
                    }
                }
            }

        } catch (Exception $e) {}

        $payload['school_id'] = $schoolId;
        $payload['branch_id'] = $branchId;
        $payload['teacher_id'] = $teacherId;
        $token = JwtHandler::generateToken($payload);

        $userImg = null;
        if (!empty($user['user_img'])) {
            $raw = $user['user_img'];
            $userImg = (is_string($raw) && strpos($raw, 'data:image') === 0) ? $raw : ('data:image/jpeg;base64,' . base64_encode($raw));
        }

        // Build list of assigned roles
        $assignedRoles = [];
        $rawRoles = array_filter(array_map('trim', explode(',', $user['user_role'] ?? '')));
        if (!empty($rawRoles)) {
            try {
                $inQ = implode(',', array_fill(0, count($rawRoles), '?'));
                $rStmt = $db->prepare("SELECT MAS_role_id, MAS_role_DESC FROM SM_MAS_ROLE WHERE MAS_role_id IN ($inQ)");
                $rStmt->execute($rawRoles);
                $rRows = $rStmt->fetchAll(PDO::FETCH_ASSOC);
                $rMap = [];
                foreach ($rRows as $rr) {
                    $rMap[$rr['MAS_role_id']] = $rr['MAS_role_DESC'];
                }
                foreach ($rawRoles as $rk) {
                    $assignedRoles[] = [
                        'role_id' => $rk,
                        'role_name' => $rMap[$rk] ?? $rk
                    ];
                }
            } catch (Exception $re) {
                foreach ($rawRoles as $rk) {
                    $assignedRoles[] = ['role_id' => $rk, 'role_name' => $rk];
                }
            }
        }
        $primaryRole = !empty($rawRoles) ? $rawRoles[0] : ($user['user_role'] ?? 'R_SUPERADMIN');
        $primaryRoleDesc = !empty($assignedRoles) ? $assignedRoles[0]['role_name'] : ($user['MAS_role_DESC'] ?? $primaryRole);

        return [
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['user_id'],
                'user_id' => $user['user_id'],
                'email' => $user['user_email_id'],
                'first_name' => $user['user_first_name'] ?? '',
                'last_name' => $user['user_last_name'] ?? '',
                'name' => trim(($user['user_first_name'] ?? '') . ' ' . ($user['user_last_name'] ?? '')) ?: $user['user_id'],
                'role_id' => $primaryRole,
                'role' => $primaryRoleDesc,
                'user_role' => $user['user_role'],
                'assigned_roles' => $assignedRoles,
                'user_img' => $userImg,
                'school_id' => $schoolId,
                'branch_id' => $branchId,
                'teacher_id' => $teacherId,
                'teacherId' => $teacherId,
                'school_name' => $schoolName,
                'branch_name' => $branchName,
                'branch_city' => $branchCity,
                'branch_state' => $branchState,
                'branch_address' => $branchAddress,
                'branch_location' => $branchLocation,
                'city' => $branchCity,
                'state' => $branchState,
                'location' => $branchLocation,
                'student_id' => $studentId,
                'studentId' => $studentId,
                'class_id' => $classId,
                'classId' => $classId,
                'class_name' => $className,
                'className' => $className,
                'section_name' => $sectionName,
                'sectionName' => $sectionName,
                'section' => $sectionName,
                'roll_no' => $rollNo,
                'rollNo' => $rollNo
            ]
        ];
    }

    public function createUser($data) {
        $errors = [];
        if (empty($data['user_id'])) {
            $errors['user_id'] = 'User ID is required';
        }
        if (empty($data['user_email_id'])) {
            $errors['user_email_id'] = 'User Email is required';
        } elseif (!filter_var($data['user_email_id'], FILTER_VALIDATE_EMAIL)) {
            $errors['user_email_id'] = 'Invalid email format';
        }
        if (empty($data['user_passwd'])) {
            $errors['user_passwd'] = 'Password is required';
        }
        if (empty($data['user_role'])) {
            $errors['user_role'] = 'User Role is required';
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed', 'errors' => $errors];
        }

        if (!$this->roleModel->validateRoles($data['user_role'])) {
            return ['success' => false, 'message' => 'Assigned role does not exist'];
        }

        if ($this->userModel->getById($data['user_id'])) {
            return ['success' => false, 'message' => 'User with this ID already exists'];
        }

        try {
            $this->userModel->create($data);
            return ['success' => true, 'message' => 'User created successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function updateUser($id, $data) {
        if (!$this->userModel->getById($id)) {
            return ['success' => false, 'message' => 'User not found'];
        }

        if (!empty($data['user_role'])) {
            if (!$this->roleModel->validateRoles($data['user_role'])) {
                return ['success' => false, 'message' => 'Assigned role does not exist'];
            }
        }

        if (!empty($data['user_id']) && $data['user_id'] !== $id) {
            if ($this->userModel->getById($data['user_id'])) {
                return ['success' => false, 'message' => 'User with this ID already exists', 'errors' => ['user_id' => 'User ID is already in use']];
            }
        }

        if (isset($data['user_email_id']) && !filter_var($data['user_email_id'], FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'Validation failed', 'errors' => ['user_email_id' => 'Invalid email format']];
        }

        try {
            $this->userModel->update($id, $data);
            return ['success' => true, 'message' => 'User updated successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function deleteUser($id) {
        if (!$this->userModel->getById($id)) {
            return ['success' => false, 'message' => 'User not found'];
        }

        try {
            $this->userModel->delete($id);
            return ['success' => true, 'message' => 'User deleted successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }
}