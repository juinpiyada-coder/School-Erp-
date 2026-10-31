<?php

class SessionModel {
    private $db;
    private $tableName = 'SCHL_BR_CLASS_SEC_SESSION';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTableExists();
    }

    private function ensureTableExists() {
        try {
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_CLASS_SEC_SESSION_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_class_sec_session_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_CLASS_SEC_SESSION_ibfk_2"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_class_sec_session_ibfk_2"); } catch (Exception $e) {}
        } catch (Exception $e) {}
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "SELECT s.* FROM {$this->tableName} s 
                LEFT JOIN SCHL_BRANCH b ON s.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID 
                WHERE 1=1";
        $params = [];
        if ($user) {
            if ($user['role_id'] === 'R_SCHOOLADMIN') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $user['userId'];
            } elseif ($user['role_id'] === 'R_BRANCHADMIN') {
                $sql .= " AND s.SCHL_BR_CLASS_SEC_SESS_BR_ID = ?";
                $params[] = $user['userId'];
            }
        }
        if ($limit !== null && $offset !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(*) FROM {$this->tableName} s 
                LEFT JOIN SCHL_BRANCH b ON s.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID 
                WHERE 1=1";
        $params = [];
        if ($user) {
            if ($user['role_id'] === 'R_SCHOOLADMIN') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $user['userId'];
            } elseif ($user['role_id'] === 'R_BRANCHADMIN') {
                $sql .= " AND s.SCHL_BR_CLASS_SEC_SESS_BR_ID = ?";
                $params[] = $user['userId'];
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT * FROM {$this->tableName} WHERE SCHL_BR_CLASS_SEC_SESS_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function create($data) {
        $fields = ['SCHL_BR_CLASS_SEC_SESS_ID', 'SCHL_BR_CLASS_SEC_SESS_CLASS', 'SCHL_BR_CLASS_SEC_SESS_SECT', 'SCHL_BR_CLASS_SEC_SESS_SESS', 'SCHL_BR_CLASS_SEC_SESS_BR_ID'];
        $insertData = [];
        foreach ($fields as $field) {
            $insertData[$field] = isset($data[$field]) ? $data[$field] : null;
        }

        try {
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_CLASS_SEC_SESSION_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_class_sec_session_ibfk_1"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY SCHL_BR_CLASS_SEC_SESSION_ibfk_2"); } catch (Exception $e) {}
            try { $this->db->exec("ALTER TABLE {$this->tableName} DROP FOREIGN KEY schl_br_class_sec_session_ibfk_2"); } catch (Exception $e) {}

            if (!empty($insertData['SCHL_BR_CLASS_SEC_SESS_BR_ID'])) {
                $chk = $this->db->prepare("SELECT COUNT(*) FROM SCHL_BRANCH WHERE SCHL_BR_ID = ?");
                $chk->execute([$insertData['SCHL_BR_CLASS_SEC_SESS_BR_ID']]);
                if ((int)$chk->fetchColumn() === 0) {
                    $ins = $this->db->prepare("INSERT IGNORE INTO SCHL_BRANCH (SCHL_BR_ID, SCHL_BR_NM, SCHL_BR_CITY, SCHL_BR_STATE, SCHL_BR_PIN, SCHL_BR_COUNTRY, SCHL_BR_EMAILID, SCHL_BR_CONTACTNO) 
                                               VALUES (?, 'Main Branch', 'City', 'State', 100001, 'India', 'branch@eschool.com', '9999999999')");
                    $ins->execute([$insertData['SCHL_BR_CLASS_SEC_SESS_BR_ID']]);
                }
            }
        } catch (Exception $e) {}

        $sql = "INSERT INTO {$this->tableName} (SCHL_BR_CLASS_SEC_SESS_ID, SCHL_BR_CLASS_SEC_SESS_CLASS, SCHL_BR_CLASS_SEC_SESS_SECT, SCHL_BR_CLASS_SEC_SESS_SESS, SCHL_BR_CLASS_SEC_SESS_BR_ID)
                VALUES (:SCHL_BR_CLASS_SEC_SESS_ID, :SCHL_BR_CLASS_SEC_SESS_CLASS, :SCHL_BR_CLASS_SEC_SESS_SECT, :SCHL_BR_CLASS_SEC_SESS_SESS, :SCHL_BR_CLASS_SEC_SESS_BR_ID)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($insertData);
        return $insertData['SCHL_BR_CLASS_SEC_SESS_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $updatableFields = ['SCHL_BR_CLASS_SEC_SESS_CLASS', 'SCHL_BR_CLASS_SEC_SESS_SECT', 'SCHL_BR_CLASS_SEC_SESS_SESS', 'SCHL_BR_CLASS_SEC_SESS_BR_ID'];
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
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE SCHL_BR_CLASS_SEC_SESS_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE SCHL_BR_CLASS_SEC_SESS_ID = ?");
        return $stmt->execute([$id]);
    }
}
