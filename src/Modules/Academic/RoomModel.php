<?php

class RoomModel {
    private $db;
    private $tableName = 'SCHL_BR_ROOM';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureColumns();
    }

    private function ensureColumns() {
        try {
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_ROOM_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_room_ibfk_1"); } catch (Exception $e) {}

            $this->db->exec("ALTER TABLE {$this->tableName} 
                ADD COLUMN IF NOT EXISTS SCHL_BR_BUILDING VARCHAR(100) DEFAULT 'Main Building',
                ADD COLUMN IF NOT EXISTS SCHL_BR_ROOM_CAT VARCHAR(50) DEFAULT 'Classroom'");
            try { $this->db->exec("ALTER TABLE {$this->tableName} MODIFY COLUMN SCHL_BR_FLR VARCHAR(50)"); } catch (Exception $e) {}
        } catch (Exception $e) {}
    }

    public function ensureBranchExists($branchId) {
        if (empty($branchId)) return;
        try {
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_ROOM_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_room_ibfk_1"); } catch (Exception $e) {}

            $stmt = $this->db->prepare("SELECT COUNT(*) FROM SCHL_BRANCH WHERE SCHL_BR_ID = ?");
            $stmt->execute([$branchId]);
            if ((int)$stmt->fetchColumn() === 0) {
                $ins = $this->db->prepare("INSERT IGNORE INTO SCHL_BRANCH (SCHL_BR_ID, SCHL_BR_NM, SCHL_BR_CITY, SCHL_BR_STATE, SCHL_BR_PIN, SCHL_BR_COUNTRY, SCHL_BR_EMAILID, SCHL_BR_CONTACTNO) 
                                           VALUES (?, 'Main Branch', 'City', 'State', 100001, 'India', 'branch@eschool.com', '9999999999')");
                $ins->execute([$branchId]);
            }
        } catch (Exception $e) {}
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "SELECT r.*, b.SCHL_BR_NM as branch_name 
                FROM {$this->tableName} r 
                LEFT JOIN SCHL_BRANCH b ON r.SCHL_BR_REF_ID = b.SCHL_BR_ID 
                WHERE 1=1";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND r.SCHL_BR_REF_ID = ?";
                $params[] = $userId;
            }
        }
        $sql .= " ORDER BY r.SCHL_BR_BUILDING ASC, r.SCHL_BR_RM_ID ASC";
        if ($limit !== null && $offset !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(*) FROM {$this->tableName} r 
                LEFT JOIN SCHL_BRANCH b ON r.SCHL_BR_REF_ID = b.SCHL_BR_ID 
                WHERE 1=1";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND r.SCHL_BR_REF_ID = ?";
                $params[] = $userId;
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT r.*, b.SCHL_BR_NM as branch_name 
                                    FROM {$this->tableName} r 
                                    LEFT JOIN SCHL_BRANCH b ON r.SCHL_BR_REF_ID = b.SCHL_BR_ID 
                                    WHERE r.SCHL_BR_RM_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function generateNextRoomId() {
        try {
            $stmt = $this->db->query("SELECT SCHL_BR_RM_ID FROM {$this->tableName}");
            $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN) : [];
            $maxNum = 100;
            foreach ($rows as $id) {
                if (preg_match('/RM[-_]?(\d+)/i', (string)$id, $matches)) {
                    $val = (int)$matches[1];
                    if ($val > $maxNum) {
                        $maxNum = $val;
                    }
                }
            }
            $candidate = 'RM-' . ($maxNum + 1);
            while (in_array($candidate, $rows)) {
                $maxNum++;
                $candidate = 'RM-' . ($maxNum + 1);
            }
            return $candidate;
        } catch (Exception $e) {
            return strtoupper(uniqid('RM_'));
        }
    }

    public function create($data) {
        $fields = ['SCHL_BR_RM_ID', 'SCHL_BR_REF_ID', 'SCHL_BR_BUILDING', 'SCHL_BR_ROOM_CAT', 'SCHL_BR_ROOM_DESC', 'SCHL_BR_ROOM_CAPACITY', 'SCHL_BR_FACILITY', 'SCHL_BR_ISLAB', 'SCHL_BR_FLR'];
        $insertData = [];
        foreach ($fields as $field) {
            $insertData[$field] = isset($data[$field]) ? $data[$field] : null;
        }

        // If ID is empty, or already taken in the database, automatically generate the next unique room ID
        if (empty($insertData['SCHL_BR_RM_ID']) || $this->getById($insertData['SCHL_BR_RM_ID'])) {
            $insertData['SCHL_BR_RM_ID'] = $this->generateNextRoomId();
        }

        if (empty($insertData['SCHL_BR_BUILDING'])) {
            $insertData['SCHL_BR_BUILDING'] = 'Main Building';
        }
        if (empty($insertData['SCHL_BR_ROOM_CAT'])) {
            $insertData['SCHL_BR_ROOM_CAT'] = 'Classroom';
        }

        if (!empty($insertData['SCHL_BR_REF_ID'])) {
            $this->ensureBranchExists($insertData['SCHL_BR_REF_ID']);
        }

        $sql = "INSERT INTO {$this->tableName} (SCHL_BR_RM_ID, SCHL_BR_REF_ID, SCHL_BR_BUILDING, SCHL_BR_ROOM_CAT, SCHL_BR_ROOM_DESC, SCHL_BR_ROOM_CAPACITY, SCHL_BR_FACILITY, SCHL_BR_ISLAB, SCHL_BR_FLR)
                VALUES (:SCHL_BR_RM_ID, :SCHL_BR_REF_ID, :SCHL_BR_BUILDING, :SCHL_BR_ROOM_CAT, :SCHL_BR_ROOM_DESC, :SCHL_BR_ROOM_CAPACITY, :SCHL_BR_FACILITY, :SCHL_BR_ISLAB, :SCHL_BR_FLR)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($insertData);
        return $insertData['SCHL_BR_RM_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $updatableFields = ['SCHL_BR_REF_ID', 'SCHL_BR_BUILDING', 'SCHL_BR_ROOM_CAT', 'SCHL_BR_ROOM_DESC', 'SCHL_BR_ROOM_CAPACITY', 'SCHL_BR_FACILITY', 'SCHL_BR_ISLAB', 'SCHL_BR_FLR'];
        foreach ($updatableFields as $field) {
            if (array_key_exists($field, $data)) {
                $fieldsToUpdate[] = "{$field} = :{$field}";
                $params[$field] = $data[$field];
            }
        }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        $params['id'] = $id;
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE SCHL_BR_RM_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE SCHL_BR_RM_ID = ?");
        return $stmt->execute([$id]);
    }

    // --- Master Categories CRUD ---
    public function getCategories($branchId = null) {
        try {
            $sql = "SELECT * FROM SCHL_ROOM_CATEGORY WHERE CAT_BRANCH_ID IS NULL";
            $params = [];
            if ($branchId) {
                $sql .= " OR CAT_BRANCH_ID = ?";
                $params[] = $branchId;
            }
            $sql .= " ORDER BY CAT_NAME ASC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (Exception $e) {
            return [
                ['CAT_ID' => 'CAT_CLASSROOM', 'CAT_NAME' => 'Classroom'],
                ['CAT_ID' => 'CAT_LAB', 'CAT_NAME' => 'Laboratory'],
                ['CAT_ID' => 'CAT_CONF', 'CAT_NAME' => 'Conference Room'],
                ['CAT_ID' => 'CAT_MEET', 'CAT_NAME' => 'Meeting Room'],
                ['CAT_ID' => 'CAT_STAFF', 'CAT_NAME' => 'Teachers Room'],
                ['CAT_ID' => 'CAT_CANTEEN', 'CAT_NAME' => 'Canteen'],
                ['CAT_ID' => 'CAT_LIBRARY', 'CAT_NAME' => 'Library'],
                ['CAT_ID' => 'CAT_SPORTS', 'CAT_NAME' => 'Sports Hall'],
                ['CAT_ID' => 'CAT_AUDITORIUM', 'CAT_NAME' => 'Auditorium']
            ];
        }
    }

    public function createCategory($data) {
        $catId = $data['CAT_ID'] ?? ('CAT_' . strtoupper(uniqid()));
        $catName = $data['CAT_NAME'] ?? 'General';
        $branchId = $data['CAT_BRANCH_ID'] ?? null;
        $createdBy = $data['CAT_CREATEDBY'] ?? null;

        $stmt = $this->db->prepare("INSERT INTO SCHL_ROOM_CATEGORY (CAT_ID, CAT_NAME, CAT_BRANCH_ID, CAT_CREATEDBY) VALUES (?, ?, ?, ?)");
        return $stmt->execute([$catId, $catName, $branchId, $createdBy]);
    }
}
