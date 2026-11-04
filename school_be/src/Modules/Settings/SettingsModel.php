<?php

class SettingsModel {
    private $db;
    private $tableName = 'SCHL_WHITELABEL';

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureTable();
    }

    private function ensureTable() {
        try {
            // Create table if not exists with nullable WL_BMN_ID & WL_BRN_ID to support Super Admin global settings
            $this->db->exec("CREATE TABLE IF NOT EXISTS {$this->tableName} (
                WL_ID VARCHAR(100) PRIMARY KEY,
                WL_BMN_ID VARCHAR(100) NULL,
                WL_BRN_ID VARCHAR(100) NULL,
                WL_DESC TEXT NULL,
                WL_IMG MEDIUMBLOB NULL,
                WL_BANNER MEDIUMBLOB NULL,
                WL_CREATEDBY VARCHAR(100) NULL,
                WL_CREATEDAT DATETIME NULL,
                WL_UPDATEDBY VARCHAR(100) NULL,
                WL_UPDATEDAT DATETIME NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            // Ensure columns exist and have appropriate types if table already existed with older schema
            $this->db->exec("ALTER TABLE {$this->tableName} 
                MODIFY COLUMN WL_BMN_ID VARCHAR(100) NULL,
                MODIFY COLUMN WL_BRN_ID VARCHAR(100) NULL,
                MODIFY COLUMN WL_DESC LONGTEXT NULL,
                ADD COLUMN IF NOT EXISTS WL_BANNER MEDIUMBLOB NULL");
        } catch (Exception $e) {
            // Log or ignore non-critical migration errors
            error_log("SettingsModel ensureTable note: " . $e->getMessage());
        }
    }

    public function getSettings($bmnId = null, $brnId = null) {
        try {
            // If branch is provided without bmnId, find parent school
            if ($brnId && !$bmnId) {
                try {
                    $bStmt = $this->db->prepare("SELECT SCHL_BR_CENTER_ID FROM SCHL_BRANCH WHERE SCHL_BR_ID = ? LIMIT 1");
                    $bStmt->execute([$brnId]);
                    $bmnId = $bStmt->fetchColumn() ?: null;
                } catch (Exception $e) {}
            }

            $branchRow = null;
            $schoolRow = null;
            $globalRow = null;

            if ($brnId) {
                $bSql = "SELECT * FROM {$this->tableName} WHERE WL_BRN_ID = ? LIMIT 1";
                $bStmt = $this->db->prepare($bSql);
                $bStmt->execute([$brnId]);
                $branchRow = $bStmt->fetch(PDO::FETCH_ASSOC);
            }

            if ($bmnId) {
                $sSql = "SELECT * FROM {$this->tableName} WHERE WL_BMN_ID = ? AND (WL_BRN_ID IS NULL OR WL_BRN_ID = '') LIMIT 1";
                $sStmt = $this->db->prepare($sSql);
                $sStmt->execute([$bmnId]);
                $schoolRow = $sStmt->fetch(PDO::FETCH_ASSOC);
            }

            if (!$bmnId && !$brnId) {
                // Global Super Admin settings lookup
                $gSql = "SELECT * FROM {$this->tableName} WHERE (WL_BMN_ID IS NULL OR WL_BMN_ID = '') AND (WL_BRN_ID IS NULL OR WL_BRN_ID = '') LIMIT 1";
                $gStmt = $this->db->query($gSql);
                $globalRow = $gStmt->fetch(PDO::FETCH_ASSOC);
            }

            // Merge hierarchy: Branch -> School -> Global
            $row = $branchRow ?: ($schoolRow ?: $globalRow);

            if ($branchRow && $schoolRow) {
                // If branch has no custom banner or logo, inherit from parent school
                if (empty($row['WL_BANNER']) && !empty($schoolRow['WL_BANNER'])) {
                    $row['WL_BANNER'] = $schoolRow['WL_BANNER'];
                }
                if (empty($row['WL_IMG']) && !empty($schoolRow['WL_IMG'])) {
                    $row['WL_IMG'] = $schoolRow['WL_IMG'];
                }
                // Merge WL_DESC JSON
                $bDesc = is_array($branchRow['WL_DESC']) ? $branchRow['WL_DESC'] : (json_decode($branchRow['WL_DESC'] ?? '{}', true) ?: []);
                $sDesc = is_array($schoolRow['WL_DESC']) ? $schoolRow['WL_DESC'] : (json_decode($schoolRow['WL_DESC'] ?? '{}', true) ?: []);
                $mergedDesc = array_merge($sDesc, $bDesc);
                $row['WL_DESC'] = $mergedDesc;
            }

            if ($row) {
                // If there's an image blob, convert to base64
                if (!empty($row['WL_IMG'])) {
                    $row['WL_IMG_BASE64'] = 'data:image/png;base64,' . base64_encode($row['WL_IMG']);
                }
                unset($row['WL_IMG']); // Don't send raw blob data
                
                // Convert Banner blob to base64
                if (!empty($row['WL_BANNER'])) {
                    $row['WL_BANNER_BASE64'] = 'data:image/png;base64,' . base64_encode($row['WL_BANNER']);
                }
                unset($row['WL_BANNER']);

                // Parse WL_DESC if it's JSON
                if (!empty($row['WL_DESC'])) {
                    $decoded = json_decode($row['WL_DESC'], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $row['WL_DESC'] = $decoded;
                    }
                }
                
                return $row;
            }

            return null;
        } catch (Exception $e) {
            return null;
        }
    }

    public function saveSettings($bmnId = null, $brnId = null, $descJson = null, $imgBase64 = null, $bannerBase64 = null) {
        try {
            if ($bmnId === '' || $bmnId === '0' || $bmnId === 0 || $bmnId === 'null' || $bmnId === 'undefined') $bmnId = null;
            if ($brnId === '' || $brnId === '0' || $brnId === 0 || $brnId === 'null' || $brnId === 'undefined') $brnId = null;

            // First check if a record exists for this exact level
            $sql = "SELECT WL_ID FROM {$this->tableName} WHERE 1=1";
            $params = [];
            
            if ($brnId) {
                $sql .= " AND WL_BRN_ID = ?";
                $params[] = $brnId;
            } elseif ($bmnId) {
                $sql .= " AND WL_BMN_ID = ? AND (WL_BRN_ID IS NULL OR WL_BRN_ID = '')";
                $params[] = $bmnId;
            } else {
                $sql .= " AND (WL_BMN_ID IS NULL OR WL_BMN_ID = '') AND (WL_BRN_ID IS NULL OR WL_BRN_ID = '')";
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            // Process image base64 if provided
            $imgData = null;
            if ($imgBase64 && preg_match('/^data:image\/(\w+);base64,/', $imgBase64, $type)) {
                $imgData = base64_decode(substr($imgBase64, strpos($imgBase64, ',') + 1));
            } elseif ($imgBase64 && !strpos($imgBase64, 'data:image')) {
                // It's just base64 string
                $imgData = base64_decode($imgBase64);
            }

            // Process banner base64 if provided
            $bannerData = null;
            if ($bannerBase64 && preg_match('/^data:image\/(\w+);base64,/', $bannerBase64, $type)) {
                $bannerData = base64_decode(substr($bannerBase64, strpos($bannerBase64, ',') + 1));
            } elseif ($bannerBase64 && !strpos($bannerBase64, 'data:image')) {
                $bannerData = base64_decode($bannerBase64);
            }

            if ($existing) {
                // Update
                $updateFields = [];
                $updateParams = [];

                if ($descJson !== null) {
                    $updateFields[] = "WL_DESC = ?";
                    $updateParams[] = $descJson;
                }
                
                if ($imgData !== null) {
                    $updateFields[] = "WL_IMG = ?";
                    $updateParams[] = $imgData;
                }

                if ($bannerData !== null) {
                    $updateFields[] = "WL_BANNER = ?";
                    $updateParams[] = $bannerData;
                }

                if (empty($updateFields)) {
                    return true; // nothing to update
                }

                $updateParams[] = $existing['WL_ID'];
                
                $updateSql = "UPDATE {$this->tableName} SET " . implode(', ', $updateFields) . " WHERE WL_ID = ?";
                $updateStmt = $this->db->prepare($updateSql);
                return $updateStmt->execute($updateParams);
            } else {
                // Insert
                $id = uniqid('WL_');
                $bmn = $bmnId ?: null; // Fix bmn parsing to null
                $brn = $brnId ? $brnId : null;
                
                $insertSql = "INSERT INTO {$this->tableName} (WL_ID, WL_BMN_ID, WL_BRN_ID, WL_DESC, WL_IMG, WL_BANNER) VALUES (?, ?, ?, ?, ?, ?)";
                $insertStmt = $this->db->prepare($insertSql);
                return $insertStmt->execute([
                    $id,
                    $bmn,
                    $brn,
                    $descJson ?: '{}',
                    $imgData,
                    $bannerData
                ]);
            }
        } catch (Exception $e) {
            file_put_contents(__DIR__ . '/settings_error.log', date('Y-m-d H:i:s') . " - Error: " . $e->getMessage() . "\n", FILE_APPEND);
            error_log("SettingsModel saveSettings Error: " . $e->getMessage());
            return $e->getMessage();
        }
    }
}

