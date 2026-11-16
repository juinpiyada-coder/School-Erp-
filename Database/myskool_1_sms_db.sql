-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 69.57.172.207:3306
-- Generation Time: Nov 13, 2026 at 04:10 PM
-- Server version: 11.4.13-MariaDB-ubu2404
-- PHP Version: 8.1.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `myskool_1_sms_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `MSTR_SCHOOL_MAIN`
--

CREATE TABLE `MSTR_SCHOOL_MAIN` (
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
  `SCHL_MN_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_BRANCH`
--

CREATE TABLE `SCHL_BRANCH` (
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
  `SCHL_BR_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_BRCH_MATRIX`
--

CREATE TABLE `SCHL_BRCH_MATRIX` (
  `SCHL_MAT_ID` varchar(100) NOT NULL,
  `SCHL_UNIQ_MATRIX_NM` varchar(100) NOT NULL,
  `SCHL_MAT_NM` varchar(100) DEFAULT NULL,
  `SCHL_NO_OF_CLASS` int(11) NOT NULL,
  `SCHL_CLASS_DURATION` int(11) NOT NULL,
  `SCHL_CLASS_FRM` varchar(100) DEFAULT NULL,
  `SCHL_CLASS_TO` varchar(100) DEFAULT NULL,
  `SCHL_WEEKOFDAY` varchar(100) DEFAULT NULL,
  `SCHL_MAT_SCHOOL_ID` varchar(100) DEFAULT NULL,
  `SCHL_MAT_BRANCH_ID` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_BR_CLASS`
--

