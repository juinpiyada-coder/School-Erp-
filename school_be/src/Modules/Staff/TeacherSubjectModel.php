<?php
require_once dirname(__DIR__, 2) . '/Core/Config/Database.php';

class TeacherSubjectModel {
    private $db;
    private $tableName = 'SCHL_TCHR_SUB';

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "SELECT s.*,
                       t.BR_TCHR_NM AS teacher_name,
                       t.BR_TCHR_BR_ID AS branch_id,
                       b.SCHL_BR_NM AS branch_name,
                       sub.BR_CLS_SUB_NAME AS subject_name,
                       sub.BR_CLS_ID AS class_id,
                       c.SCHL_BR_CLASS_NM AS class_name
                FROM {$this->tableName} s
                INNER JOIN SCHL_BR_TCHR t ON s.TCHR_ID = t.BR_TCHR_ID
                INNER JOIN SCHL_BR_CLS_SUBJECT sub ON s.TCHR_SUB_ID = sub.BR_CLS_SUB_ID
                LEFT JOIN SCHL_BR_CLASS c ON sub.BR_CLS_ID = c.SCHL_BR_CLS_ID
                INNER JOIN SCHL_BRANCH b ON t.BR_TCHR_BR_ID = b.SCHL_BR_ID
                WHERE 1=1";

        $params = [];
        if ($user) {
            if ($user['role_id'] === 'R_SCHOOLADMIN') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $user['userId'];
            } elseif ($user['role_id'] === 'R_BRANCHADMIN') {
                $sql .= " AND t.BR_TCHR_BR_ID = ?";
                $params[] = $user['userId'];
            }
        }

        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(*) FROM {$this->tableName} s
                INNER JOIN SCHL_BR_TCHR t ON s.TCHR_ID = t.BR_TCHR_ID
                INNER JOIN SCHL_BR_CLS_SUBJECT sub ON s.TCHR_SUB_ID = sub.BR_CLS_SUB_ID
                INNER JOIN SCHL_BRANCH b ON t.BR_TCHR_BR_ID = b.SCHL_BR_ID
                WHERE 1=1";

        $params = [];
        if ($user) {
            if ($user['role_id'] === 'R_SCHOOLADMIN') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $user['userId'];
            } elseif ($user['role_id'] === 'R_BRANCHADMIN') {
                $sql .= " AND t.BR_TCHR_BR_ID = ?";
                $params[] = $user['userId'];
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT s.*,
                       t.BR_TCHR_NM AS teacher_name,
                       t.BR_TCHR_BR_ID AS branch_id,
                       b.SCHL_BR_NM AS branch_name,
                       sub.BR_CLS_SUB_NAME AS subject_name,
                       sub.BR_CLS_ID AS class_id,
                       c.SCHL_BR_CLASS_NM AS class_name
                FROM {$this->tableName} s
                INNER JOIN SCHL_BR_TCHR t ON s.TCHR_ID = t.BR_TCHR_ID
                INNER JOIN SCHL_BR_CLS_SUBJECT sub ON s.TCHR_SUB_ID = sub.BR_CLS_SUB_ID
                LEFT JOIN SCHL_BR_CLASS c ON sub.BR_CLS_ID = c.SCHL_BR_CLS_ID
                INNER JOIN SCHL_BRANCH b ON t.BR_TCHR_BR_ID = b.SCHL_BR_ID
                WHERE s.TCHR_SUB_MAP_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function getByTeacherId($teacherId) {
        $stmt = $this->db->prepare("SELECT * FROM {$this->tableName} WHERE TCHR_ID = ? LIMIT 1");
        $stmt->execute([$teacherId]);
        return $stmt->fetch() ?: null;
    }

    public function create($data) {
        $fields = ['TCHR_SUB_MAP_ID', 'TCHR_ID', 'TCHR_SUB_ID'];
        $insertData = [];
        foreach ($fields as $field) {
            $insertData[$field] = isset($data[$field]) ? $data[$field] : null;
        }

        $sql = "INSERT INTO {$this->tableName} (TCHR_SUB_MAP_ID, TCHR_ID, TCHR_SUB_ID) 
                VALUES (:TCHR_SUB_MAP_ID, :TCHR_ID, :TCHR_SUB_ID)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($insertData);
        return $insertData['TCHR_SUB_MAP_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $updatableFields = ['TCHR_ID', 'TCHR_SUB_ID'];
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
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE TCHR_SUB_MAP_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE TCHR_SUB_MAP_ID = ?");
        return $stmt->execute([$id]);
    }
}

