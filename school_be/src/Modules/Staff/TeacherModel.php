<?php
require_once dirname(__DIR__, 2) . '/Core/Config/Database.php';

class TeacherModel {
    private $db;
    private $tableName = 'SCHL_BR_TCHR';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTableColumns();
    }

    private function ensureTableColumns() {
        try {
            $this->db->exec("ALTER TABLE {$this->tableName} 
                ADD COLUMN IF NOT EXISTS TCHR_STATUS VARCHAR(50) DEFAULT 'Active',
                ADD COLUMN IF NOT EXISTS BR_TCHR_AADHAR VARCHAR(12) DEFAULT '',
                ADD COLUMN IF NOT EXISTS BR_TCHR_PAN VARCHAR(10) DEFAULT '',
                ADD COLUMN IF NOT EXISTS BR_TCHR_ASSIGNED_CLASS_ID VARCHAR(100) NULL");
        } catch (Exception $ex) {}
    }

    public function getAll($limit = null, $offset = 0, $user = null) {
        $sql = "SELECT 
                t.BR_TCHR_ID AS TCHR_ID,
                t.BR_TCHR_ID AS id,
                t.BR_TCHR_NM AS TCHR_NM,
                t.BR_TCHR_NM AS name,
                t.BR_TCHR_BR_ID AS BR_TCHR_BR_ID,
                t.BR_TCHR_BR_ID AS branchId,
                t.BR_TCHR_BR_ID AS branch_id,
                COALESCE(b.SCHL_BR_NM, 'Main Campus') AS branch_name,
                COALESCE(b.SCHL_BR_NM, 'Main Campus') AS branchName,
                t.BR_TCHR_EMAI_ID AS TCHR_EMAIL,
                t.BR_TCHR_EMAI_ID AS email,
                t.BR_TCHR_CONT_NO1 AS TCHR_CONTACT_NO,
                t.BR_TCHR_CONT_NO1 AS phone,
                t.BR_TCHR_AADHAR AS aadhar,
                t.BR_TCHR_AADHAR AS BR_TCHR_AADHAR,
                t.BR_TCHR_PAN AS pan,
                t.BR_TCHR_PAN AS panCard,
                t.BR_TCHR_PAN AS BR_TCHR_PAN,
                t.BR_TCHR_ASSIGNED_CLASS_ID AS assignedClassId,
                t.BR_TCHR_ASSIGNED_CLASS_ID AS BR_TCHR_ASSIGNED_CLASS_ID,
                cls.SCHL_BR_CLASS_NM AS assignedClassName,
                t.TCHR_STATUS,
                t.TCHR_STATUS AS status,
                GROUP_CONCAT(DISTINCT s.BR_CLS_SUB_NAME SEPARATOR ', ') AS subjects,
                GROUP_CONCAT(DISTINCT s.BR_CLS_SUB_ID) AS subject_ids,
                MAX(ts.TCHR_SUB_ID) AS subject_id,
                MAX(ts.TCHR_SUB_ID) AS subjectId,
                COUNT(DISTINCT s.BR_CLS_ID) AS classes,
                GROUP_CONCAT(DISTINCT c.SCHL_BR_CLASS_NM SEPARATOR ', ') AS class_names,
                GROUP_CONCAT(DISTINCT c.SCHL_BR_CLASS_NM SEPARATOR ', ') AS classNames
                FROM {$this->tableName} t
                LEFT JOIN SCHL_BRANCH b ON t.BR_TCHR_BR_ID = b.SCHL_BR_ID
                LEFT JOIN SCHL_BR_CLASS cls ON t.BR_TCHR_ASSIGNED_CLASS_ID = cls.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_TCHR_SUB ts ON t.BR_TCHR_ID = ts.TCHR_ID
                LEFT JOIN SCHL_BR_CLS_SUBJECT s ON ts.TCHR_SUB_ID = s.BR_CLS_SUB_ID
                LEFT JOIN SCHL_BR_CLASS c ON s.BR_CLS_ID = c.SCHL_BR_CLS_ID
                WHERE 1=1";
        
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND t.BR_TCHR_BR_ID = ?";
                $params[] = $userId;
            }
        }
        
        $sql .= " GROUP BY t.BR_TCHR_ID, t.BR_TCHR_NM, t.BR_TCHR_BR_ID, b.SCHL_BR_NM, t.BR_TCHR_EMAI_ID, t.BR_TCHR_CONT_NO1, t.BR_TCHR_AADHAR, t.BR_TCHR_PAN, t.BR_TCHR_ASSIGNED_CLASS_ID, cls.SCHL_BR_CLASS_NM, t.TCHR_STATUS
                ORDER BY t.BR_TCHR_NM ASC";
        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(*) FROM {$this->tableName} t LEFT JOIN SCHL_BRANCH b ON t.BR_TCHR_BR_ID = b.SCHL_BR_ID WHERE 1=1";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            $userId = $user['userId'] ?? $user['user_id'] ?? '';
            if ($roleId === 'R_SCHOOLADMIN' || $roleId === 'R_SCHOOLEXECUTIVE') {
                $sql .= " AND b.SCHL_BR_CENTER_ID = ?";
                $params[] = $userId;
            } elseif ($roleId === 'R_BRANCHADMIN' || $roleId === 'R_BRANCHEXECUTIVE' || $roleId === 'R_BRANCHOFFICIAL') {
                $sql .= " AND t.BR_TCHR_BR_ID = ?";
                $params[] = $userId;
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT 
                t.BR_TCHR_ID AS TCHR_ID,
                t.BR_TCHR_ID AS id,
                t.BR_TCHR_NM AS TCHR_NM,
                t.BR_TCHR_NM AS name,
                t.BR_TCHR_BR_ID AS BR_TCHR_BR_ID,
                t.BR_TCHR_BR_ID AS branch_id,
                t.BR_TCHR_BR_ID AS branchId,
                COALESCE(b.SCHL_BR_NM, 'Main Campus') AS branch_name,
                COALESCE(b.SCHL_BR_NM, 'Main Campus') AS branchName,
                t.BR_TCHR_EMAI_ID AS TCHR_EMAIL,
                t.BR_TCHR_EMAI_ID AS email,
                t.BR_TCHR_CONT_NO1 AS TCHR_CONTACT_NO,
                t.BR_TCHR_CONT_NO1 AS phone,
                t.BR_TCHR_AADHAR AS aadhar,
                t.BR_TCHR_AADHAR AS BR_TCHR_AADHAR,
                t.BR_TCHR_PAN AS pan,
                t.BR_TCHR_PAN AS panCard,
                t.BR_TCHR_PAN AS BR_TCHR_PAN,
                t.BR_TCHR_ASSIGNED_CLASS_ID AS assignedClassId,
                t.BR_TCHR_ASSIGNED_CLASS_ID AS BR_TCHR_ASSIGNED_CLASS_ID,
                cls.SCHL_BR_CLASS_NM AS assignedClassName,
                t.TCHR_STATUS,
                t.TCHR_STATUS AS status,
                GROUP_CONCAT(DISTINCT s.BR_CLS_SUB_NAME SEPARATOR ', ') AS subjects,
                GROUP_CONCAT(DISTINCT s.BR_CLS_SUB_ID) AS subject_ids,
                MAX(ts.TCHR_SUB_ID) AS subject_id,
                MAX(ts.TCHR_SUB_ID) AS subjectId,
                COUNT(DISTINCT s.BR_CLS_ID) AS classes,
                GROUP_CONCAT(DISTINCT c.SCHL_BR_CLASS_NM SEPARATOR ', ') AS class_names,
                GROUP_CONCAT(DISTINCT c.SCHL_BR_CLASS_NM SEPARATOR ', ') AS classNames
                FROM {$this->tableName} t 
                LEFT JOIN SCHL_BRANCH b ON t.BR_TCHR_BR_ID = b.SCHL_BR_ID
                LEFT JOIN SCHL_BR_CLASS cls ON t.BR_TCHR_ASSIGNED_CLASS_ID = cls.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_TCHR_SUB ts ON t.BR_TCHR_ID = ts.TCHR_ID
                LEFT JOIN SCHL_BR_CLS_SUBJECT s ON ts.TCHR_SUB_ID = s.BR_CLS_SUB_ID
                LEFT JOIN SCHL_BR_CLASS c ON s.BR_CLS_ID = c.SCHL_BR_CLS_ID
                WHERE t.BR_TCHR_ID = ?
                GROUP BY t.BR_TCHR_ID, t.BR_TCHR_NM, t.BR_TCHR_BR_ID, b.SCHL_BR_NM, t.BR_TCHR_EMAI_ID, t.BR_TCHR_CONT_NO1, t.BR_TCHR_AADHAR, t.BR_TCHR_PAN, t.BR_TCHR_ASSIGNED_CLASS_ID, cls.SCHL_BR_CLASS_NM, t.TCHR_STATUS");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function create($data) {
        $insertData = [
            'BR_TCHR_ID' => $data['TCHR_ID'] ?? ($data['id'] ?? null),
            'BR_TCHR_NM' => $data['TCHR_NM'] ?? ($data['name'] ?? null),
            'BR_TCHR_BR_ID' => $data['BR_TCHR_BR_ID'] ?? ($data['branch_id'] ?? ($data['branchId'] ?? null)),
            'BR_TCHR_EMAI_ID' => $data['TCHR_EMAIL'] ?? ($data['email'] ?? null),
            'BR_TCHR_AADHAR' => $data['BR_TCHR_AADHAR'] ?? ($data['aadhar'] ?? ''),
            'BR_TCHR_PAN' => strtoupper(trim($data['BR_TCHR_PAN'] ?? ($data['pan'] ?? ($data['panCard'] ?? '')))),
            'BR_TCHR_ASSIGNED_CLASS_ID' => $data['BR_TCHR_ASSIGNED_CLASS_ID'] ?? ($data['assignedClassId'] ?? ($data['classId'] ?? null)),
            'BR_TCHR_CONT_NO1' => $data['TCHR_CONTACT_NO'] ?? ($data['phone'] ?? null),
            'TCHR_STATUS' => $data['TCHR_STATUS'] ?? ($data['status'] ?? 'Active')
        ];

        $sql = "INSERT INTO {$this->tableName} (BR_TCHR_ID, BR_TCHR_NM, BR_TCHR_BR_ID, BR_TCHR_EMAI_ID, BR_TCHR_AADHAR, BR_TCHR_PAN, BR_TCHR_ASSIGNED_CLASS_ID, BR_TCHR_CONT_NO1, TCHR_STATUS) 
                VALUES (:BR_TCHR_ID, :BR_TCHR_NM, :BR_TCHR_BR_ID, :BR_TCHR_EMAI_ID, :BR_TCHR_AADHAR, :BR_TCHR_PAN, :BR_TCHR_ASSIGNED_CLASS_ID, :BR_TCHR_CONT_NO1, :TCHR_STATUS)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($insertData);
        return $insertData['BR_TCHR_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $mapping = [
            'TCHR_NM' => 'BR_TCHR_NM',
            'name' => 'BR_TCHR_NM',
            'BR_TCHR_BR_ID' => 'BR_TCHR_BR_ID',
            'branch_id' => 'BR_TCHR_BR_ID',
            'branchId' => 'BR_TCHR_BR_ID',
            'TCHR_EMAIL' => 'BR_TCHR_EMAI_ID',
            'email' => 'BR_TCHR_EMAI_ID',
            'BR_TCHR_AADHAR' => 'BR_TCHR_AADHAR',
            'aadhar' => 'BR_TCHR_AADHAR',
            'BR_TCHR_PAN' => 'BR_TCHR_PAN',
            'pan' => 'BR_TCHR_PAN',
            'panCard' => 'BR_TCHR_PAN',
            'BR_TCHR_ASSIGNED_CLASS_ID' => 'BR_TCHR_ASSIGNED_CLASS_ID',
            'assignedClassId' => 'BR_TCHR_ASSIGNED_CLASS_ID',
            'classId' => 'BR_TCHR_ASSIGNED_CLASS_ID',
            'TCHR_CONTACT_NO' => 'BR_TCHR_CONT_NO1',
            'phone' => 'BR_TCHR_CONT_NO1',
            'TCHR_STATUS' => 'TCHR_STATUS',
            'status' => 'TCHR_STATUS'
        ];
        
        foreach ($mapping as $frontendKey => $dbCol) {
            if (array_key_exists($frontendKey, $data)) {
                $fieldsToUpdate[$dbCol] = "{$dbCol} = :{$dbCol}";
                $val = $data[$frontendKey];
                if ($dbCol === 'BR_TCHR_PAN' && is_string($val)) {
                    $val = strtoupper(trim($val));
                }
                $params[$dbCol] = $val;
            }
        }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        $params['id'] = $id;
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', array_values($fieldsToUpdate)) . " WHERE BR_TCHR_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE BR_TCHR_ID = ?");
        return $stmt->execute([$id]);
    }
}
