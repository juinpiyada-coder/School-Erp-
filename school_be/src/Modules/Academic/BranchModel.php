<?php


class BranchModel {
    private $db;
    private $tableName = 'SCHL_BRANCH';

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll($limit = null, $offset = null, $user = null) {
        $sql = "SELECT * FROM {$this->tableName} WHERE 1=1";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            if ($roleId === 'R_SCHOOLADMIN' || strpos($roleId, 'SCHOOL') !== false) {
                $candidateIds = array_values(array_filter(array_unique([
                    $user['school_id'] ?? null,
                    $user['user_school_id'] ?? null,
                    $user['SCHL_ID'] ?? null,
                    $user['userId'] ?? null,
                    $user['user_id'] ?? null,
                    $user['id'] ?? null
                ])));
                // Also resolve school ID from MSTR_SCHOOL_MAIN if user_id or email matches
                if (!empty($user['user_id']) || !empty($user['userId']) || !empty($user['email'])) {
                    try {
                        $uid = $user['user_id'] ?? $user['userId'] ?? '';
                        $uemail = $user['email'] ?? '';
                        $stmtSch = $this->db->prepare("SELECT schl_mn_id FROM MSTR_SCHOOL_MAIN WHERE schl_mn_id = ? OR schl_mn_emailid = ? LIMIT 1");
                        $stmtSch->execute([$uid, $uemail]);
                        $foundSchId = $stmtSch->fetchColumn();
                        if ($foundSchId && !in_array($foundSchId, $candidateIds)) {
                            $candidateIds[] = $foundSchId;
                        }
                    } catch (Exception $e) {}
                }
                if (!empty($candidateIds)) {
                    $placeholders = implode(',', array_fill(0, count($candidateIds), '?'));
                    $sql .= " AND SCHL_BR_CENTER_ID IN ($placeholders)";
                    foreach ($candidateIds as $cid) {
                        $params[] = $cid;
                    }
                }
            } elseif ($roleId === 'R_BRANCHADMIN' || strpos($roleId, 'BRANCH') !== false) {
                $candidateBranchIds = array_values(array_filter(array_unique([
                    $user['branch_id'] ?? null,
                    $user['user_branch_id'] ?? null,
                    $user['SCHL_BR_ID'] ?? null,
                    $user['userId'] ?? null,
                    $user['user_id'] ?? null,
                    $user['id'] ?? null
                ])));
                if (!empty($candidateBranchIds)) {
                    $placeholders = implode(',', array_fill(0, count($candidateBranchIds), '?'));
                    $sql .= " AND SCHL_BR_ID IN ($placeholders)";
                    foreach ($candidateBranchIds as $bid) {
                        $params[] = $bid;
                    }
                }
            }
        }
        $sql .= " ORDER BY SCHL_BR_ID DESC";
        if ($limit !== null && $offset !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    
    public function getTotalCount($user = null) {
        $sql = "SELECT COUNT(*) FROM {$this->tableName} WHERE 1=1";
        $params = [];
        if ($user) {
            $roleId = strtoupper($user['role_id'] ?? $user['user_role'] ?? '');
            if ($roleId === 'R_SCHOOLADMIN' || strpos($roleId, 'SCHOOL') !== false) {
                $candidateIds = array_values(array_filter(array_unique([
                    $user['school_id'] ?? null,
                    $user['user_school_id'] ?? null,
                    $user['SCHL_ID'] ?? null,
                    $user['userId'] ?? null,
                    $user['user_id'] ?? null,
                    $user['id'] ?? null
                ])));
                // Also resolve school ID from MSTR_SCHOOL_MAIN if user_id or email matches
                if (!empty($user['user_id']) || !empty($user['userId']) || !empty($user['email'])) {
                    try {
                        $uid = $user['user_id'] ?? $user['userId'] ?? '';
                        $uemail = $user['email'] ?? '';
                        $stmtSch = $this->db->prepare("SELECT schl_mn_id FROM MSTR_SCHOOL_MAIN WHERE schl_mn_id = ? OR schl_mn_emailid = ? LIMIT 1");
                        $stmtSch->execute([$uid, $uemail]);
                        $foundSchId = $stmtSch->fetchColumn();
                        if ($foundSchId && !in_array($foundSchId, $candidateIds)) {
                            $candidateIds[] = $foundSchId;
                        }
                    } catch (Exception $e) {}
                }
                if (!empty($candidateIds)) {
                    $placeholders = implode(',', array_fill(0, count($candidateIds), '?'));
                    $sql .= " AND SCHL_BR_CENTER_ID IN ($placeholders)";
                    foreach ($candidateIds as $cid) {
                        $params[] = $cid;
                    }
                }
            } elseif ($roleId === 'R_BRANCHADMIN' || strpos($roleId, 'BRANCH') !== false) {
                $candidateBranchIds = array_values(array_filter(array_unique([
                    $user['branch_id'] ?? null,
                    $user['user_branch_id'] ?? null,
                    $user['SCHL_BR_ID'] ?? null,
                    $user['userId'] ?? null,
                    $user['user_id'] ?? null,
                    $user['id'] ?? null
                ])));
                if (!empty($candidateBranchIds)) {
                    $placeholders = implode(',', array_fill(0, count($candidateBranchIds), '?'));
                    $sql .= " AND SCHL_BR_ID IN ($placeholders)";
                    foreach ($candidateBranchIds as $bid) {
                        $params[] = $bid;
                    }
                }
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT * FROM {$this->tableName} WHERE SCHL_BR_ID = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function create($data) {
        $fields = ['SCHL_BR_ID', 'SCHL_BR_CENTER_ID', 'SCHL_BR_NM', 'SCHL_BR_ADDRESS', 'SCHL_BR_CITY', 'SCHL_BR_STATE', 'SCHL_BR_PIN', 'SCHL_BR_COUNTRY', 'SCHL_BR_MEDIUM', 'SCHL_BR_BOARD', 'SCHL_BR_EMAILID', 'SCHL_BR_CONTACTNO'];
        $insertData = [];
        foreach ($fields as $field) {
            $val = isset($data[$field]) ? $data[$field] : null;
            if ($val === '' || $val === '0' || $val === 0 || $val === 'null') {
                $val = null;
            }
            $insertData[$field] = $val;
        }

        $sql = "INSERT INTO {$this->tableName} (SCHL_BR_ID, SCHL_BR_CENTER_ID, SCHL_BR_NM, SCHL_BR_ADDRESS, SCHL_BR_CITY, SCHL_BR_STATE, SCHL_BR_PIN, SCHL_BR_COUNTRY, SCHL_BR_MEDIUM, SCHL_BR_BOARD, SCHL_BR_EMAILID, SCHL_BR_CONTACTNO)
                VALUES (:SCHL_BR_ID, :SCHL_BR_CENTER_ID, :SCHL_BR_NM, :SCHL_BR_ADDRESS, :SCHL_BR_CITY, :SCHL_BR_STATE, :SCHL_BR_PIN, :SCHL_BR_COUNTRY, :SCHL_BR_MEDIUM, :SCHL_BR_BOARD, :SCHL_BR_EMAILID, :SCHL_BR_CONTACTNO)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($insertData);
        return $insertData['SCHL_BR_ID'];
    }

    public function update($id, $data) {
        $fieldsToUpdate = [];
        $params = [];

        $updatableFields = ['SCHL_BR_CENTER_ID', 'SCHL_BR_NM', 'SCHL_BR_ADDRESS', 'SCHL_BR_CITY', 'SCHL_BR_STATE', 'SCHL_BR_PIN', 'SCHL_BR_COUNTRY', 'SCHL_BR_MEDIUM', 'SCHL_BR_BOARD', 'SCHL_BR_EMAILID', 'SCHL_BR_CONTACTNO'];
        foreach ($updatableFields as $field) {
            if (array_key_exists($field, $data)) {
                $val = $data[$field];
                if ($val === '' || $val === '0' || $val === 0 || $val === 'null') {
                    $val = null;
                }
                $fieldsToUpdate[] = "{$field} = :{$field}";
                $params[$field] = $val;
            }
        }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        $params['id'] = $id;
        $sql = "UPDATE {$this->tableName} SET " . implode(', ', $fieldsToUpdate) . " WHERE SCHL_BR_ID = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $queries = [
            "DELETE FROM SCHL_CLASS_TIMETABLE WHERE SCHL_CLS_SCHLDL_SEC_SESS_ID IN (SELECT SCHL_BR_CLASS_SEC_SESS_ID FROM SCHL_BR_CLASS_SEC_SESSION WHERE SCHL_BR_CLASS_SEC_SESS_BR_ID = ?)",
            "UPDATE SCHL_STU SET STU_BR_CLASS_ID = NULL WHERE STU_BR_CLASS_ID IN (SELECT SCHL_BR_CLASS_SEC_SESS_ID FROM SCHL_BR_CLASS_SEC_SESSION WHERE SCHL_BR_CLASS_SEC_SESS_BR_ID = ?)",
            "DELETE FROM SCHL_BR_CLASS_SEC_SESSION WHERE SCHL_BR_CLASS_SEC_SESS_BR_ID = ?",
            "DELETE FROM SCHL_BR_ROOM WHERE SCHL_BR_REF_ID = ?",
            "DELETE FROM SCHL_TCHR_SUB WHERE TCHR_ID IN (SELECT BR_TCHR_ID FROM SCHL_BR_TCHR WHERE BR_TCHR_BR_ID = ?)",
            "DELETE FROM SCHL_TCHR_ATTENDANCE WHERE TCHR_REF_ID IN (SELECT BR_TCHR_ID FROM SCHL_BR_TCHR WHERE BR_TCHR_BR_ID = ?)",
            "DELETE FROM SCHL_BR_TCHR WHERE BR_TCHR_BR_ID = ?",
            "DELETE FROM SCHL_BR_CLS_SUBJECT WHERE BR_CLS_ID IN (SELECT SCHL_BR_CLS_ID FROM SCHL_BR_CLASS WHERE SCHL_BR_CENT_ID = ?)",
            "DELETE FROM SCHL_BR_CLASS WHERE SCHL_BR_CENT_ID = ?",
            "DELETE FROM SCHL_MESSAGES WHERE branch_id = ?"
        ];

        foreach ($queries as $sql) {
            try {
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$id]);
            } catch (\Exception $e) {
                // Safely handle missing optional tables/columns during cleanup
            }
        }

        $stmt = $this->db->prepare("DELETE FROM {$this->tableName} WHERE SCHL_BR_ID = ?");
        return $stmt->execute([$id]);
    }
}
