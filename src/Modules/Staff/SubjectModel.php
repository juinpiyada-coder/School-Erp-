<?php
require_once dirname(__DIR__, 2) . '/Core/Config/Database.php';

class SubjectModel {
    private $db;
    private $tableName = 'SCHL_BR_CLS_SUBJECT';

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll($limit = null, $offset = null) {
        $stmt = $this->db->query("SELECT s.*, 
                       c.SCHL_BR_CLASS_NM as class_name, 
                       c.SCHL_BR_CENT_ID as branch_id, 
                       b.SCHL_BR_NM as branch_name 
                FROM {$this->tableName} s
                LEFT JOIN SCHL_BR_CLASS c ON s.BR_CLS_ID = c.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID");
        return $stmt->fetchAll();
    }

    
    public function getTotalCount($user = null) {
        $stmt = $this->db->query("SELECT COUNT(*) FROM {$this->tableName}");
        return $stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT s.*, 
                       c.SCHL_BR_CLASS_NM as class_name, 
                       c.SCHL_BR_CENT_ID as branch_id, 
                       b.SCHL_BR_NM as branch_name 
                FROM {$this->tableName} s
                LEFT JOIN SCHL_BR_CLASS c ON s.BR_CLS_ID = c.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
                WHERE s.BR_CLS_SUB_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function getByClassId($classId) {
        $stmt = $this->db->prepare("SELECT s.*, 
                       c.SCHL_BR_CLASS_NM as class_name, 
                       c.SCHL_BR_CENT_ID as branch_id, 
                       b.SCHL_BR_NM as branch_name 
                FROM {$this->tableName} s
                LEFT JOIN SCHL_BR_CLASS c ON s.BR_CLS_ID = c.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
                WHERE s.BR_CLS_ID = ?");
        $stmt->execute([$classId]);
        return $stmt->fetchAll();
    }

    public function create($data) {
        $fields = ['BR_CLS_SUB_ID', 'BR_CLS_ID', 'BR_CLS_SUB_NAME', 'BR_CLS_SUB_DESC'];
        $insertData = [];
        foreach ($fields as $field) {
            $insertData[$field] = isset($data[$field]) ? $data[$field] : null;
        }

        $sql = "INSERT INTO {$this->tableName} (BR_CLS_SUB_ID, BR_CLS_ID, BR_CLS_SUB_NAME, BR_CLS_SUB_DESC)
                VALUES (:BR_CLS_SUB_ID, :BR_CLS_ID, :BR_CLS_SUB_NAME, :BR_CLS_SUB_DESC)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($insertData);
        return $insertData['BR_CLS_SUB_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $updatableFields = ['BR_CLS_ID', 'BR_CLS_SUB_NAME', 'BR_CLS_SUB_DESC'];
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
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE BR_CLS_SUB_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE BR_CLS_SUB_ID = ?");
        return $stmt->execute([$id]);
    }
}
