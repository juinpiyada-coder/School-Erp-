<?php

class BoardModel {
    private $db;
    private $tableName = 'SM_BOARD';

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll() {
        $sql = "SELECT * FROM {$this->tableName} ORDER BY BRD_DESC ASC";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT * FROM {$this->tableName} WHERE BRD_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function create($data) {
        $stmt = $this->db->prepare("INSERT INTO {$this->tableName} (BRD_ID, BRD_DESC, BRD_STATE) VALUES (?, ?, ?)");
        return $stmt->execute([
            $data['BRD_ID'],
            $data['BRD_DESC'],
            $data['BRD_STATE'] ?? null
        ]);
    }

    public function update($id, $data) {
        $updates = [];
        $params = [];

        if (array_key_exists('BRD_DESC', $data)) {
            $updates[] = "BRD_DESC = ?";
            $params[] = $data['BRD_DESC'];
        }
        if (array_key_exists('BRD_STATE', $data)) {
            $updates[] = "BRD_STATE = ?";
            $params[] = $data['BRD_STATE'];
        }

        if (empty($updates)) {
            return true;
        }

        $sql = "UPDATE {$this->tableName} SET " . implode(", ", $updates) . " WHERE BRD_ID = ?";
        $params[] = $id;

        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE BRD_ID = ?");
        return $stmt->execute([$id]);
    }
}
