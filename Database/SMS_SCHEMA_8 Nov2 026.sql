-- ============================================================================
-- SCHOOL MANAGEMENT SYSTEM (SMS) - PRODUCTION DATABASE SCHEMA
-- Target Database: myskool_1_sms_db
-- Total Tables Defined in Schema: 30 Tables
-- Engine: InnoDB | Collation: latin1_swedish_ci
--
-- TABLE INVENTORY & MODULE OVERVIEW (30 TOTAL):
--   [Authentication & Security] (5 Tables)
--     1.  SM_MAS_ROLE                  - System User Roles
--     2.  SM_ROLE_LINKS                - Navigation Menus & Submenus
--     3.  SM_USER_LOGIN                - User Credentials & Auth
--     4.  SM_SETTING                   - App & User Config Settings
--     5.  SM_BOARD                     - Education Boards (CBSE/ICSE/State)
--
--   [Multi-Tenancy & School Structure] (3 Tables)
--     6.  MSTR_SCHOOL_MAIN             - Main School Entity (Tenant Root)
--     7.  SCHL_BRANCH                  - School Branches
--     8.  SCHL_WHITELABEL              - School Whitelabel / Logo & Theme
--
--   [Academic & Classroom Infrastructure] (7 Tables)
--     9.  SCHL_BRCH_MATRIX             - Class Periods & Timetable Matrix
--     10. SCHL_ROOM_CATEGORY           - Room Types (Lab, Classroom, Hall)
--     11. SCHL_BR_ROOM                 - Classrooms & Laboratories
--     12. SCHL_BR_CLASS                - Grades / Classes
--     13. SCHL_BR_CLASS_SEC_SESSION    - Class Sections & Academic Sessions
--     14. SCHL_BR_CLS_SUBJECT          - Subjects per Class
--     15. SCHL_CLS_SCHLDL              - Master Routine & Class Schedules
--
--   [Staff & Teachers] (4 Tables)
--     16. SCHL_BR_TCHR                 - Teachers & Faculty
--     17. SCHL_TCHR_SUB                - Teacher-Subject Assignment Mapping
--     18. SCHL_TCHR_TIME_DTLS          - Teacher Work Timings / In-Out
--     19. SCHL_TCHR_ATT                - Teacher Daily Attendance
--
--   [Students & Guardians] (3 Tables)
--     20. SCHL_MSTR_PRNT               - Parents & Guardians
--     21. SCHL_STU                     - Enrolled Students Roster
--     22. SCHL_STU_ATT                 - Student Daily Attendance
--
--   [Notifications & Support] (2 Tables)
--     23. SMS_NOTIFICATION             - Notification Alerts & Broadcasts
--     24. SMS_NO_DTLS                  - Notification Attachments & Threads
--
--   [Finance & Fee Management] (6 Tables Complete)
--     25. SMS_BRCH_CLASS_FEE           - Branch Class Fee Master
--     26. SMS_BRCH_CLS_FEE_DTLS        - Class Fee Itemized Components
--     27. SMS_STU_FINE                 - Student Penalties & Fines
--     28. SMS_STU_FEE_MAP              - Student Monthly Fee Allocation & Discounts
--     29. SMS_STU_FEE_PAYMENT          - Student Fee Payment Records & Receipts
--     30. BRCH_FEE_COLLECTED           - Branch Monthly Fee Collection Reports
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ============================================================================
-- 1. AUTHENTICATION & ACCESS CONTROL
-- ============================================================================

