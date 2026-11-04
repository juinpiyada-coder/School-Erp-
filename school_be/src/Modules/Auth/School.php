<?php

class School {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll($user = null) {
        $sql = "SELECT s.*, b.BRD_DESC as schl_brd_desc, b.BRD_STATE as schl_brd_state 
                FROM MSTR_SCHOOL_MAIN s 
                LEFT JOIN SM_BOARD b ON s.SCHL_BRD_ID = b.BRD_ID 
                WHERE 1=1";
        $params = [];
        if ($user && $user['role_id'] === 'R_SCHOOLADMIN') {
            $sql .= " AND s.schl_mn_id = ?";
            $params[] = $user['school_id'] ?? $user['userId'];
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT s.*, b.BRD_DESC as schl_brd_desc, b.BRD_STATE as schl_brd_state 
                                    FROM MSTR_SCHOOL_MAIN s 
                                    LEFT JOIN SM_BOARD b ON s.SCHL_BRD_ID = b.BRD_ID 
                                    WHERE s.schl_mn_id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function create($data) {
        $stmt = $this->db->prepare("INSERT INTO MSTR_SCHOOL_MAIN (
            schl_mn_id, schl_mn_nm, schl_mn_address, schl_mn_city, schl_mn_state, 
            schl_mn_pin, schl_mn_country, schl_mn_emailid, schl_mn_contactno, 
            schl_brd_id, schl_language, schl_mn_status, schl_mn_createdby, schl_mn_createdat
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        return $stmt->execute([
            $data['schl_mn_id'],
            $data['schl_mn_nm'],
            $data['schl_mn_address'] ?? null,
            $data['schl_mn_city'],
            $data['schl_mn_state'],
            (int)($data['schl_mn_pin'] ?? 0),
            $data['schl_mn_country'],
            $data['schl_mn_emailid'],
            $data['schl_mn_contactno'],
            !empty($data['schl_brd_id']) ? $data['schl_brd_id'] : null,
            $data['schl_language'] ?? null,
            $data['schl_mn_status'] ?? 'ACTIVE',
            $data['schl_mn_createdby'] ?? null
        ]);
    }

    public function update($id, $data) {
        $updates = [];
        $params = [];
        
        $fields = [
            'schl_mn_nm', 'schl_mn_address', 'schl_mn_city', 'schl_mn_state',
            'schl_mn_pin', 'schl_mn_country', 'schl_mn_emailid', 'schl_mn_contactno',
            'schl_brd_id', 'schl_language', 'schl_mn_status', 'schl_mn_updatedby'
        ];

        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $updates[] = "$field = ?";
                if ($field === 'schl_mn_pin') {
                    $params[] = (int)$data[$field];
                } elseif ($field === 'schl_brd_id') {
                    $params[] = !empty($data[$field]) ? $data[$field] : null;
                } else {
                    $params[] = $data[$field];
                }
            }
        }

        if (empty($updates)) {
            return true;
        }

        $updates[] = "schl_mn_updatedat = NOW()";

        $sql = "UPDATE MSTR_SCHOOL_MAIN SET " . implode(", ", $updates) . " WHERE schl_mn_id = ?";
        $params[] = $id;

        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM MSTR_SCHOOL_MAIN WHERE schl_mn_id = ?");
        return $stmt->execute([$id]);
    }
}