CREATE TABLE `SCHL_BR_CLASS` (
  `SCHL_BR_CLS_ID` varchar(100) NOT NULL,
  `SCHL_BR_CENT_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_NM` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_LANG` varchar(50) DEFAULT 'English',
  `SCHL_BR_BRD` varchar(50) DEFAULT 'CBSE',
  `SCHL_BR_MAT` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLS_CREATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLS_CREATEDAT` datetime DEFAULT NULL,
  `SCHL_BR_CLS_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLS_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_BR_CLASS_SEC_SESSION`
--

CREATE TABLE `SCHL_BR_CLASS_SEC_SESSION` (
  `SCHL_BR_CLASS_SEC_SESS_ID` varchar(100) NOT NULL,
  `SCHL_BR_CLASS_SEC_SESS_CLASS` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_SECT` varchar(10) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_SESS` varchar(10) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_BR_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_CREATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_CREATEDAT` datetime DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_CLASS_SEC_SESS_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_BR_CLS_SUBJECT`
--

CREATE TABLE `SCHL_BR_CLS_SUBJECT` (
  `BR_CLS_SUB_ID` varchar(100) NOT NULL,
  `BR_CLS_ID` varchar(100) DEFAULT NULL,
  `BR_CLS_SUB_NAME` varchar(100) DEFAULT NULL,
  `BR_CLS_SUB_LANG` varchar(50) DEFAULT 'English',
  `BR_CLS_SUB_DESC` varchar(100) DEFAULT NULL,
  `BR_CLS_SUB_CREATEDBY` varchar(100) DEFAULT NULL,
  `BR_CLS_SUB_CREATEDAT` datetime DEFAULT NULL,
  `BR_CLS_SUB_UPDATEDBY` varchar(100) DEFAULT NULL,
  `BR_CLS_SUB_UPDATEDAT` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_BR_ROOM`
--

CREATE TABLE `SCHL_BR_ROOM` (
  `SCHL_BR_RM_ID` varchar(100) NOT NULL,
  `SCHL_BR_REF_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_BUILDING` varchar(100) DEFAULT 'Main Building',
  `SCHL_BR_ROOM_CAT` varchar(50) DEFAULT 'Classroom',
  `SCHL_BR_ROOM_DESC` varchar(100) DEFAULT NULL,
  `SCHL_BR_ROOM_CAPACITY` int(11) DEFAULT NULL,
  `SCHL_BR_FACILITY` varchar(100) DEFAULT NULL,
  `SCHL_BR_ISLAB` varchar(10) DEFAULT NULL,
  `SCHL_BR_FLR` varchar(50) DEFAULT NULL,
  `SCHL_BR_RM_CREATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_RM_CREATEDAT` datetime DEFAULT NULL,
  `SCHL_BR_RM_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_BR_RM_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_BR_TCHR`
--

CREATE TABLE `SCHL_BR_TCHR` (
  `BR_TCHR_ID` varchar(100) NOT NULL,
  `BR_TCHR_NM` varchar(100) DEFAULT NULL,
  `BR_TCHR_BR_ID` varchar(100) DEFAULT NULL,
  `BR_TCHR_EMAI_ID` varchar(100) DEFAULT NULL,
  `BR_TCHR_AADHAR` varchar(12) DEFAULT '',
  `BR_TCHR_PAN` varchar(10) DEFAULT '',
  `BR_TCHR_ASSIGNED_CLASS_ID` varchar(100) DEFAULT NULL,
  `BR_TCHR_CONT_NO1` varchar(15) DEFAULT NULL,
  `BR_TCHR_CONT_NO2` varchar(15) DEFAULT NULL,
  `BR_TCHR_ADD` varchar(300) DEFAULT NULL,
  `BR_TCHR_CITY` varchar(300) DEFAULT NULL,
  `BR_TCHR_STATE` varchar(100) DEFAULT NULL,
  `BR_TCHR_PIN` int(11) DEFAULT NULL,
  `BR_TCHR_COUNTRY` varchar(100) DEFAULT NULL,
  `TCHR_STATUS` varchar(50) DEFAULT 'Active',
  `BR_TCHR_CREATEDBY` varchar(100) DEFAULT NULL,
  `BR_TCHR_CREATEDAT` datetime DEFAULT NULL,
  `BR_TCHR_UPDATEDBY` varchar(100) DEFAULT NULL,
  `BR_TCHR_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_CLS_SCHLDL`
--

CREATE TABLE `SCHL_CLS_SCHLDL` (
  `SCHL_CLS_SCHLDL_ID` varchar(100) NOT NULL,
  `SCHL_CLS_SCHLDL_SEC_SESS_ID` varchar(100) DEFAULT NULL,
  `SCHL_CLS_SCHLDL_SUB_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_RM_ID` varchar(100) DEFAULT NULL,
  `SCHL_BR_TCHR_ID` varchar(100) DEFAULT NULL,
  `SCHL_CLS_SCHDL_FRM_DT` varchar(100) DEFAULT NULL,
  `SCHL_CLS_SCHDL_TO_DT` varchar(100) DEFAULT NULL,
  `SCHL_DAY_OF_WK` varchar(50) DEFAULT NULL,
  `SCHL_CLS_SCHLDL_CREATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_CLS_SCHLDL_CREATEDAT` datetime DEFAULT NULL,
  `SCHL_CLS_SCHLDL_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SCHL_CLS_SCHLDL_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_MSTR_PRNT`
--

CREATE TABLE `SCHL_MSTR_PRNT` (
  `PRNT_ID` varchar(100) NOT NULL,
  `PRNT_NM` varchar(100) NOT NULL,
  `PRNT_AADHAR` varchar(12) DEFAULT '',
  `PRNT_RELATION` varchar(50) DEFAULT 'Father',
  `PRNT_EMAILID` varchar(100) DEFAULT '',
  `PRNT_CONTACTNO` varchar(100) NOT NULL,
  `PRNT_ADDRESS` varchar(300) DEFAULT '',
  `PRNT_CITY` varchar(300) DEFAULT '',
  `PRNT_STATE` varchar(100) DEFAULT '',
  `PRNT_PIN` int(11) DEFAULT 0,
  `PRNT_COUNTRY` varchar(100) DEFAULT '',
  `PRNT_BRANCH_ID` varchar(100) DEFAULT NULL,
  `PRNT_CREATEDBY` varchar(100) DEFAULT NULL,
  `PRNT_CREATEDAT` datetime DEFAULT NULL,
  `PRNT_UPDATEDBY` varchar(100) DEFAULT NULL,
  `PRNT_UPDATEDAT` datetime DEFAULT NULL,
  `USER_ID` varchar(100) DEFAULT NULL,
  `PRNT_OCCUPATION` varchar(150) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_ROOM_CATEGORY`
--

CREATE TABLE `SCHL_ROOM_CATEGORY` (
  `CAT_ID` varchar(100) NOT NULL,
  `CAT_NAME` varchar(100) NOT NULL,
  `CAT_BRANCH_ID` varchar(100) DEFAULT NULL,
  `CAT_CREATEDBY` varchar(100) DEFAULT NULL,
  `CAT_CREATEDAT` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_STU`
--

CREATE TABLE `SCHL_STU` (
  `STU_ID` varchar(100) NOT NULL,
  `STU_NM` varchar(100) NOT NULL,
  `STU_AADHAR` varchar(12) DEFAULT '',
  `STU_EMAILID` varchar(100) DEFAULT '',
  `STU_CONTACTNO` varchar(100) DEFAULT '',
  `STU_ADDRESS` varchar(300) DEFAULT '',
  `STU_CITY` varchar(300) DEFAULT '',
  `STU_STATE` varchar(100) DEFAULT '',
  `STU_PIN` int(11) DEFAULT 0,
  `STU_COUNTRY` varchar(100) DEFAULT '',
  `STU_DOB` date NOT NULL,
  `STU_GENDER` varchar(10) DEFAULT 'M',
  `STU_PRNT_ID` varchar(100) DEFAULT NULL,
  `STU_RELATION_WITH_GUARDIAN` varchar(50) DEFAULT 'Father',
  `STU_BR_CLASS_ID` varchar(100) DEFAULT NULL,
  `STU_CREATEDBY` varchar(100) DEFAULT NULL,
  `STU_CREATEDAT` datetime DEFAULT NULL,
  `STU_UPDATEDBY` varchar(100) DEFAULT NULL,
  `STU_UPDATEDAT` datetime DEFAULT NULL,
  `USER_ID` varchar(100) DEFAULT NULL,
  `STU_IMG` mediumblob DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_STU_ATT`
--

CREATE TABLE `SCHL_STU_ATT` (
  `STU_ATT_ID` varchar(100) NOT NULL,
  `STU_STU_ID` varchar(100) DEFAULT NULL,
  `STU_CLS_SCHLDL_ID` varchar(100) DEFAULT NULL,
  `STU_ATT_DT` varchar(50) DEFAULT NULL,
  `STU_PRES` varchar(50) DEFAULT NULL,
  `STU_TCHR_ID` varchar(100) DEFAULT NULL,
  `STU_ATT_CREATEDBY` varchar(100) DEFAULT NULL,
  `STU_ATT_CREATEDAT` datetime DEFAULT NULL,
  `STU_ATT_UPDATEDBY` varchar(100) DEFAULT NULL,
  `STU_ATT_UPDATEDAT` datetime DEFAULT NULL,
  `ATT_REMARKS` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_TCHR_ATT`
--

CREATE TABLE `SCHL_TCHR_ATT` (
  `TCHR_ATT_ID` varchar(100) NOT NULL,
  `TCHR_ID` varchar(100) DEFAULT NULL,
  `TCHR_ATT_DT` date DEFAULT NULL,
  `TCHR_PRES` varchar(20) DEFAULT 'Present',
  `TCHR_REMARKS` varchar(255) DEFAULT NULL,
  `TCHR_DT_COMPUTE` float DEFAULT NULL,
  `TCHR_ATT_CREATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_ATT_CREATEDAT` datetime DEFAULT NULL,
  `TCHR_ATT_UPDATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_ATT_UPDATEDAT` datetime DEFAULT NULL,
  `TCHR_TOTAL_HRS` float DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_TCHR_SUB`
--

CREATE TABLE `SCHL_TCHR_SUB` (
  `TCHR_SUB_MAP_ID` varchar(100) NOT NULL,
  `TCHR_ID` varchar(100) DEFAULT NULL,
  `TCHR_SUB_ID` varchar(100) DEFAULT NULL,
  `TCHR_SUB_MAP_CREATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_SUB_MAP_CREATEDAT` datetime DEFAULT NULL,
  `TCHR_SUB_MAP_UPDATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_SUB_MAP_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_TCHR_TIME_DTLS`
--

CREATE TABLE `SCHL_TCHR_TIME_DTLS` (
  `TCHR_TIME_ID` varchar(100) NOT NULL,
  `TCHR_ID` varchar(100) DEFAULT NULL,
  `TCHR_IN_TIME` datetime DEFAULT NULL,
  `TCHR_OUT_TIME` datetime DEFAULT NULL,
  `TCHR_REMARKS` varchar(100) DEFAULT NULL,
  `TCHR_TIME_CREATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_TIME_CREATEDAT` datetime DEFAULT NULL,
  `TCHR_TIME_UPDATEDBY` varchar(100) DEFAULT NULL,
  `TCHR_TIME_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SCHL_WHITELABEL`
--

CREATE TABLE `SCHL_WHITELABEL` (
  `WL_ID` varchar(100) NOT NULL,
  `WL_BMN_ID` varchar(100) DEFAULT NULL,
  `WL_BRN_ID` varchar(100) DEFAULT NULL,
  `WL_DESC` longtext DEFAULT NULL,
  `WL_IMG` mediumblob DEFAULT NULL,
  `WL_BANNER` mediumblob DEFAULT NULL,
  `WL_CREATEDBY` varchar(100) DEFAULT NULL,
  `WL_CREATEDAT` datetime DEFAULT NULL,
  `WL_UPDATEDBY` varchar(100) DEFAULT NULL,
  `WL_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SMS_NOTIFICATION`
--

CREATE TABLE `SMS_NOTIFICATION` (
  `SMS_NO_ID` varchar(100) NOT NULL,
  `SMS_NO_CAT` varchar(100) NOT NULL,
  `SMS_NO_DESC` varchar(2000) DEFAULT NULL,
  `SMS_NO_ACTIVE` varchar(10) DEFAULT NULL,
  `SMS_NO_USERID` varchar(100) DEFAULT NULL,
  `SMS_NO_CREATEDT` datetime DEFAULT NULL,
  `SMS_NO_OWNEDBY` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SMS_NO_DTLS`
--

CREATE TABLE `SMS_NO_DTLS` (
  `SMS_NODTLS_ID` varchar(100) NOT NULL,
  `SMS_NODTLS_DESC` varchar(2000) DEFAULT NULL,
  `SMS_NODTLS_IMG` longblob DEFAULT NULL,
  `SMS_NOID` varchar(100) DEFAULT NULL,
  `SMS_DTLS_ASSIGN_TO` varchar(100) DEFAULT NULL,
  `SMS_DTLS_UPDTDBY` varchar(100) DEFAULT NULL,
  `SMS_DTLS_UPDT` datetime DEFAULT NULL,
  `SMS_DTLS_CLOSED` varchar(100) DEFAULT NULL,
  `SMS_DTLS_CLOSEDBY` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SM_BOARD`
--

CREATE TABLE `SM_BOARD` (
  `BRD_ID` varchar(100) NOT NULL,
  `BRD_DESC` varchar(100) NOT NULL,
  `BRD_STATE` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `SM_BOARD`
--

INSERT INTO `SM_BOARD` (`BRD_ID`, `BRD_DESC`, `BRD_STATE`) VALUES
('BRD_CBSE', 'Central Board of Secondary Education (CBSE)', 'All India'),
('BRD_ICSE', 'Indian Certificate of Secondary Education (ICSE / CISCE)', 'All India'),
('BRD_WBBSE', 'West Bengal Board of Secondary Education (WBBSE)', 'West Bengal'),
('BRD_WBCHSE', 'West Bengal Council of Higher Secondary Education (WBCHSE)', 'West Bengal');

-- --------------------------------------------------------

--
-- Table structure for table `SM_MAS_ROLE`
--

CREATE TABLE `SM_MAS_ROLE` (
  `MAS_ROLE_ID` varchar(100) NOT NULL,
  `MAS_ROLE_DESC` varchar(100) DEFAULT NULL,
  `MAS_ROLE_LINK` varchar(200) DEFAULT NULL,
  `MAS_ROLE_CREATEDBY` varchar(100) DEFAULT NULL,
  `MAS_ROLE_CREATEDAT` datetime DEFAULT NULL,
  `MAS_ROLE_UPDATEDBY` varchar(100) DEFAULT NULL,
  `MAS_ROLE_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `SM_MAS_ROLE`
--

INSERT INTO `SM_MAS_ROLE` (`MAS_ROLE_ID`, `MAS_ROLE_DESC`, `MAS_ROLE_LINK`, `MAS_ROLE_CREATEDBY`, `MAS_ROLE_CREATEDAT`, `MAS_ROLE_UPDATEDBY`, `MAS_ROLE_UPDATEDAT`) VALUES
('housekeeper', 'housekepping stuff', '/', NULL, NULL, NULL, NULL),
('maid', 'for clening cantin cooking', '', NULL, NULL, NULL, NULL),
('R_BRANCHADMIN', 'Branch Admin', '/', NULL, NULL, NULL, NULL),
('R_BRANCHEXECUTIVE', 'Branch Executive', '/', NULL, NULL, NULL, NULL),
('R_BRANCHOFFICIAL', 'Branch Official', '/', NULL, NULL, NULL, NULL),
('R_PARENT', 'Parent / Guardian', '/', NULL, NULL, NULL, NULL),
('R_SCHOOLADMIN', 'School Admin', '/', NULL, NULL, NULL, NULL),
('R_SCHOOLEXECUTIVE', 'School Executive', '/', NULL, NULL, NULL, NULL),
('R_STUDENT', 'Student', '/', NULL, NULL, NULL, NULL),
('R_SUPERADMIN', 'Super Admin', '/', NULL, NULL, NULL, NULL),
('R_TEACHER', 'Teacher', '/', NULL, NULL, NULL, NULL),
('Teacher', 'geography', '', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `SM_ROLE_LINKS`
--

CREATE TABLE `SM_ROLE_LINKS` (
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
  `SM_RL_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `SM_ROLE_LINKS`
--

INSERT INTO `SM_ROLE_LINKS` (`SM_RL_ID`, `SM_RL_ROLE_ID`, `SM_RL_LINK_DESC`, `SM_RL_LINK_URL`, `SM_RL_LINK_SRL`, `SM_RL_SUBMENU`, `SM_RL_STATUS`, `SM_RL_CREATEDBY`, `SM_RL_CREATEDAT`, `SM_RL_UPDATEDBY`, `SM_RL_UPDATEDAT`) VALUES
('RL_BR_01', 'R_BRANCHADMIN', 'Dashboard', '/', 1, 'Overview', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_02', 'R_BRANCHADMIN', 'Branch User Logins & Reset', '/user/logins', 2, 'Branch Users & Roles', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_03', 'R_BRANCHADMIN', 'Rooms', '/school/rooms', 3, 'Facilities', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_04', 'R_BRANCHADMIN', 'Classes', '/school/classes', 4, 'Academics & Curriculum', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_05', 'R_BRANCHADMIN', 'Schedule Matrix', '/school/matrix', 5, 'Academics & Curriculum', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_06', 'R_BRANCHADMIN', 'Session & Section', '/school/sessions', 6, 'Academics & Curriculum', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_07', 'R_BRANCHADMIN', 'Subjects', '/school/subjects', 7, 'Academics & Curriculum', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', 'usr_super', '2026-10-17 06:08:56'),
('RL_BR_08', 'R_BRANCHADMIN', 'Teachers', '/teacher/teachers', 8, 'Faculty & Mapping', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_09', 'R_BRANCHADMIN', 'Teacher Subject Mapping', '/teacher/mapping', 9, 'Faculty & Mapping', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_10', 'R_BRANCHADMIN', 'Parents', '/parent/parents', 10, 'Parents', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_11', 'R_BRANCHADMIN', 'Students', '/student/students', 11, 'Students', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_12', 'R_BRANCHADMIN', 'Student Attendance', '/academic/student-attendance', 12, 'Students', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_13', 'R_BRANCHADMIN', 'Class Schedule', '/academic/schedule', 13, 'Schedule & Attendance', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_14', 'R_BRANCHADMIN', 'Teacher Attendance', '/academic/teacher-attendance', 14, 'Schedule & Attendance', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_15', 'R_BRANCHADMIN', 'Branch Financial Reports', '/reports', 15, 'Performance & Settings', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_BR_16', 'R_BRANCHADMIN', 'Branch Color Scheme', '/settings', 16, 'Performance & Settings', 'ACTIVE', 'usr_branch', '2026-10-12 11:38:42', NULL, NULL),
('RL_PRNT_01', 'R_PARENT', 'View His Children Daily Routine', '/parent/routine', 1, 'Parent Modules', 'ACTIVE', 'usr_super', '2026-10-12 11:38:58', NULL, NULL),
('RL_PRNT_02', 'R_PARENT', 'View Subject Wise Class Completion', '/parent/class-completion', 2, 'Parent Modules', 'ACTIVE', 'usr_super', '2026-10-12 11:38:58', NULL, NULL),
('RL_PRNT_03', 'R_PARENT', 'View Attendance Per Subject', '/parent/attendance-report', 3, 'Parent Modules', 'ACTIVE', 'usr_super', '2026-10-12 11:38:58', NULL, NULL),
('RL_PRNT_04', 'R_PARENT', 'View Fees Due/Paid Report', '/parent/fees-report', 4, 'Parent Modules', 'ACTIVE', 'usr_super', '2026-10-12 11:38:58', NULL, NULL),
('RL_SA_01', 'R_SUPERADMIN', 'Dashboard', '/', 1, 'Overview', 'ACTIVE', 'usr_super', '2026-10-12 11:38:42', NULL, NULL),
('RL_SA_02', 'R_SUPERADMIN', 'Roles', '/user/roles', 2, 'User & Access', 'ACTIVE', 'usr_super', '2026-10-12 11:38:42', NULL, NULL),
('RL_SA_03', 'R_SUPERADMIN', 'Role Links', '/user/role-links', 3, 'User & Access', 'ACTIVE', 'usr_super', '2026-10-12 11:38:42', NULL, NULL),
('RL_SA_04', 'R_SUPERADMIN', 'User Login', '/user/logins', 4, 'User & Access', 'ACTIVE', 'usr_super', '2026-10-12 11:38:42', NULL, NULL),
('RL_SA_05', 'R_SUPERADMIN', 'School Details', '/school/details', 5, 'Institution', 'ACTIVE', 'usr_super', '2026-10-12 11:38:42', NULL, NULL),
('RL_SA_06', 'R_SUPERADMIN', 'Schedule Matrix', '/school/matrix', 6, 'Academic', 'ACTIVE', 'usr_super', '2026-10-12 11:38:42', NULL, NULL),
('RL_SA_07', 'R_SUPERADMIN', 'Reports', '/reports', 7, 'System & Reports', 'ACTIVE', 'usr_super', '2026-10-12 11:38:42', NULL, NULL),
('RL_SA_08', 'R_SUPERADMIN', 'Settings', '/settings', 8, 'System & Reports', 'ACTIVE', 'usr_super', '2026-10-12 11:38:42', NULL, NULL),
('RL_SA_09', 'R_SUPERADMIN', 'Notifications', '/notifications', 9, 'System & Reports', 'ACTIVE', 'usr_super', '2026-10-12 11:38:42', NULL, NULL),
('RL_SCH_01', 'R_SCHOOLADMIN', 'Dashboard', '/', 1, 'Overview', 'ACTIVE', 'usr_school', '2026-10-12 11:38:42', NULL, NULL),
('RL_SCH_02', 'R_SCHOOLADMIN', 'Roles', '/user/roles', 2, 'User & Roles', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:09'),
('RL_SCH_03', 'R_SCHOOLADMIN', 'User Logins', '/user/logins', 3, 'User & Roles', 'ACTIVE', 'usr_school', '2026-10-12 11:38:42', NULL, NULL),
('RL_SCH_04', 'R_SCHOOLADMIN', 'School Details', '/school/details', 4, 'Branches & Boards', 'ACTIVE', 'usr_school', '2026-10-12 11:38:42', NULL, NULL),
('RL_SCH_05', 'R_SCHOOLADMIN', 'Associate Branches', '/school/branches', 5, 'Branches & Boards', 'ACTIVE', 'usr_school', '2026-10-12 11:38:42', NULL, NULL),
('RL_SCH_06', 'R_SCHOOLADMIN', 'Rooms', '/school/rooms', 6, 'Branches & Boards', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:13'),
('RL_SCH_07', 'R_SCHOOLADMIN', 'Classes', '/school/classes', 7, 'Academic', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:14'),
('RL_SCH_08', 'R_SCHOOLADMIN', 'Schedule Matrix', '/school/matrix', 8, 'Academic', 'ACTIVE', 'usr_school', '2026-10-12 11:38:42', NULL, NULL),
('RL_SCH_09', 'R_SCHOOLADMIN', 'Session & Section', '/school/sessions', 9, 'Academic', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:16'),
('RL_SCH_10', 'R_SCHOOLADMIN', 'Subjects', '/school/subjects', 10, 'Academic', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:17'),
('RL_SCH_11', 'R_SCHOOLADMIN', 'Teachers', '/teacher/teachers', 11, 'Teachers', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:21'),
('RL_SCH_12', 'R_SCHOOLADMIN', 'Teacher Subject Mapping', '/teacher/mapping', 12, 'Teachers', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:22'),
('RL_SCH_13', 'R_SCHOOLADMIN', 'Parents', '/parent/parents', 13, 'Parents', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:28'),
('RL_SCH_14', 'R_SCHOOLADMIN', 'Students', '/student/students', 14, 'Students', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:29'),
('RL_SCH_15', 'R_SCHOOLADMIN', 'Student Attendance', '/academic/student-attendance', 15, 'Students', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:30'),
('RL_SCH_16', 'R_SCHOOLADMIN', 'Class Schedule', '/academic/schedule', 16, 'Schedule & Attendance', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:31'),
('RL_SCH_17', 'R_SCHOOLADMIN', 'Teacher Attendance', '/academic/teacher-attendance', 17, 'Schedule & Attendance', 'INACTIVE', 'usr_school', '2026-10-12 11:38:42', NULL, NULL),
('RL_SCH_18', 'R_SCHOOLADMIN', 'Financials & Reports', '/reports', 18, 'System & Reports', 'ACTIVE', 'usr_school', '2026-10-12 11:38:42', 'usr_super', '2026-10-12 16:40:47'),
('RL_SCH_19', 'R_SCHOOLADMIN', 'School White Label', '/settings', 19, 'System & Reports', 'ACTIVE', 'usr_school', '2026-10-12 11:38:42', NULL, NULL),
('RL_STU_01', 'R_STUDENT', 'View Daily Routine', '/student/routine', 1, 'Student Modules', 'ACTIVE', 'usr_super', '2026-10-12 11:38:58', NULL, NULL),
('RL_STU_02', 'R_STUDENT', 'View Subject Wise Class Completion', '/student/class-completion', 2, 'Student Modules', 'ACTIVE', 'usr_super', '2026-10-12 11:38:58', NULL, NULL),
('RL_STU_03', 'R_STUDENT', 'View His Own Attendance Per Subject', '/student/attendance-report', 3, 'Student Modules', 'ACTIVE', 'usr_super', '2026-10-12 11:38:58', NULL, NULL),
('RL_STU_04', 'R_STUDENT', 'View Fees Due/Paid Report', '/student/fees-report', 4, 'Student Modules', 'INACTIVE', 'usr_super', '2026-10-12 11:38:58', 'usr_super', '2026-11-04 01:55:18'),
('RL_TCH_01', 'R_TEACHER', 'Dashboard', '/', 1, 'Overview', 'ACTIVE', 'usr_teacher', '2026-10-12 11:38:42', NULL, NULL),
('RL_TCH_02', 'R_TEACHER', 'View Routine & Schedule', '/academic/schedule', 2, 'Academics & Routine', 'ACTIVE', 'usr_teacher', '2026-10-12 11:38:42', NULL, NULL),
('RL_TCH_03', 'R_TEACHER', 'My Classes', '/school/classes', 3, 'Academics & Routine', 'ACTIVE', 'usr_teacher', '2026-10-12 11:38:42', NULL, NULL),
('RL_TCH_04', 'R_TEACHER', 'My Attendance & Leave', '/academic/teacher-attendance', 4, 'Attendance & Leaves', 'ACTIVE', 'usr_teacher', '2026-10-12 11:38:42', NULL, NULL),
('RL_TCH_05', 'R_TEACHER', 'My Students', '/student/students', 5, 'Student Management', 'ACTIVE', 'usr_teacher', '2026-10-12 11:38:42', NULL, NULL),
('RL_TCH_06', 'R_TEACHER', 'Mark Student Attendance', '/academic/student-attendance', 6, 'Student Management', 'ACTIVE', 'usr_teacher', '2026-10-12 11:38:42', NULL, NULL),
('RL_TCH_07', 'R_TEACHER', 'Profile', '/settings', 7, 'Account', 'ACTIVE', 'usr_teacher', '2026-10-12 11:38:42', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `SM_SETTING`
--

CREATE TABLE `SM_SETTING` (
  `SET_ID` varchar(100) NOT NULL,
  `SET_USER_ID` varchar(100) DEFAULT NULL,
  `SET_TYPE` varchar(100) DEFAULT NULL,
  `SET_VAL` varchar(100) DEFAULT NULL,
  `SET_CREATEDBY` varchar(100) DEFAULT NULL,
  `SET_CREATEDAT` datetime DEFAULT NULL,
  `SET_UPDATEDBY` varchar(100) DEFAULT NULL,
  `SET_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SM_USER_LOGIN`
--

CREATE TABLE `SM_USER_LOGIN` (
  `USER_ID` varchar(100) NOT NULL,
  `USER_EMAIL_ID` varchar(100) DEFAULT NULL,
  `USER_FIRST_NAME` varchar(100) DEFAULT NULL,
  `USER_LAST_NAME` varchar(100) DEFAULT NULL,
  `USER_PASSWD` varchar(255) DEFAULT NULL,
  `USER_CR_DT` date DEFAULT NULL,
  `USER_ROLE` varchar(500) DEFAULT NULL,
  `USER_SCHOOL_ID` varchar(100) DEFAULT NULL,
  `USER_BRANCH_ID` varchar(100) DEFAULT NULL,
  `USER_IMG` mediumblob DEFAULT NULL,
  `USER_CREATEDBY` varchar(100) DEFAULT NULL,
  `USER_CREATEDAT` datetime DEFAULT NULL,
  `USER_UPDATEDBY` varchar(100) DEFAULT NULL,
  `USER_UPDATEDAT` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `MSTR_SCHOOL_MAIN`
--
ALTER TABLE `MSTR_SCHOOL_MAIN`
  ADD PRIMARY KEY (`SCHL_MN_ID`),
  ADD KEY `SCHL_MN_CREATEDBY` (`SCHL_MN_CREATEDBY`),
  ADD KEY `SCHL_MN_UPDATEDBY` (`SCHL_MN_UPDATEDBY`),
  ADD KEY `SCHL_BRD_ID` (`SCHL_BRD_ID`);

--
-- Indexes for table `SCHL_BRANCH`
--
ALTER TABLE `SCHL_BRANCH`
  ADD PRIMARY KEY (`SCHL_BR_ID`),
  ADD KEY `SCHL_BR_CENTER_ID` (`SCHL_BR_CENTER_ID`),
  ADD KEY `SCHL_BR_CREATEDBY` (`SCHL_BR_CREATEDBY`),
  ADD KEY `SCHL_BR_UPDATEDBY` (`SCHL_BR_UPDATEDBY`);

--
-- Indexes for table `SCHL_BRCH_MATRIX`
--
ALTER TABLE `SCHL_BRCH_MATRIX`
  ADD PRIMARY KEY (`SCHL_MAT_ID`);

--
-- Indexes for table `SCHL_BR_CLASS`
--
ALTER TABLE `SCHL_BR_CLASS`
  ADD PRIMARY KEY (`SCHL_BR_CLS_ID`),
  ADD KEY `SCHL_BR_CENT_ID` (`SCHL_BR_CENT_ID`),
  ADD KEY `SCHL_BR_MAT` (`SCHL_BR_MAT`),
  ADD KEY `SCHL_BR_CLS_CREATEDBY` (`SCHL_BR_CLS_CREATEDBY`),
  ADD KEY `SCHL_BR_CLS_UPDATEDBY` (`SCHL_BR_CLS_UPDATEDBY`);

--
-- Indexes for table `SCHL_BR_CLASS_SEC_SESSION`
--
ALTER TABLE `SCHL_BR_CLASS_SEC_SESSION`
  ADD PRIMARY KEY (`SCHL_BR_CLASS_SEC_SESS_ID`),
  ADD KEY `SCHL_BR_CLASS_SEC_SESS_CLASS` (`SCHL_BR_CLASS_SEC_SESS_CLASS`),
  ADD KEY `SCHL_BR_CLASS_SEC_SESS_BR_ID` (`SCHL_BR_CLASS_SEC_SESS_BR_ID`),
  ADD KEY `SCHL_BR_CLASS_SEC_SESS_CREATEDBY` (`SCHL_BR_CLASS_SEC_SESS_CREATEDBY`),
  ADD KEY `SCHL_BR_CLASS_SEC_SESS_UPDATEDBY` (`SCHL_BR_CLASS_SEC_SESS_UPDATEDBY`);

--
-- Indexes for table `SCHL_BR_CLS_SUBJECT`
--
ALTER TABLE `SCHL_BR_CLS_SUBJECT`
  ADD PRIMARY KEY (`BR_CLS_SUB_ID`),
  ADD KEY `BR_CLS_ID` (`BR_CLS_ID`);

--
-- Indexes for table `SCHL_BR_ROOM`
--
ALTER TABLE `SCHL_BR_ROOM`
  ADD PRIMARY KEY (`SCHL_BR_RM_ID`),
  ADD KEY `SCHL_BR_REF_ID` (`SCHL_BR_REF_ID`),
  ADD KEY `SCHL_BR_RM_CREATEDBY` (`SCHL_BR_RM_CREATEDBY`),
  ADD KEY `SCHL_BR_RM_UPDATEDBY` (`SCHL_BR_RM_UPDATEDBY`);

--
-- Indexes for table `SCHL_BR_TCHR`
--
ALTER TABLE `SCHL_BR_TCHR`
  ADD PRIMARY KEY (`BR_TCHR_ID`),
  ADD KEY `BR_TCHR_BR_ID` (`BR_TCHR_BR_ID`),
  ADD KEY `BR_TCHR_CREATEDBY` (`BR_TCHR_CREATEDBY`),
  ADD KEY `BR_TCHR_UPDATEDBY` (`BR_TCHR_UPDATEDBY`);

--
-- Indexes for table `SCHL_CLS_SCHLDL`
--
ALTER TABLE `SCHL_CLS_SCHLDL`
  ADD PRIMARY KEY (`SCHL_CLS_SCHLDL_ID`),
  ADD KEY `SCHL_CLS_SCHLDL_SEC_SESS_ID` (`SCHL_CLS_SCHLDL_SEC_SESS_ID`),
  ADD KEY `SCHL_CLS_SCHLDL_SUB_ID` (`SCHL_CLS_SCHLDL_SUB_ID`),
  ADD KEY `SCHL_BR_RM_ID` (`SCHL_BR_RM_ID`),
  ADD KEY `SCHL_BR_TCHR_ID` (`SCHL_BR_TCHR_ID`),
  ADD KEY `SCHL_CLS_SCHLDL_CREATEDBY` (`SCHL_CLS_SCHLDL_CREATEDBY`),
  ADD KEY `SCHL_CLS_SCHLDL_UPDATEDBY` (`SCHL_CLS_SCHLDL_UPDATEDBY`);

--
-- Indexes for table `SCHL_MSTR_PRNT`
--
ALTER TABLE `SCHL_MSTR_PRNT`
  ADD PRIMARY KEY (`PRNT_ID`),
  ADD KEY `PRNT_CREATEDBY` (`PRNT_CREATEDBY`),
  ADD KEY `PRNT_UPDATEDBY` (`PRNT_UPDATEDBY`);

--
-- Indexes for table `SCHL_ROOM_CATEGORY`
--
ALTER TABLE `SCHL_ROOM_CATEGORY`
  ADD PRIMARY KEY (`CAT_ID`);

--
-- Indexes for table `SCHL_STU`
--
ALTER TABLE `SCHL_STU`
  ADD PRIMARY KEY (`STU_ID`),
  ADD KEY `STU_PRNT_ID` (`STU_PRNT_ID`),
  ADD KEY `STU_BR_CLASS_ID` (`STU_BR_CLASS_ID`),
  ADD KEY `STU_CREATEDBY` (`STU_CREATEDBY`),
  ADD KEY `STU_UPDATEDBY` (`STU_UPDATEDBY`);

--
-- Indexes for table `SCHL_STU_ATT`
--
ALTER TABLE `SCHL_STU_ATT`
  ADD PRIMARY KEY (`STU_ATT_ID`),
  ADD KEY `STU_STU_ID` (`STU_STU_ID`),
  ADD KEY `STU_CLS_SCHLDL_ID` (`STU_CLS_SCHLDL_ID`),
  ADD KEY `STU_TCHR_ID` (`STU_TCHR_ID`),
  ADD KEY `STU_ATT_CREATEDBY` (`STU_ATT_CREATEDBY`),
  ADD KEY `STU_ATT_UPDATEDBY` (`STU_ATT_UPDATEDBY`);

--
-- Indexes for table `SCHL_TCHR_ATT`
--
ALTER TABLE `SCHL_TCHR_ATT`
  ADD PRIMARY KEY (`TCHR_ATT_ID`),
  ADD KEY `TCHR_ID` (`TCHR_ID`),
  ADD KEY `TCHR_ATT_CREATEDBY` (`TCHR_ATT_CREATEDBY`),
  ADD KEY `TCHR_ATT_UPDATEDBY` (`TCHR_ATT_UPDATEDBY`);

--
-- Indexes for table `SCHL_TCHR_SUB`
--
ALTER TABLE `SCHL_TCHR_SUB`
  ADD PRIMARY KEY (`TCHR_SUB_MAP_ID`),
  ADD KEY `TCHR_ID` (`TCHR_ID`),
  ADD KEY `TCHR_SUB_ID` (`TCHR_SUB_ID`),
  ADD KEY `TCHR_SUB_MAP_CREATEDBY` (`TCHR_SUB_MAP_CREATEDBY`),
  ADD KEY `TCHR_SUB_MAP_UPDATEDBY` (`TCHR_SUB_MAP_UPDATEDBY`);

--
-- Indexes for table `SCHL_TCHR_TIME_DTLS`
--
ALTER TABLE `SCHL_TCHR_TIME_DTLS`
  ADD PRIMARY KEY (`TCHR_TIME_ID`),
  ADD KEY `TCHR_ID` (`TCHR_ID`),
  ADD KEY `TCHR_TIME_CREATEDBY` (`TCHR_TIME_CREATEDBY`),
  ADD KEY `TCHR_TIME_UPDATEDBY` (`TCHR_TIME_UPDATEDBY`);

--
-- Indexes for table `SCHL_WHITELABEL`
--
ALTER TABLE `SCHL_WHITELABEL`
  ADD PRIMARY KEY (`WL_ID`),
  ADD KEY `WL_CREATEDBY` (`WL_CREATEDBY`),
  ADD KEY `WL_UPDATEDBY` (`WL_UPDATEDBY`),
  ADD KEY `WL_BMN_ID` (`WL_BMN_ID`),
  ADD KEY `WL_BRN_ID` (`WL_BRN_ID`);

--
-- Indexes for table `SMS_NOTIFICATION`
--
ALTER TABLE `SMS_NOTIFICATION`
  ADD PRIMARY KEY (`SMS_NO_ID`),
  ADD KEY `SMS_NO_USERID` (`SMS_NO_USERID`),
  ADD KEY `SMS_NO_OWNEDBY` (`SMS_NO_OWNEDBY`);

--
-- Indexes for table `SMS_NO_DTLS`
--
ALTER TABLE `SMS_NO_DTLS`
  ADD PRIMARY KEY (`SMS_NODTLS_ID`),
  ADD KEY `SMS_NOID` (`SMS_NOID`),
  ADD KEY `SMS_DTLS_ASSIGN_TO` (`SMS_DTLS_ASSIGN_TO`),
  ADD KEY `SMS_DTLS_UPDTDBY` (`SMS_DTLS_UPDTDBY`),
  ADD KEY `SMS_DTLS_CLOSEDBY` (`SMS_DTLS_CLOSEDBY`);

--
-- Indexes for table `SM_BOARD`
--
ALTER TABLE `SM_BOARD`
  ADD PRIMARY KEY (`BRD_ID`);

--
-- Indexes for table `SM_MAS_ROLE`
--
ALTER TABLE `SM_MAS_ROLE`
  ADD PRIMARY KEY (`MAS_ROLE_ID`);

--
-- Indexes for table `SM_ROLE_LINKS`
--
ALTER TABLE `SM_ROLE_LINKS`
  ADD PRIMARY KEY (`SM_RL_ID`),
  ADD KEY `SM_RL_ROLE_ID` (`SM_RL_ROLE_ID`);

--
-- Indexes for table `SM_SETTING`
--
ALTER TABLE `SM_SETTING`
  ADD PRIMARY KEY (`SET_ID`),
  ADD KEY `SET_USER_ID` (`SET_USER_ID`),
  ADD KEY `SET_CREATEDBY` (`SET_CREATEDBY`),
  ADD KEY `SET_UPDATEDBY` (`SET_UPDATEDBY`);

--
-- Indexes for table `SM_USER_LOGIN`
--
ALTER TABLE `SM_USER_LOGIN`
  ADD PRIMARY KEY (`USER_ID`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `MSTR_SCHOOL_MAIN`
--
ALTER TABLE `MSTR_SCHOOL_MAIN`
  ADD CONSTRAINT `MSTR_SCHOOL_MAIN_ibfk_1` FOREIGN KEY (`SCHL_BRD_ID`) REFERENCES `SM_BOARD` (`BRD_ID`),
  ADD CONSTRAINT `MSTR_SCHOOL_MAIN_ibfk_2` FOREIGN KEY (`SCHL_MN_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `MSTR_SCHOOL_MAIN_ibfk_3` FOREIGN KEY (`SCHL_MN_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `MSTR_SCHOOL_MAIN_ibfk_4` FOREIGN KEY (`SCHL_BRD_ID`) REFERENCES `SM_BOARD` (`BRD_ID`);

--
-- Constraints for table `SCHL_BRANCH`
--
ALTER TABLE `SCHL_BRANCH`
  ADD CONSTRAINT `SCHL_BRANCH_ibfk_1` FOREIGN KEY (`SCHL_BR_CENTER_ID`) REFERENCES `MSTR_SCHOOL_MAIN` (`SCHL_MN_ID`),
  ADD CONSTRAINT `SCHL_BRANCH_ibfk_2` FOREIGN KEY (`SCHL_BR_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_BRANCH_ibfk_3` FOREIGN KEY (`SCHL_BR_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_BR_CLASS`
--
ALTER TABLE `SCHL_BR_CLASS`
  ADD CONSTRAINT `SCHL_BR_CLASS_ibfk_3` FOREIGN KEY (`SCHL_BR_CLS_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_BR_CLASS_ibfk_4` FOREIGN KEY (`SCHL_BR_CLS_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_BR_CLASS_SEC_SESSION`
--
ALTER TABLE `SCHL_BR_CLASS_SEC_SESSION`
  ADD CONSTRAINT `SCHL_BR_CLASS_SEC_SESSION_ibfk_3` FOREIGN KEY (`SCHL_BR_CLASS_SEC_SESS_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_BR_CLASS_SEC_SESSION_ibfk_4` FOREIGN KEY (`SCHL_BR_CLASS_SEC_SESS_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_BR_ROOM`
--
ALTER TABLE `SCHL_BR_ROOM`
  ADD CONSTRAINT `SCHL_BR_ROOM_ibfk_2` FOREIGN KEY (`SCHL_BR_RM_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_BR_ROOM_ibfk_3` FOREIGN KEY (`SCHL_BR_RM_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_BR_TCHR`
--
ALTER TABLE `SCHL_BR_TCHR`
  ADD CONSTRAINT `SCHL_BR_TCHR_ibfk_1` FOREIGN KEY (`BR_TCHR_BR_ID`) REFERENCES `SCHL_BRANCH` (`SCHL_BR_ID`),
  ADD CONSTRAINT `SCHL_BR_TCHR_ibfk_2` FOREIGN KEY (`BR_TCHR_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_BR_TCHR_ibfk_3` FOREIGN KEY (`BR_TCHR_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_CLS_SCHLDL`
--
ALTER TABLE `SCHL_CLS_SCHLDL`
  ADD CONSTRAINT `SCHL_CLS_SCHLDL_ibfk_2` FOREIGN KEY (`SCHL_CLS_SCHLDL_SUB_ID`) REFERENCES `SCHL_BR_CLS_SUBJECT` (`BR_CLS_SUB_ID`),
  ADD CONSTRAINT `SCHL_CLS_SCHLDL_ibfk_3` FOREIGN KEY (`SCHL_BR_RM_ID`) REFERENCES `SCHL_BR_ROOM` (`SCHL_BR_RM_ID`),
  ADD CONSTRAINT `SCHL_CLS_SCHLDL_ibfk_4` FOREIGN KEY (`SCHL_BR_TCHR_ID`) REFERENCES `SCHL_BR_TCHR` (`BR_TCHR_ID`),
  ADD CONSTRAINT `SCHL_CLS_SCHLDL_ibfk_5` FOREIGN KEY (`SCHL_CLS_SCHLDL_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_CLS_SCHLDL_ibfk_6` FOREIGN KEY (`SCHL_CLS_SCHLDL_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_MSTR_PRNT`
--
ALTER TABLE `SCHL_MSTR_PRNT`
  ADD CONSTRAINT `SCHL_MSTR_PRNT_ibfk_1` FOREIGN KEY (`PRNT_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_MSTR_PRNT_ibfk_2` FOREIGN KEY (`PRNT_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_STU`
--
ALTER TABLE `SCHL_STU`
  ADD CONSTRAINT `SCHL_STU_ibfk_3` FOREIGN KEY (`STU_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_STU_ibfk_4` FOREIGN KEY (`STU_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_STU_ATT`
--
ALTER TABLE `SCHL_STU_ATT`
  ADD CONSTRAINT `SCHL_STU_ATT_ibfk_4` FOREIGN KEY (`STU_ATT_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_STU_ATT_ibfk_5` FOREIGN KEY (`STU_ATT_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_TCHR_ATT`
--
ALTER TABLE `SCHL_TCHR_ATT`
  ADD CONSTRAINT `SCHL_TCHR_ATT_ibfk_1` FOREIGN KEY (`TCHR_ID`) REFERENCES `SCHL_BR_TCHR` (`BR_TCHR_ID`),
  ADD CONSTRAINT `SCHL_TCHR_ATT_ibfk_2` FOREIGN KEY (`TCHR_ATT_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_TCHR_ATT_ibfk_3` FOREIGN KEY (`TCHR_ATT_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_TCHR_SUB`
--
ALTER TABLE `SCHL_TCHR_SUB`
  ADD CONSTRAINT `SCHL_TCHR_SUB_ibfk_1` FOREIGN KEY (`TCHR_ID`) REFERENCES `SCHL_BR_TCHR` (`BR_TCHR_ID`),
  ADD CONSTRAINT `SCHL_TCHR_SUB_ibfk_2` FOREIGN KEY (`TCHR_SUB_ID`) REFERENCES `SCHL_BR_CLS_SUBJECT` (`BR_CLS_SUB_ID`),
  ADD CONSTRAINT `SCHL_TCHR_SUB_ibfk_3` FOREIGN KEY (`TCHR_SUB_MAP_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_TCHR_SUB_ibfk_4` FOREIGN KEY (`TCHR_SUB_MAP_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_TCHR_TIME_DTLS`
--
ALTER TABLE `SCHL_TCHR_TIME_DTLS`
  ADD CONSTRAINT `SCHL_TCHR_TIME_DTLS_ibfk_1` FOREIGN KEY (`TCHR_ID`) REFERENCES `SCHL_BR_TCHR` (`BR_TCHR_ID`),
  ADD CONSTRAINT `SCHL_TCHR_TIME_DTLS_ibfk_2` FOREIGN KEY (`TCHR_TIME_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_TCHR_TIME_DTLS_ibfk_3` FOREIGN KEY (`TCHR_TIME_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SCHL_WHITELABEL`
--
ALTER TABLE `SCHL_WHITELABEL`
  ADD CONSTRAINT `SCHL_WHITELABEL_ibfk_1` FOREIGN KEY (`WL_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_WHITELABEL_ibfk_2` FOREIGN KEY (`WL_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SCHL_WHITELABEL_ibfk_3` FOREIGN KEY (`WL_BMN_ID`) REFERENCES `MSTR_SCHOOL_MAIN` (`SCHL_MN_ID`) ON DELETE SET NULL,
  ADD CONSTRAINT `SCHL_WHITELABEL_ibfk_4` FOREIGN KEY (`WL_BRN_ID`) REFERENCES `SCHL_BRANCH` (`SCHL_BR_ID`) ON DELETE SET NULL;

--
-- Constraints for table `SMS_NOTIFICATION`
--
ALTER TABLE `SMS_NOTIFICATION`
  ADD CONSTRAINT `SMS_NOTIFICATION_ibfk_1` FOREIGN KEY (`SMS_NO_USERID`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SMS_NOTIFICATION_ibfk_2` FOREIGN KEY (`SMS_NO_OWNEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SMS_NO_DTLS`
--
ALTER TABLE `SMS_NO_DTLS`
  ADD CONSTRAINT `SMS_NO_DTLS_ibfk_1` FOREIGN KEY (`SMS_NOID`) REFERENCES `SMS_NOTIFICATION` (`SMS_NO_ID`),
  ADD CONSTRAINT `SMS_NO_DTLS_ibfk_2` FOREIGN KEY (`SMS_DTLS_ASSIGN_TO`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SMS_NO_DTLS_ibfk_3` FOREIGN KEY (`SMS_DTLS_UPDTDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SMS_NO_DTLS_ibfk_4` FOREIGN KEY (`SMS_DTLS_CLOSEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);

--
-- Constraints for table `SM_ROLE_LINKS`
--
ALTER TABLE `SM_ROLE_LINKS`
  ADD CONSTRAINT `SM_ROLE_LINKS_ibfk_1` FOREIGN KEY (`SM_RL_ROLE_ID`) REFERENCES `SM_MAS_ROLE` (`MAS_ROLE_ID`);

--
-- Constraints for table `SM_SETTING`
--
ALTER TABLE `SM_SETTING`
  ADD CONSTRAINT `SM_SETTING_ibfk_1` FOREIGN KEY (`SET_USER_ID`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SM_SETTING_ibfk_2` FOREIGN KEY (`SET_CREATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`),
  ADD CONSTRAINT `SM_SETTING_ibfk_3` FOREIGN KEY (`SET_UPDATEDBY`) REFERENCES `SM_USER_LOGIN` (`USER_ID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
