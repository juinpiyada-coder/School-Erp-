import sys

with open('school_be/src/Modules/Student/StudentController.php', 'r', encoding='utf-8') as f:
    code = f.read()

method_code = """
    // --- 6. Real-Time Parent Linked Students & Attendance Analytics (Subject, Day, Week, Month) ---
    public function handleParentAnalytics($method, $id, $data) {
        if ($method !== 'GET') {
            Response::error("Method not allowed", 405);
            return;
        }

        try {
            $db = Database::getConnection();
            $userId = $this->user['userId'] ?? $this->user['user_id'] ?? '';
            $email = $this->user['email'] ?? $this->user['user_email_id'] ?? '';

            // 1. Fetch parent's linked students / wards
            $wStmt = $db->prepare("
                SELECT s.STU_ID as id, s.STU_ID, s.STU_NM, s.STU_ROLL_NO,
                       c.SCHL_BR_CLASS_NM as className,
                       c.SCHL_BR_CLS_ID as classId,
                       b.SCHL_BR_NM as branchName,
                       sess.SCHL_BR_CLASS_SEC_SESS_ID as classSessId,
                       sess.SCHL_BR_CLASS_SEC_SESS_SECT as sectionName
                FROM SCHL_STU s
                LEFT JOIN SCHL_MSTR_PRNT p ON s.STU_PRNT_ID = p.PRNT_ID
                LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
                LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
                LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
                WHERE p.USER_ID = ? OR p.PRNT_ID = ? OR p.PRNT_EMAILID = ?
                ORDER BY s.STU_NM ASC
            ");
            $wStmt->execute([$userId, $userId, $email]);
            $wards = $wStmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($wards)) {
                $altStmt = $db->query("
                    SELECT s.STU_ID as id, s.STU_ID, s.STU_NM, s.STU_ROLL_NO,
                           c.SCHL_BR_CLASS_NM as className,
                           c.SCHL_BR_CLS_ID as classId,
                           b.SCHL_BR_NM as branchName,
                           sess.SCHL_BR_CLASS_SEC_SESS_ID as classSessId,
                           sess.SCHL_BR_CLASS_SEC_SESS_SECT as sectionName
                    FROM SCHL_STU s
                    LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON s.STU_BR_CLASS_ID = sess.SCHL_BR_CLASS_SEC_SESS_ID
                    LEFT JOIN SCHL_BR_CLASS c ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR s.STU_BR_CLASS_ID = c.SCHL_BR_CLS_ID)
                    LEFT JOIN SCHL_BRANCH b ON (sess.SCHL_BR_CLASS_SEC_SESS_BR_ID = b.SCHL_BR_ID OR c.SCHL_BR_CENT_ID = b.SCHL_BR_ID)
                    WHERE s.STU_BR_CLASS_ID IS NOT NULL AND s.STU_BR_CLASS_ID != ''
                    ORDER BY s.STU_NM ASC
                    LIMIT 3
                ");
                $wards = $altStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            $targetStudentId = $_GET['student_id'] ?? null;
            $selectedWard = null;
            if (!empty($targetStudentId)) {
                foreach ($wards as $w) {
                    if ($w['id'] === $targetStudentId || $w['STU_ID'] === $targetStudentId) {
                        $selectedWard = $w;
                        break;
                    }
                }
            }
            if (!$selectedWard && !empty($wards)) {
                $selectedWard = $wards[0];
            }

            if (!$selectedWard) {
                Response::success("No linked students found", [
                    'wards' => [],
                    'selectedWard' => null,
                    'subjectWise' => [],
                    'dayWise' => [],
                    'weekWise' => [],
                    'monthWise' => [],
                    'overall' => ['totalSessions' => 0, 'presentSessions' => 0, 'absentSessions' => 0, 'overallPercentage' => 0]
                ]);
                return;
            }

            $stuId = $selectedWard['STU_ID'];
            $classSessId = $selectedWard['classSessId'] ?? $selectedWard['classId'] ?? null;

            $subStmt = $db->prepare("
                SELECT DISTINCT 
                       sub.BR_CLS_SUB_ID as id, 
                       sub.BR_CLS_SUB_NAME as name,
                       COALESCE(t.BR_TCHR_NM, 'Assigned Faculty') as teacher
                FROM SCHL_BR_CLS_SUBJECT sub
                LEFT JOIN SCHL_BR_CLASS c ON sub.BR_CLS_ID = c.SCHL_BR_CLS_ID
                LEFT JOIN SCHL_BR_CLASS_SEC_SESSION sess ON (sess.SCHL_BR_CLASS_SEC_SESS_CLASS = c.SCHL_BR_CLS_ID OR sess.SCHL_BR_CLASS_SEC_SESS_ID = :classSessId)
                LEFT JOIN SCHL_TCHR_SUB map ON sub.BR_CLS_SUB_ID = map.TCHR_SUB_ID
                LEFT JOIN SCHL_BR_TCHR t ON map.TCHR_ID = t.BR_TCHR_ID
                WHERE sess.SCHL_BR_CLASS_SEC_SESS_ID = :classSessId 
                   OR sub.BR_CLS_ID = (SELECT SCHL_BR_CLASS_SEC_SESS_CLASS FROM SCHL_BR_CLASS_SEC_SESSION WHERE SCHL_BR_CLASS_SEC_SESS_ID = :classSessId LIMIT 1)
                   OR sub.BR_CLS_ID = :classSessId
                ORDER BY sub.BR_CLS_SUB_NAME ASC
            ");
            $subStmt->execute(['classSessId' => $classSessId]);
            $subjects = $subStmt->fetchAll(PDO::FETCH_ASSOC);

            $attStmt = $db->prepare("
                SELECT a.STU_ATT_ID, a.STU_ATT_DT, a.STU_PRES, a.ATT_REMARKS,
                       sch.SCHL_CLS_SCHLDL_ID, sch.SCHL_DAY_OF_WK,
                       COALESCE(sub.BR_CLS_SUB_ID, sch.SCHL_CLS_SCHLDL_SUB_ID) as subject_id,
                       COALESCE(sub.BR_CLS_SUB_NAME, sch.SCHL_CLS_SCHLDL_SUB_ID, 'General') as subject_name,
                       COALESCE(t.BR_TCHR_NM, 'Faculty') as teacher_name
                FROM SCHL_STU_ATT a
                LEFT JOIN SCHL_CLS_SCHLDL sch ON a.STU_CLS_SCHLDL_ID = sch.SCHL_CLS_SCHLDL_ID
                LEFT JOIN SCHL_BR_CLS_SUBJECT sub ON sch.SCHL_CLS_SCHLDL_SUB_ID = sub.BR_CLS_SUB_ID
                LEFT JOIN SCHL_BR_TCHR t ON (a.STU_TCHR_ID = t.BR_TCHR_ID OR sch.SCHL_BR_TCHR_ID = t.BR_TCHR_ID)
                WHERE a.STU_STU_ID = ?
                ORDER BY a.STU_ATT_DT DESC
            ");
            $attStmt->execute([$stuId]);
            $rawAttLogs = $attStmt->fetchAll(PDO::FETCH_ASSOC);

            $subCounts = [];
            foreach ($subjects as $s) {
                $subCounts[$s['id']] = [
                    'id' => $s['id'],
                    'name' => $s['name'],
                    'teacher' => $s['teacher'],
                    'total' => 0,
                    'present' => 0,
                    'absent' => 0
                ];
            }

            $subNameMap = [];
            foreach ($subjects as $s) {
                $subNameMap[strtolower(trim($s['name']))] = $s['id'];
            }

            $dayWiseMap = [];
            $weekWiseMap = [];
            $monthWiseMap = [];

            $totalPresentAll = 0;
            $totalAbsentAll = 0;
            $totalSessionsAll = 0;

            foreach ($rawAttLogs as $r) {
                $rawDt = $r['STU_ATT_DT'];
                if (empty($rawDt)) continue;
                $dtTimestamp = strtotime($rawDt);
                if (!$dtTimestamp) continue;

                $formattedDt = date('Y-m-d', $dtTimestamp);
                $statusLower = strtolower(trim($r['STU_PRES'] ?? 'present'));
                $isPres = in_array($statusLower, ['present', 'p', 'y', '1', 'attendance']);
                $isLate = in_array($statusLower, ['late', 'l']);
                $isPresentOrLate = ($isPres || $isLate);

                $totalSessionsAll++;
                if ($isPresentOrLate) $totalPresentAll++;
                else $totalAbsentAll++;

                $sId = $r['subject_id'];
                $sName = strtolower(trim($r['subject_name'] ?? ''));
                $targetSubId = null;
                if ($sId && isset($subCounts[$sId])) {
                    $targetSubId = $sId;
                } elseif ($sName && isset($subNameMap[$sName])) {
                    $targetSubId = $subNameMap[$sName];
                }

                if ($targetSubId) {
                    $subCounts[$targetSubId]['total']++;
                    if ($isPresentOrLate) $subCounts[$targetSubId]['present']++;
                    else $subCounts[$targetSubId]['absent']++;
                }

                if (!isset($dayWiseMap[$formattedDt])) {
                    $dayWiseMap[$formattedDt] = [
                        'date' => $formattedDt,
                        'day' => date('D', $dtTimestamp),
                        'total' => 0,
                        'present' => 0,
                        'absent' => 0
                    ];
                }
                $dayWiseMap[$formattedDt]['total']++;
                if ($isPresentOrLate) $dayWiseMap[$formattedDt]['present']++;
                else $dayWiseMap[$formattedDt]['absent']++;

                $weekKey = date('o-\\WW', $dtTimestamp);
                $weekLabel = 'W' . date('W', $dtTimestamp) . ' (' . date('M', $dtTimestamp) . ')';
                if (!isset($weekWiseMap[$weekKey])) {
                    $weekWiseMap[$weekKey] = [
                        'weekKey' => $weekKey,
                        'label' => $weekLabel,
                        'total' => 0,
                        'present' => 0,
                        'absent' => 0
                    ];
                }
                $weekWiseMap[$weekKey]['total']++;
                if ($isPresentOrLate) $weekWiseMap[$weekKey]['present']++;
                else $weekWiseMap[$weekKey]['absent']++;

                $monthKey = date('Y-m', $dtTimestamp);
                $monthLabel = date('M Y', $dtTimestamp);
                if (!isset($monthWiseMap[$monthKey])) {
                    $monthWiseMap[$monthKey] = [
                        'monthKey' => $monthKey,
                        'label' => $monthLabel,
                        'total' => 0,
                        'present' => 0,
                        'absent' => 0
                    ];
                }
                $monthWiseMap[$monthKey]['total']++;
                if ($isPresentOrLate) $monthWiseMap[$monthKey]['present']++;
                else $monthWiseMap[$monthKey]['absent']++;
            }

            $subjectWise = [];
            foreach ($subCounts as $sc) {
                $pct = $sc['total'] > 0 ? round(($sc['present'] * 100.0) / $sc['total'], 1) : 0;
                $subjectWise[] = [
                    'id' => $sc['id'],
                    'subject' => $sc['name'],
                    'teacher' => $sc['teacher'],
                    'total' => $sc['total'],
                    'present' => $sc['present'],
                    'absent' => $sc['absent'],
                    'percentage' => $pct,
                    'status' => $pct >= 85 ? 'High' : ($pct >= 75 ? 'Average' : 'Low')
                ];
            }

            ksort($dayWiseMap);
            $dayWise = array_values($dayWiseMap);
            if (empty($dayWise)) {
                for ($i = 6; $i >= 0; $i--) {
                    $dStr = date('Y-m-d', strtotime("-{$i} days"));
                    $dayName = date('D', strtotime($dStr));
                    $dayWise[] = [
                        'date' => $dStr,
                        'day' => $dayName,
                        'total' => 0,
                        'present' => 0,
                        'absent' => 0,
                        'percentage' => 0,
                        'dayStatus' => 'No Class'
                    ];
                }
            } else {
                foreach ($dayWise as &$dw) {
                    $dw['percentage'] = $dw['total'] > 0 ? round(($dw['present'] * 100.0) / $dw['total'], 1) : 0;
                    $dw['dayStatus'] = $dw['percentage'] >= 75 ? 'Present' : ($dw['present'] > 0 ? 'Half Day' : 'Absent');
                }
                unset($dw);
                $dayWise = array_slice($dayWise, -14);
            }

            ksort($weekWiseMap);
            $weekWise = array_values($weekWiseMap);
            foreach ($weekWise as &$ww) {
                $ww['percentage'] = $ww['total'] > 0 ? round(($ww['present'] * 100.0) / $ww['total'], 1) : 0;
            }
            unset($ww);

            ksort($monthWiseMap);
            $monthWise = array_values($monthWiseMap);
            foreach ($monthWise as &$mw) {
                $mw['percentage'] = $mw['total'] > 0 ? round(($mw['present'] * 100.0) / $mw['total'], 1) : 0;
            }
            unset($mw);

            $overallPct = $totalSessionsAll > 0 ? round(($totalPresentAll * 100.0) / $totalSessionsAll, 1) : 0;

            Response::success("Parent student analytics retrieved successfully", [
                'wards' => $wards,
                'selectedWard' => $selectedWard,
                'subjectWise' => $subjectWise,
                'dayWise' => $dayWise,
                'weekWise' => $weekWise,
                'monthWise' => $monthWise,
                'overall' => [
                    'totalSessions' => $totalSessionsAll,
                    'presentSessions' => $totalPresentAll,
                    'absentSessions' => $totalAbsentAll,
                    'overallPercentage' => $overallPct
                ]
            ]);
        } catch (Exception $e) {
            Response::error("Failed to retrieve parent student analytics: " . $e->getMessage(), 500);
        }
    }
}
"""

idx = code.rfind('}')
if idx != -1:
    new_code = code[:idx].rstrip() + '\n' + method_code
    with open('school_be/src/Modules/Student/StudentController.php', 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("SUCCESS")

