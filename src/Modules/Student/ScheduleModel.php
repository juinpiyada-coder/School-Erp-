<?php
require_once __DIR__ . '/../../Core/Config/Database.php';

class ScheduleModel {
    private $db;
    private $tableName = 'SCHL_CLS_SCHLDL';

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "SELECT 
                    a.*,
                    a.SCHL_CLS_SCHLDL_ID AS SCHLDL_ID,
                    a.SCHL_CLS_SCHLDL_SEC_SESS_ID AS SCHLDL_CLS_REF_ID,
                    a.SCHL_CLS_SCHLDL_SEC_SESS_ID AS class_id,
                    COALESCE(sub.BR_CLS_SUB_NAME, a.SCHL_CLS_SCHLDL_SUB_ID) AS SCHLDL_SUB_NM,
                    COALESCE(sub.BR_CLS_SUB_NAME, a.SCHL_CLS_SCHLDL_SUB_ID) AS subject_name,
                    COALESCE(t.BR_TCHR_NM, a.SCHL_BR_TCHR_ID) AS SCHLDL_TCHR_NM,
                    COALESCE(t.BR_TCHR_NM, a.SCHL_BR_TCHR_ID) AS teacher_name,
                    a.SCHL_DAY_OF_WK AS SCHLDL_DAY,
                    a.SCHL_CLS_SCHDL_FRM_DT AS SCHLDL_START_TM,
                    a.SCHL_CLS_SCHDL_TO_DT AS SCHLDL_END_TM,
                    a.SCHL_BR_RM_ID AS SCHLDL_RM_REF_ID,
                    c.SCHL_BR_CENT_ID AS branch_id,
                    c.SCHL_BR_CLASS_NM AS class_name,
                    b.SCHL_BR_NM AS branch_name
                FROM {$this->tableName} a
                LEFT JOIN SCHL_BR_CLS_SUBJECT sub ON a.SCHL_CLS_SCHLDL_SUB_ID = sub.BR_CLS_SUB_ID
                LEFT JOIN SCHL_BR_TCHR t ON a.SCHL_BR_TCHR_ID = t.BR_TCHR_ID
                LEFT JOIN SCHL_BR_CLASS c ON a.SCHL_CLS_SCHLDL_SEC_SESS_ID = c.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
                WHERE 1=1";
                
        $params = [];
        if ($user) {
            if ($user['role_id'] === 'R_SCHOOLADMIN') {
                $sql .= " AND (b.SCHL_BR_CENTER_ID = ? OR ? IN ('usr_school', 'usr_super'))";
                $params[] = $user['userId'];
                $params[] = $user['userId'];
            } elseif ($user['role_id'] === 'R_BRANCHADMIN') {
                $sql .= " AND (b.SCHL_BR_ID = ? OR c.SCHL_BR_CENT_ID = ? OR ? IN ('usr_branch', 'usr_super'))";
                $params[] = $user['userId'];
                $params[] = $user['userId'];
                $params[] = $user['userId'];
            }
        }
        $sql .= " ORDER BY a.SCHL_CLS_SCHDL_FRM_DT ASC";
        if ($limit !== null && $offset !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(DISTINCT a.SCHL_CLS_SCHLDL_ID) FROM {$this->tableName} a
                LEFT JOIN SCHL_BR_CLASS c ON a.SCHL_CLS_SCHLDL_SEC_SESS_ID = c.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_BRANCH b ON c.SCHL_BR_CENT_ID = b.SCHL_BR_ID
                WHERE 1=1";
                
        $params = [];
        if ($user) {
            if ($user['role_id'] === 'R_SCHOOLADMIN') {
                $sql .= " AND (b.SCHL_BR_CENTER_ID = ? OR ? IN ('usr_school', 'usr_super'))";
                $params[] = $user['userId'];
                $params[] = $user['userId'];
            } elseif ($user['role_id'] === 'R_BRANCHADMIN') {
                $sql .= " AND (b.SCHL_BR_ID = ? OR c.SCHL_BR_CENT_ID = ? OR ? IN ('usr_branch', 'usr_super'))";
                $params[] = $user['userId'];
                $params[] = $user['userId'];
                $params[] = $user['userId'];
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }

    public function getById($id) {
        $sql = "SELECT 
                    SCHL_CLS_SCHLDL_ID AS SCHLDL_ID,
                    SCHL_CLS_SCHLDL_SEC_SESS_ID AS SCHLDL_CLS_REF_ID,
                    SCHL_CLS_SCHLDL_SUB_ID AS SCHLDL_SUB_NM,
                    SCHL_BR_TCHR_ID AS SCHLDL_TCHR_NM,
                    SCHL_DAY_OF_WK AS SCHLDL_DAY,
                    SCHL_CLS_SCHDL_FRM_DT AS SCHLDL_START_TM,
                    SCHL_CLS_SCHDL_TO_DT AS SCHLDL_END_TM,
                    SCHL_BR_RM_ID AS SCHLDL_RM_REF_ID
                FROM {$this->tableName} WHERE SCHL_CLS_SCHLDL_ID = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function create($data) {
        $fields = [
            'SCHL_CLS_SCHLDL_ID' => $data['SCHLDL_ID'] ?? null,
            'SCHL_CLS_SCHLDL_SEC_SESS_ID' => $data['SCHLDL_CLS_REF_ID'] ?? null,
            'SCHL_CLS_SCHLDL_SUB_ID' => $data['SCHLDL_SUB_NM'] ?? null,
            'SCHL_BR_TCHR_ID' => $data['SCHLDL_TCHR_NM'] ?? null,
            'SCHL_DAY_OF_WK' => $data['SCHLDL_DAY'] ?? null,
            'SCHL_CLS_SCHDL_FRM_DT' => $data['SCHLDL_START_TM'] ?? null,
            'SCHL_CLS_SCHDL_TO_DT' => $data['SCHLDL_END_TM'] ?? null,
            'SCHL_BR_RM_ID' => $data['SCHLDL_RM_REF_ID'] ?? null
        ];

        // Default empty strings for NOT NULL columns if any
        foreach ($fields as $key => &$val) {
            if ($val === null) {
                $val = '';
            }
        }

        $cols = implode(', ', array_keys($fields));
        $placeholders = implode(', ', array_map(fn($f) => ":$f", array_keys($fields)));
        
        $sql = "INSERT INTO {$this->tableName} ($cols) VALUES ($placeholders)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($fields);
        return $fields['SCHL_CLS_SCHLDL_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $mapping = [
            'SCHLDL_CLS_REF_ID' => 'SCHL_CLS_SCHLDL_SEC_SESS_ID',
            'SCHLDL_SUB_NM' => 'SCHL_CLS_SCHLDL_SUB_ID',
            'SCHLDL_TCHR_NM' => 'SCHL_BR_TCHR_ID',
            'SCHLDL_DAY' => 'SCHL_DAY_OF_WK',
            'SCHLDL_START_TM' => 'SCHL_CLS_SCHDL_FRM_DT',
            'SCHLDL_END_TM' => 'SCHL_CLS_SCHDL_TO_DT',
            'SCHLDL_RM_REF_ID' => 'SCHL_BR_RM_ID'
        ];

        foreach ($mapping as $frontendKey => $dbColumn) {
            if (array_key_exists($frontendKey, $data)) {
                $fieldsToUpdate[] = "{$dbColumn} = :{$dbColumn}";
                $params[$dbColumn] = $data[$frontendKey];
            }
        }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        $params['id'] = $id;
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE SCHL_CLS_SCHLDL_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE SCHL_CLS_SCHLDL_ID = ?");
        $stmt->execute([$id]);
        return true;
    }
}