-- 1. Master Roles
CREATE TABLE IF NOT EXISTS `SM_MAS_ROLE` (
  `MAS_ROLE_ID` varchar(100) NOT NULL,
  `MAS_ROLE_DESC` varchar(100) DEFAULT NULL,
  `MAS_ROLE_LINK` varchar(200) DEFAULT NULL,
  `MAS_ROLE_CREATEDBY` varchar(100) DEFAULT NULL,
  `MAS_ROLE_CREATEDAT` datetime DEFAULT NULL,
  `MAS_ROLE_UPDATEDBY` varchar(100) DEFAULT NULL,
  `MAS_ROLE_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`MAS_ROLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 2. Role Links / Menus
CREATE TABLE IF NOT EXISTS `SM_ROLE_LINKS` (
  `SM_RL_ID` varchar(100) NOT NULL,
  `SM_RL_ROLE_ID` varchar(100) DEFAULT NULL,
  `SM_RL_LINK_DESC` varchar(100) DEFAULT NULL,
  `SM_RL_LINK_URL` varchar(100) DEFAULT NULL,
  `SM_RL_LINK_SRL` int(11) DEFAULT NULL,
  `SM_RL_SUBMENU` varchar(100) DEFAULT NULL,
  `SM_RL_STATUS` varchar(20) DEFAULT 'ACTIVE',
  `SM_RL_CREATEDBY` varchar(100) DEFAULT NULL,
  `SM_RL_CREATEDAT` datetime DEFAULT NULL,
  `SM_RL_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SM_RL_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`SM_RL_ID`),
  KEY `SM_RL_ROLE_ID` (`SM_RL_ROLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 3. Users Login
CREATE TABLE IF NOT EXISTS `SM_USER_LOGIN` (
  `user_id` varchar(100) NOT NULL,
  `user_email_id` varchar(100) DEFAULT NULL,
  `user_first_name` varchar(100) DEFAULT NULL,
  `user_last_name` varchar(100) DEFAULT NULL,
  `user_passwd` varchar(255) DEFAULT NULL,
  `user_role` varchar(100) DEFAULT NULL,
  `user_school_id` varchar(100) DEFAULT NULL,
  `user_branch_id` varchar(100) DEFAULT NULL,
  `user_cr_dt` date DEFAULT NULL,
  `user_img` mediumblob DEFAULT NULL,
  `user_createdby` varchar(100) DEFAULT NULL,
  `user_createdat` datetime DEFAULT NULL,
  `user_updatedby` varchar(100) DEFAULT NULL,
  `user_updatedat` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `user_role` (`user_role`),
  KEY `user_email_id` (`user_email_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 4. User Settings
CREATE TABLE IF NOT EXISTS `SM_SETTING` (
  `SET_ID` varchar(100) NOT NULL,
  `SET_USER_ID` varchar(100) DEFAULT NULL,
  `SET_TYPE` varchar(100) DEFAULT NULL,
  `SET_VAL` varchar(100) DEFAULT NULL,
  `SET_CREATEDBY` varchar(100) DEFAULT NULL,
  `SET_CREATEDAT` datetime DEFAULT NULL,
  `SET_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SET_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`SET_ID`),
  KEY `SET_USER_ID` (`SET_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 5. Education Boards
CREATE TABLE IF NOT EXISTS `SM_BOARD` (
  `BRD_ID` varchar(100) NOT NULL,
  `BRD_DESC` varchar(100) NOT NULL,
  `BRD_STATE` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`BRD_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- ============================================================================
-- 2. INSTITUTION & TENANCY
-- ============================================================================

-- 6. Main School Entity
CREATE TABLE IF NOT EXISTS `MSTR_SCHOOL_MAIN` (
  `SCHL_MN_ID` varchar(100) NOT NULL,
  `SCHL_MN_NM` varchar(100) NOT NULL,
  `SCHL_MN_ADDRESS` varchar(300) DEFAULT NULL,
  `SCHL_MN_CITY` varchar(300) NOT NULL,
  `SCHL_MN_STATE` varchar(100) NOT NULL,
  `SCHL_MN_PIN` int(11) NOT NULL,
  `SCHL_MN_COUNTRY` varchar(100) NOT NULL,
  `SCHL_MN_EMAILID` varchar(200) NOT NULL,
  `SCHL_MN_CONTACTNO` varchar(100) NOT NULL,
  `SCHL_BRD_ID` varchar(100) DEFAULT NULL,
  `SCHL_LANGUAGE` varchar(100) DEFAULT NULL,
  `SCHL_MN_STATUS` varchar(20) DEFAULT 'ACTIVE',
  `SCHL_MN_CREATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_MN_CREATEDAT` datetime DEFAULT NULL,
  `SCHL_MN_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_MN_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`SCHL_MN_ID`),
  KEY `SCHL_BRD_ID` (`SCHL_BRD_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 7. School Branches
CREATE TABLE IF NOT EXISTS `SCHL_BRANCH` (
  `SCHL_BR_ID` varchar(100) NOT NULL,
  `SCHL_BR_CENTER_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_NM` varchar(100) NOT NULL,
  `SCHL_BR_ADDRESS` varchar(300) DEFAULT NULL,
  `SCHL_BR_CITY` varchar(300) NOT NULL,
  `SCHL_BR_STATE` varchar(100) NOT NULL,
  `SCHL_BR_PIN` int(11) NOT NULL,
  `SCHL_BR_COUNTRY` varchar(100) NOT NULL,
  `SCHL_BR_MEDIUM` varchar(20) DEFAULT NULL,
  `SCHL_BR_BOARD` varchar(20) DEFAULT NULL,
  `SCHL_BR_EMAILID` varchar(200) NOT NULL,
  `SCHL_BR_CONTACTNO` varchar(100) NOT NULL,
  `SCHL_BR_CREATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_CREATEDAT` datetime DEFAULT NULL,
  `SCHL_BR_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`SCHL_BR_ID`),
  KEY `SCHL_BR_CENTER_ID` (`SCHL_BR_CENTER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 8. School Whitelabel / Branding
CREATE TABLE IF NOT EXISTS `SCHL_WHITELABEL` (
  `WL_ID` varchar(100) NOT NULL,
  `WL_BMN_ID` varchar(100) NOT NULL,
  `WL_BRN_ID` varchar(100) DEFAULT NULL,
  `WL_DESC` varchar(100) NOT NULL,
  `WL_IMG` mediumblob DEFAULT NULL,
  `WL_BANNER` mediumblob DEFAULT NULL,
  `WL_CREATEDBY` varchar(100) DEFAULT NULL,
  `WL_CREATEDAT` datetime DEFAULT NULL,
  `WL_UPDATEDBY` varchar(100) DEFAULT NULL,
  `WL_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`WL_ID`),
  KEY `WL_BMN_ID` (`WL_BMN_ID`),
  KEY `WL_BRN_ID` (`WL_BRN_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- ============================================================================
-- 3. ACADEMICS & TIMETABLE MATRIX
-- ============================================================================

-- 9. Timetable Matrix
CREATE TABLE IF NOT EXISTS `SCHL_BRCH_MATRIX` (
  `SCHL_MAT_ID` varchar(100) NOT NULL,
  `SCHL_UNIQ_MATRIX_NM` varchar(100) NOT NULL,
  `SCHL_MAT_NM` varchar(100) DEFAULT NULL,
  `SCHL_NO_OF_CLASS` int(11) NOT NULL,
  `SCHL_CLASS_DURATION` int(11) NOT NULL,
  `SCHL_CLASS_FRM` varchar(100) DEFAULT NULL,
  `SCHL_CLASS_TO` varchar(100) DEFAULT NULL,
  `SCHL_WEEKOFDAY` varchar(100) DEFAULT NULL,
  `SCHL_MAT_SCHOOL_ID` varchar(100) DEFAULT NULL,
  `SCHL_MAT_BRANCH_ID` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`SCHL_MAT_ID`),
  KEY `SCHL_MAT_SCHOOL_ID` (`SCHL_MAT_SCHOOL_ID`),
  KEY `SCHL_MAT_BRANCH_ID` (`SCHL_MAT_BRANCH_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 10. Room Categories
CREATE TABLE IF NOT EXISTS `SCHL_ROOM_CATEGORY` (
  `CAT_ID` varchar(100) NOT NULL,
  `CAT_NAME` varchar(100) NOT NULL,
  `CAT_BRANCH_ID` varchar(100) DEFAULT NULL,
  `CAT_CREATEDBY` varchar(100) DEFAULT NULL,
  `CAT_CREATEDAT` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`CAT_ID`),
  KEY `CAT_BRANCH_ID` (`CAT_BRANCH_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 11. Rooms
CREATE TABLE IF NOT EXISTS `SCHL_BR_ROOM` (
  `SCHL_BR_RM_ID` varchar(100) NOT NULL,
  `SCHL_BR_REF_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_ROOM_DESC` varchar(100) DEFAULT NULL,
  `SCHL_BR_ROOM_CAPACITY` int(11) DEFAULT NULL,
  `SCHL_BR_FACILITY` varchar(100) DEFAULT NULL,
  `SCHL_BR_ISLAB` varchar(10) DEFAULT NULL,
  `SCHL_BR_FLR` varchar(10) DEFAULT NULL,
  `SCHL_BR_BUILDING` varchar(100) DEFAULT NULL,
  `SCHL_BR_ROOM_CAT` varchar(100) DEFAULT NULL,
  `SCHL_BR_RM_CREATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_RM_CREATEDAT` datetime DEFAULT NULL,
  `SCHL_BR_RM_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_RM_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`SCHL_BR_RM_ID`),
  KEY `SCHL_BR_REF_ID` (`SCHL_BR_REF_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 12. Classes
CREATE TABLE IF NOT EXISTS `SCHL_BR_CLASS` (
  `SCHL_BR_CLS_ID` varchar(100) NOT NULL,
  `SCHL_BR_CENT_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_NM` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_LANG` varchar(50) DEFAULT 'English',
  `SCHL_BR_BRD` varchar(50) DEFAULT 'CBSE',
  `SCHL_BR_MAT` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLS_CREATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLS_CREATEDAT` datetime DEFAULT NULL,
  `SCHL_BR_CLS_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLS_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`SCHL_BR_CLS_ID`),
  KEY `SCHL_BR_CENT_ID` (`SCHL_BR_CENT_ID`),
  KEY `SCHL_BR_MAT` (`SCHL_BR_MAT`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 13. Class Sessions & Sections
CREATE TABLE IF NOT EXISTS `SCHL_BR_CLASS_SEC_SESSION` (
  `SCHL_BR_CLASS_SEC_SESS_ID` varchar(100) NOT NULL,
  `SCHL_BR_CLASS_SEC_SESS_CLASS` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_SECT` varchar(10) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_SESS` varchar(10) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_BR_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_CREATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_CREATEDAT` datetime DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`SCHL_BR_CLASS_SEC_SESS_ID`),
  KEY `SCHL_BR_CLASS_SEC_SESS_CLASS` (`SCHL_BR_CLASS_SEC_SESS_CLASS`),
  KEY `SCHL_BR_CLASS_SEC_SESS_BR_ID` (`SCHL_BR_CLASS_SEC_SESS_BR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 14. Subjects
CREATE TABLE IF NOT EXISTS `SCHL_BR_CLS_SUBJECT` (
  `BR_CLS_SUB_ID` varchar(100) NOT NULL,
  `BR_CLS_ID` varchar(100) DEFAULT NULL,
  `BR_CLS_SUB_NAME` varchar(100) DEFAULT NULL,
  `BR_CLS_SUB_DESC` varchar(100) DEFAULT NULL,
  `BR_CLS_SUB_LANG` varchar(50) DEFAULT 'English',
  `BR_CLS_SUB_CREATEDBY` varchar(100) DEFAULT NULL,
  `BR_CLS_SUB_CREATEDAT` datetime DEFAULT NULL,
  `BR_CLS_SUB_UPDATEDBY` varchar(100) DEFAULT NULL,
  `BR_CLS_SUB_UPDATEDAT` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`BR_CLS_SUB_ID`),
  KEY `BR_CLS_ID` (`BR_CLS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 15. Schedule / Routine
CREATE TABLE IF NOT EXISTS `SCHL_CLS_SCHLDL` (
  `SCHL_CLS_SCHLDL_ID` varchar(100) NOT NULL,
  `SCHL_CLS_SCHLDL_SEC_SESS_ID` varchar(100) DEFAULT NULL,
  `SCHL_CLS_SCHLDL_SUB_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_RM_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_TCHR_ID` varchar(100) DEFAULT NULL,
  `SCHL_CLS_SCHDL_FRM_DT` date DEFAULT NULL,
  `SCHL_CLS_SCHDL_TO_DT` date DEFAULT NULL,
  `SCHL_DAY_OF_WK` varchar(10) DEFAULT NULL,
  `SCHL_CLS_SCHLDL_CREATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_CLS_SCHLDL_CREATEDAT` datetime DEFAULT NULL,
  `SCHL_CLS_SCHLDL_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_CLS_SCHLDL_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`SCHL_CLS_SCHLDL_ID`),
  KEY `SCHL_CLS_SCHLDL_SEC_SESS_ID` (`SCHL_CLS_SCHLDL_SEC_SESS_ID`),
  KEY `SCHL_CLS_SCHLDL_SUB_ID` (`SCHL_CLS_SCHLDL_SUB_ID`),
  KEY `SCHL_BR_RM_ID` (`SCHL_BR_RM_ID`),
  KEY `SCHL_BR_TCHR_ID` (`SCHL_BR_TCHR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- ============================================================================
-- 4. STAFF & ATTENDANCE
-- ============================================================================

-- 16. Teachers
CREATE TABLE IF NOT EXISTS `SCHL_BR_TCHR` (
  `BR_TCHR_ID` varchar(100) NOT NULL,
  `BR_TCHR_NM` varchar(100) DEFAULT NULL,
  `BR_TCHR_BR_ID` varchar(100) DEFAULT NULL,
  `BR_TCHR_EMAI_ID` varchar(100) DEFAULT NULL,
  `BR_TCHR_CONT_NO1` varchar(15) DEFAULT NULL,
  `BR_TCHR_CONT_NO2` varchar(15) DEFAULT NULL,
  `BR_TCHR_ADD` varchar(300) DEFAULT NULL,
  `BR_TCHR_CITY` varchar(300) DEFAULT NULL,
  `BR_TCHR_STATE` varchar(100) DEFAULT NULL,
  `BR_TCHR_PIN` int(11) DEFAULT NULL,
  `BR_TCHR_COUNTRY` varchar(100) DEFAULT NULL,
  `BR_TCHR_AADHAR` varchar(20) DEFAULT NULL,
  `BR_TCHR_PAN` varchar(20) DEFAULT NULL,
  `BR_TCHR_ASSIGNED_CLASS_ID` varchar(100) DEFAULT NULL,
  `TCHR_STATUS` varchar(20) DEFAULT 'Active',
  `BR_TCHR_CREATEDBY` varchar(100) DEFAULT NULL,
  `BR_TCHR_CREATEDAT` datetime DEFAULT NULL,
  `BR_TCHR_UPDATEDBY` varchar(100) DEFAULT NULL,
  `BR_TCHR_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`BR_TCHR_ID`),
  KEY `BR_TCHR_BR_ID` (`BR_TCHR_BR_ID`),
  KEY `BR_TCHR_ASSIGNED_CLASS_ID` (`BR_TCHR_ASSIGNED_CLASS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 17. Teacher Subjects
CREATE TABLE IF NOT EXISTS `SCHL_TCHR_SUB` (
  `TCHR_SUB_MAP_ID` varchar(100) NOT NULL,
  `TCHR_ID` varchar(100) DEFAULT NULL,
  `TCHR_SUB_ID` varchar(100) DEFAULT NULL,
  `TCHR_SUB_MAP_CREATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_SUB_MAP_CREATEDAT` datetime DEFAULT NULL,
  `TCHR_SUB_MAP_UPDATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_SUB_MAP_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`TCHR_SUB_MAP_ID`),
  KEY `TCHR_ID` (`TCHR_ID`),
  KEY `TCHR_SUB_ID` (`TCHR_SUB_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 18. Teacher Time
CREATE TABLE IF NOT EXISTS `SCHL_TCHR_TIME_DTLS` (
  `TCHR_TIME_ID` varchar(100) NOT NULL,
  `TCHR_ID` varchar(100) DEFAULT NULL,
  `TCHR_IN_TIME` varchar(20) DEFAULT NULL,
  `TCHR_OUT_TIME` varchar(20) DEFAULT NULL,
  `TCHR_REMARKS` varchar(100) DEFAULT NULL,
  `TCHR_TIME_CREATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_TIME_CREATEDAT` datetime DEFAULT NULL,
  `TCHR_TIME_UPDATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_TIME_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`TCHR_TIME_ID`),
  KEY `TCHR_ID` (`TCHR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 19. Teacher Attendance
CREATE TABLE IF NOT EXISTS `SCHL_TCHR_ATT` (
  `TCHR_ATT_ID` varchar(100) NOT NULL,
  `TCHR_ID` varchar(100) DEFAULT NULL,
  `TCHR_ATT_DT` date DEFAULT NULL,
  `TCHR_PRES` varchar(10) DEFAULT 'P',
  `TCHR_DT_COMPUTE` float DEFAULT NULL,
  `TCHR_TOTAL_HRS` varchar(20) DEFAULT NULL,
  `TCHR_REMARKS` varchar(255) DEFAULT NULL,
  `TCHR_ATT_CREATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_ATT_CREATEDAT` datetime DEFAULT NULL,
  `TCHR_ATT_UPDATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_ATT_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`TCHR_ATT_ID`),
  KEY `TCHR_ID` (`TCHR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- ============================================================================
-- 5. STUDENTS & PARENTS
-- ============================================================================

-- 20. Parents / Guardians
CREATE TABLE IF NOT EXISTS `SCHL_MSTR_PRNT` (
  `PRNT_ID` varchar(100) NOT NULL,
  `PRNT_NM` varchar(100) NOT NULL,
  `PRNT_AADHAR` varchar(12) DEFAULT NULL,
  `PRNT_EMAILID` varchar(100) DEFAULT NULL,
  `PRNT_CONTACTNO` varchar(100) DEFAULT NULL,
  `PRNT_RELATION` varchar(50) DEFAULT NULL,
  `PRNT_OCCUPATION` varchar(100) DEFAULT NULL,
  `PRNT_ADDRESS` varchar(300) DEFAULT NULL,
  `PRNT_CITY` varchar(300) DEFAULT NULL,
  `PRNT_STATE` varchar(100) DEFAULT NULL,
  `PRNT_PIN` int(11) DEFAULT NULL,
  `PRNT_COUNTRY` varchar(100) DEFAULT 'India',
  `PRNT_BRANCH_ID` varchar(100) DEFAULT NULL,
  `USER_ID` varchar(100) DEFAULT NULL,
  `PRNT_CREATEDBY` varchar(100) DEFAULT NULL,
  `PRNT_CREATEDAT` datetime DEFAULT NULL,
  `PRNT_UPDATEDBY` varchar(100) DEFAULT NULL,
  `PRNT_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`PRNT_ID`),
  KEY `PRNT_BRANCH_ID` (`PRNT_BRANCH_ID`),
  KEY `USER_ID` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 21. Students
CREATE TABLE IF NOT EXISTS `SCHL_STU` (
  `STU_ID` varchar(100) NOT NULL,
  `STU_NM` varchar(100) NOT NULL,
  `STU_AADHAR` varchar(12) DEFAULT NULL,
  `STU_EMAILID` varchar(100) DEFAULT NULL,
  `STU_CONTACTNO` varchar(100) DEFAULT NULL,
  `STU_ADDRESS` varchar(300) DEFAULT NULL,
  `STU_CITY` varchar(300) DEFAULT NULL,
  `STU_STATE` varchar(100) DEFAULT NULL,
  `STU_PIN` int(11) DEFAULT NULL,
  `STU_COUNTRY` varchar(100) DEFAULT 'India',
  `STU_DOB` date DEFAULT NULL,
  `STU_GENDER` varchar(20) DEFAULT 'M',
  `STU_PRNT_ID` varchar(100) DEFAULT NULL,
  `STU_RELATION_WITH_GUARDIAN` varchar(50) DEFAULT 'Father',
  `STU_BR_CLASS_ID` varchar(100) DEFAULT NULL,
  `USER_ID` varchar(100) DEFAULT NULL,
  `STU_IMG` mediumblob DEFAULT NULL,
  `STU_CREATEDBY` varchar(100) DEFAULT NULL,
  `STU_CREATEDAT` datetime DEFAULT NULL,
  `STU_UPDATEDBY` varchar(100) DEFAULT NULL,
  `STU_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`STU_ID`),
  KEY `STU_PRNT_ID` (`STU_PRNT_ID`),
  KEY `STU_BR_CLASS_ID` (`STU_BR_CLASS_ID`),
  KEY `USER_ID` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 22. Student Attendance
CREATE TABLE IF NOT EXISTS `SCHL_STU_ATT` (
  `STU_ATT_ID` varchar(100) NOT NULL,
  `STU_STU_ID` varchar(100) DEFAULT NULL,
  `STU_CLS_SCHLDL_ID` varchar(100) DEFAULT NULL,
  `STU_ATT_DT` date DEFAULT NULL,
  `STU_PRES` varchar(10) DEFAULT NULL,
  `STU_TCHR_ID` varchar(100) DEFAULT NULL,
  `ATT_REMARKS` varchar(255) DEFAULT NULL,
  `STU_ATT_CREATEDBY` varchar(100) DEFAULT NULL,
  `STU_ATT_CREATEDAT` datetime DEFAULT NULL,
  `STU_ATT_UPDATEDBY` varchar(100) DEFAULT NULL,
  `STU_ATT_UPDATEDAT` datetime DEFAULT NULL,
  PRIMARY KEY (`STU_ATT_ID`),
  KEY `STU_STU_ID` (`STU_STU_ID`),
  KEY `STU_CLS_SCHLDL_ID` (`STU_CLS_SCHLDL_ID`),
  KEY `STU_TCHR_ID` (`STU_TCHR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- ============================================================================
-- 6. NOTIFICATIONS & TICKETS
-- ============================================================================

-- 23. Notification Tickets
CREATE TABLE IF NOT EXISTS `SMS_NOTIFICATION` (
  `SMS_NO_ID` varchar(100) NOT NULL,
  `SMS_NO_CAT` varchar(100) NOT NULL,
  `SMS_NO_DESC` varchar(2000) DEFAULT NULL,
  `SMS_NO_ACTIVE` varchar(10) DEFAULT 'ACTIVE',
  `SMS_NO_USERID` varchar(100) DEFAULT NULL,
  `SMS_NO_CREATEDT` datetime DEFAULT current_timestamp(),
  `SMS_NO_OWNEDBY` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`SMS_NO_ID`),
  KEY `SMS_NO_USERID` (`SMS_NO_USERID`),
  KEY `SMS_NO_OWNEDBY` (`SMS_NO_OWNEDBY`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 24. Notification Details & Comments
CREATE TABLE IF NOT EXISTS `SMS_NO_DTLS` (
  `SMS_NODTLS_ID` varchar(100) NOT NULL,
  `SMS_NODTLS_DESC` varchar(2000) DEFAULT NULL,
  `SMS_NODTLS_IMG` mediumblob DEFAULT NULL,
  `SMS_NOID` varchar(100) DEFAULT NULL,
  `SMS_DTLS_ASSIGN_TO` varchar(100) DEFAULT NULL,
  `SMS_DTLS_UPDTDBY` varchar(100) DEFAULT NULL,
  `SMS_DTLS_UPDT` datetime DEFAULT NULL,
  `SMS_DTLS_CLOSED` varchar(100) DEFAULT NULL,
  `SMS_DTLS_CLOSEDBY` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`SMS_NODTLS_ID`),
  KEY `SMS_NOID` (`SMS_NOID`),
  KEY `SMS_DTLS_ASSIGN_TO` (`SMS_DTLS_ASSIGN_TO`),
  KEY `SMS_DTLS_UPDTDBY` (`SMS_DTLS_UPDTDBY`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- ============================================================================
-- 7. FEES / FINANCE MODULE (ALL 6 TABLES)
-- ============================================================================

-- 25. Branch Class Fee Master
CREATE TABLE IF NOT EXISTS `SMS_BRCH_CLASS_FEE` (
  `SMS_BR_CLS_FEE_ID` varchar(100) NOT NULL,
  `SMS_BR_CLS_ID` varchar(100) DEFAULT NULL,
  `SMS_BR_CLS_STREAM` varchar(50) NOT NULL DEFAULT 'GENERAL',
  `SMS_BR_FEE_TOTAL` decimal(12,2) NOT NULL DEFAULT 0.00,
  `SMS_BR_FEE_YEAR` varchar(20) DEFAULT NULL,
  `SMS_BR_FEE_CREATEDBY` varchar(100) DEFAULT NULL,
  `SMS_BR_FEE_CREATEDAT` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`SMS_BR_CLS_FEE_ID`),
  KEY `IDX_FEE_CLASS_ID` (`SMS_BR_CLS_ID`),
  CONSTRAINT `FK_FEE_CLASS` FOREIGN KEY (`SMS_BR_CLS_ID`) REFERENCES `SCHL_BR_CLASS` (`SCHL_BR_CLS_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 26. Class Fee Breakdown Components (Tuition, Lab, Exam, Transport, Library)
CREATE TABLE IF NOT EXISTS `SMS_BRCH_CLS_FEE_DTLS` (
  `SMS_BRCH_FEE_DTLS_ID` varchar(100) NOT NULL,
  `SMS_BRCH_CLS_FEE_ID` varchar(100) NOT NULL,
  `SMS_FEE_DESC` varchar(150) NOT NULL,
  `SMS_FEE_AMT` decimal(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`SMS_BRCH_FEE_DTLS_ID`),
  KEY `IDX_FEE_HEADER_ID` (`SMS_BRCH_CLS_FEE_ID`),
  CONSTRAINT `FK_FEE_DTLS_HEADER` FOREIGN KEY (`SMS_BRCH_CLS_FEE_ID`) REFERENCES `SMS_BRCH_CLASS_FEE` (`SMS_BR_CLS_FEE_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 27. Student Penalties & Fines (Late fees, library dues, damages)
CREATE TABLE IF NOT EXISTS `SMS_STU_FINE` (
  `SMS_STU_FINE_ID` varchar(100) NOT NULL,
  `SMS_FINE_STU_ID` varchar(100) NOT NULL,
  `SMS_FINE_AMOUNT` decimal(12,2) NOT NULL DEFAULT 0.00,
  `SMS_FINE_PAID` varchar(1) DEFAULT 'N',
  `SMS_FINE_DESC` varchar(255) DEFAULT NULL,
  `SMS_FINE_POSTED` datetime DEFAULT current_timestamp(),
  `SMS_FINE_PAID_DT` datetime DEFAULT NULL,
  PRIMARY KEY (`SMS_STU_FINE_ID`),
  KEY `IDX_FINE_STUDENT_ID` (`SMS_FINE_STU_ID`),
  CONSTRAINT `FK_FINE_STUDENT` FOREIGN KEY (`SMS_FINE_STU_ID`) REFERENCES `SCHL_STU` (`STU_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 28. Student Fee Schedule / Allocation (Monthly dues, discounts, paid full status)
CREATE TABLE IF NOT EXISTS `SMS_STU_FEE_MAP` (
  `SMS_STU_FEE_MAP_ID` varchar(100) NOT NULL,
  `SMS_STU_ID` varchar(100) NOT NULL,
  `SMS_STU_FEE_AMT` decimal(12,2) NOT NULL DEFAULT 0.00,
  `SMS_STU_FEE_MTH` varchar(20) NOT NULL,
  `SMS_STU_DISCOUNT` decimal(12,2) DEFAULT 0.00,
  `SMS_STU_YEAR` varchar(20) DEFAULT NULL,
  `SMS_STU_FEE_PAID_FULL` varchar(1) DEFAULT 'N',
  PRIMARY KEY (`SMS_STU_FEE_MAP_ID`),
  KEY `IDX_FEEMAP_STUDENT_ID` (`SMS_STU_ID`),
  CONSTRAINT `FK_FEEMAP_STUDENT` FOREIGN KEY (`SMS_STU_ID`) REFERENCES `SCHL_STU` (`STU_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 29. Student Fee Payment Transactions & Receipt Images
CREATE TABLE IF NOT EXISTS `SMS_STU_FEE_PAYMENT` (
  `SMS_FEE_PMT_ID` varchar(100) NOT NULL,
  `SMS_STU_ID` varchar(100) NOT NULL,
  `SMS_STU_PMT_DT` datetime DEFAULT current_timestamp(),
  `SMS_STU_PMT_AMT` decimal(12,2) NOT NULL DEFAULT 0.00,
  `SMS_STU_PMT_MTH` varchar(20) DEFAULT NULL,
  `SMS_STU_PAID_FULL` varchar(1) DEFAULT 'Y',
  `SMS_STU_RECEIPT` mediumblob DEFAULT NULL,
  PRIMARY KEY (`SMS_FEE_PMT_ID`),
  KEY `IDX_PMT_STUDENT_ID` (`SMS_STU_ID`),
  CONSTRAINT `FK_PMT_STUDENT` FOREIGN KEY (`SMS_STU_ID`) REFERENCES `SCHL_STU` (`STU_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 30. Branch Fee Collection Summary & Overdue Analytics
CREATE TABLE IF NOT EXISTS `BRCH_FEE_COLLECTED` (
  `BRCH_FEE_COLL_ID` varchar(100) NOT NULL,
  `BRCH_ID` varchar(100) NOT NULL,
  `BRCH_CLASS_ID` varchar(100) NOT NULL,
  `BRCH_FEE_AMT` decimal(15,2) NOT NULL DEFAULT 0.00,
  `BRCH_FEE_MTH` varchar(20) DEFAULT NULL,
  `BRCH_FEE_YR` varchar(20) DEFAULT NULL,
  `BRCH_FEE_DELAY` int(11) DEFAULT 0,
  PRIMARY KEY (`BRCH_FEE_COLL_ID`),
  KEY `IDX_COLL_BRANCH_ID` (`BRCH_ID`),
  KEY `IDX_COLL_CLASS_ID` (`BRCH_CLASS_ID`),
  CONSTRAINT `FK_COLL_BRANCH` FOREIGN KEY (`BRCH_ID`) REFERENCES `SCHL_BRANCH` (`SCHL_BR_ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_COLL_CLASS` FOREIGN KEY (`BRCH_CLASS_ID`) REFERENCES `SCHL_BR_CLASS` (`SCHL_BR_CLS_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

SET FOREIGN_KEY_CHECKS = 1;
