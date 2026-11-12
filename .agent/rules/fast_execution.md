# School ERP Agent Workspace Rules

You MUST strictly follow these workspace instructions:

1. **NO Heavy Scanning or Background Checks**:
   - Never run unprompted scanning scripts, background verification checks, or directory-wide loops.
   - Work directly on the target files using native tools (`read_file` and `edit_file`).

2. **Direct Module Targeting**:
   - When asked to inspect or edit any ERP feature, jump directly to its exact path:
     - Student Routine: `school_ui/src/pages/student/DailyRoutine.jsx`
     - Student Attendance: `school_ui/src/pages/student/StudentAttendance.jsx`
     - Student Dashboard: `school_ui/src/pages/dashboards/StudentDashboard.jsx`
     - Sidebar Branding: `school_ui/src/components/common/Sidebar.jsx`
     - Header Branding: `school_ui/src/components/common/Header.jsx`
     - Routes: `school_ui/src/App.jsx`
     - Schedules Backend: `school_be/src/Modules/Academic/AcademicController.php`
     - Student Backend: `school_be/src/Modules/Student/StudentController.php`

3. **Fast and Safe Edits**:
   - Make precise edits directly.
   - Preserve existing JSX structure, template literal backticks, and React hook order.

