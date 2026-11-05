<?php

class SchoolService {
    private $schoolModel;
    private $userService;

    public function __construct() {
        $this->schoolModel = new School();
        $this->userService = new UserService();
    }

    private function userModel() {
        return new User();
    }

    public function getAllSchools($user = null) {
        return $this->schoolModel->getAll($user);
    }

    public function getSchoolById($id) {
        return $this->schoolModel->getById($id);
    }

    public function createSchool($data) {
        $errors = [];
        if (empty($data['schl_mn_id'])) {
            $data['schl_mn_id'] = strtoupper(uniqid('SCHL_'));
        }

        $required = [
            'schl_mn_nm' => 'School Name',
            'schl_mn_city' => 'City',
            'schl_mn_state' => 'State',
            'schl_mn_pin' => 'PIN Code',
            'schl_mn_country' => 'Country',
            'schl_mn_emailid' => 'Email ID',
            'schl_mn_contactno' => 'Contact Number'
        ];

        foreach ($required as $field => $label) {
            if (empty($data[$field])) {
                $errors[$field] = "$label is required";
            }
        }

        if (isset($data['schl_mn_emailid']) && !empty($data['schl_mn_emailid'])) {
            if (!filter_var($data['schl_mn_emailid'], FILTER_VALIDATE_EMAIL)) {
                $errors['schl_mn_emailid'] = 'Invalid email format';
            }
        }

        if (isset($data['schl_mn_pin']) && !empty($data['schl_mn_pin'])) {
            if (!is_numeric($data['schl_mn_pin'])) {
                $errors['schl_mn_pin'] = 'PIN must be a numeric value';
            }
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed', 'errors' => $errors];
        }

        if ($this->schoolModel->getById($data['schl_mn_id'])) {
            return ['success' => false, 'message' => 'School with this ID already exists'];
        }

        try {
            $this->schoolModel->create($data);

            // Create user account for the school so they can login
            if (!empty($data['schl_mn_password'])) {
                $userData = [
                    'user_id' => $data['schl_mn_id'],
                    'user_email_id' => $data['schl_mn_emailid'],
                    'user_first_name' => $data['schl_mn_nm'],
                    'user_last_name' => '',
                    'user_passwd' => $data['schl_mn_password'],
                    'user_role' => 'R_SCHOOLADMIN', // Assigning school admin role
                    'user_school_id' => $data['schl_mn_id']
                ];
                $userResult = $this->userService->createUser($userData);
                if (empty($userResult['success'])) {
                    // Don't leave a school behind that nobody can log in to
                    $this->schoolModel->delete($data['schl_mn_id']);
                    return ['success' => false, 'message' => $userResult['message'] ?? 'Could not create school login'];
                }
            }

            return ['success' => true, 'message' => 'School configuration created successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function updateSchool($id, $data) {
        if (!$this->schoolModel->getById($id)) {
            return ['success' => false, 'message' => 'School not found'];
        }

        $errors = [];
        if (isset($data['schl_mn_emailid']) && !empty($data['schl_mn_emailid'])) {
            if (!filter_var($data['schl_mn_emailid'], FILTER_VALIDATE_EMAIL)) {
                $errors['schl_mn_emailid'] = 'Invalid email format';
            }
        }

        if (isset($data['schl_mn_pin']) && !empty($data['schl_mn_pin'])) {
            if (!is_numeric($data['schl_mn_pin'])) {
                $errors['schl_mn_pin'] = 'PIN must be a numeric value';
            }
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed', 'errors' => $errors];
        }

        try {
            // Email must stay unique across logins, otherwise login lookup becomes ambiguous
            if (!empty($data['schl_mn_emailid']) && $this->userModel()->emailTaken($data['schl_mn_emailid'], $id)) {
                return ['success' => false, 'message' => 'Validation failed', 'errors' => ['schl_mn_emailid' => 'This email is already used by another login']];
            }

            $this->schoolModel->update($id, $data);

            // Sync the linked login (user_id == school id) so the new email works at login
            $loginUpdate = [];
            if (!empty($data['schl_mn_emailid'])) $loginUpdate['user_email_id'] = $data['schl_mn_emailid'];
            if (!empty($data['schl_mn_nm']))      $loginUpdate['user_first_name'] = $data['schl_mn_nm'];
            if (!empty($data['schl_mn_password'])) $loginUpdate['user_passwd'] = $data['schl_mn_password'];
            if (!empty($loginUpdate) && $this->userService->getUserById($id)) {
                $loginUpdate['user_school_id'] = $id;
                $this->userService->updateUser($id, $loginUpdate);
            }
            return ['success' => true, 'message' => 'School configuration updated successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function deleteSchool($id) {
        if (!$this->schoolModel->getById($id)) {
            return ['success' => false, 'message' => 'School not found'];
        }

        try {
            $this->schoolModel->delete($id);
            return ['success' => true, 'message' => 'School configuration deleted successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }
}