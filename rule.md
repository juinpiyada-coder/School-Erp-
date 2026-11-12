# Project Rules & Fast Execution Protocol: School ERP

## 1. Fast Execution Protocol (Zero-Delay)
- **Do NOT run heavy scanning or background check commands**: Avoid executing full AST/directory scans, recursive scans, or looping queries across the project unless explicitly demanded.
- **Fast File Operations**: Always inspect or edit targeted files directly using native tools (`read_file`, `edit_file`).
- **Never Run Heavy Build Commands**: Do not run `npm run build`, `vite build`, or full compilation suites during normal bug fixes.

---

## 2. Zero-Latency Module Navigation (Standard Paths)
Directly navigate to standard module paths without scanning:
- **School Details**: `school_ui/src/pages/academic/SchoolDetails.jsx` & `school_be/src/Modules/Auth/SchoolService.php`
- **Branches**: `school_ui/src/pages/academic/Branches.jsx` & `school_be/src/Modules/Academic/BranchModel.php`
- **User Logins & Auth**: `school_ui/src/pages/auth/UserLogins.jsx` & `school_be/src/Modules/Auth/UserService.php`
- **Roles & Permissions**: `school_ui/src/pages/user/Roles.jsx` & `school_ui/src/pages/auth/RoleLinks.jsx`
- **Students**: `school_ui/src/pages/student/Students.jsx` & `school_be/src/Modules/Academic/StudentController.php`
- **Student Portal Modules**:
  - Daily Routine: `school_ui/src/pages/student/DailyRoutine.jsx`
  - Attendance Report: `school_ui/src/pages/student/StudentAttendance.jsx`
  - Subject Completion: `school_ui/src/pages/student/SubjectClassCompletion.jsx`
  - Fees Report: `school_ui/src/pages/student/FeesDuePaidReport.jsx`
- **Teachers**: `school_ui/src/pages/teacher/Teachers.jsx` & `school_ui/src/pages/teacher/TeacherMapping.jsx`
- **Classes, Sessions & Schedules**: 
  - `school_ui/src/pages/academic/Classes.jsx`
  - `school_ui/src/pages/academic/ClassSessions.jsx`
  - `school_ui/src/pages/academic/ClassSchedule.jsx`
- **Shell, Navigation & Branding**:
  - `school_ui/src/components/common/Header.jsx`
  - `school_ui/src/components/common/Sidebar.jsx`
  - `school_ui/src/App.jsx`

---

## 3. UI Branding & Role Integrity Rules
- **Brand Isolation**: Non-SuperAdmin accounts (Students, Teachers, Parents, Branch Staff) must **never** inherit the global SuperAdmin branding `"Qubix System Admin"`.
- **Display Fallback**: Always display `${branch_name} · ${school_name}` or the role-specific portal title (`Student Portal`, `Teacher Portal`, `Guardian Portal`).
- **Route Aliasing**: Ensure route consistency across hash routing (`/student/routine` & `/routine`, `/student/attendance-report` & `/attendance-report`).

---

## 4. Code Quality & Syntax Rules
- **Template Literals**: In JavaScript/JSX, always preserve literal backticks (`` ` ``) and avoid unescaped variable injections.
- **Hook Ordering**: Always declare React hooks (`useState`, `useRef`, `useMemo`) before computing values or calling helper functions that reference those states.
- **Root-Cause First**: Diagnose errors directly from stack traces and make targeted edits immediately.

