<?php
require_once __DIR__ . '/../vendor/autoload.php';

// Write a custom Database class override to force SQLite in memory,
// since the original Database.php might read the .env file instead.
if (!class_exists('Database')) {
    class Database {
        private static $conn = null;

        public static function getConnection() {
            if (self::$conn === null) {
                self::$conn = new PDO('sqlite::memory:');
                self::$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                self::$conn->exec("PRAGMA foreign_keys = ON;");

                self::$conn->exec("CREATE TABLE IF NOT EXISTS SM_USER_LOGIN (user_id VARCHAR PRIMARY KEY, user_email_id VARCHAR, user_first_name VARCHAR, user_last_name VARCHAR, user_passwd VARCHAR, user_cr_dt VARCHAR, user_role VARCHAR, user_img BLOB, user_school_id VARCHAR, user_branch_id VARCHAR)");
                self::$conn->exec("CREATE TABLE IF NOT EXISTS SM_MAS_ROLE (MAS_role_id VARCHAR PRIMARY KEY, MAS_role_DESC VARCHAR, MAS_role_link VARCHAR)");
                self::$conn->exec("CREATE TABLE IF NOT EXISTS SM_ROLE_LINKS (SM_RL_ID VARCHAR PRIMARY KEY, SM_RL_ROLE_ID VARCHAR, SM_RL_LINK_DESC VARCHAR, SM_RL_LINK_URL VARCHAR, SM_RL_LINK_SRL INTEGER, SM_RL_SUBMENU VARCHAR, SM_RL_STATUS VARCHAR, SM_RL_CREATEDBY VARCHAR, SM_RL_CREATEDAT VARCHAR, SM_RL_UPDATEDBY VARCHAR, SM_RL_UPDATEDAT VARCHAR)");
                self::$conn->exec("CREATE TABLE IF NOT EXISTS SCHL_BRANCH (SCHL_BR_ID VARCHAR, SCHL_BR_NM VARCHAR, SCHL_BR_CENTER_ID VARCHAR, SCHL_BR_CITY VARCHAR, SCHL_BR_STATE VARCHAR, SCHL_BR_ADDRESS VARCHAR, SCHL_BR_EMAILID VARCHAR)");
                self::$conn->exec("CREATE TABLE IF NOT EXISTS MSTR_SCHOOL_MAIN (SCHL_MN_ID VARCHAR, SCHL_MN_NM VARCHAR, schl_mn_city VARCHAR, schl_mn_state VARCHAR, schl_mn_address VARCHAR, schl_mn_emailid VARCHAR)");
                self::$conn->exec("CREATE TABLE IF NOT EXISTS SCHL_TEACHER (SCHL_TCHR_ID VARCHAR, SCHL_TCHR_BR_ID VARCHAR, SCHL_TCHR_EMAIL VARCHAR)");
                self::$conn->exec("CREATE TABLE IF NOT EXISTS SCHL_STU (STU_ID VARCHAR, STU_BR_CLASS_ID VARCHAR, STU_ROLL_NO VARCHAR, STU_PRNT_ID VARCHAR)");
                self::$conn->exec("CREATE TABLE IF NOT EXISTS SCHL_BR_CLASS_SEC_SESSION (SCHL_BR_CLASS_SEC_SESS_ID VARCHAR, SCHL_BR_CLASS_SEC_SESS_BR_ID VARCHAR)");
                self::$conn->exec("CREATE TABLE IF NOT EXISTS SCHL_MSTR_PRNT (PRNT_ID VARCHAR, PRNT_EMAILID VARCHAR)");
            }
            return self::$conn;
        }
    }
}

// Mock classes/traits needed if autoloader is not working fully
spl_autoload_register(function ($class) {
    if ($class === 'Database') return;
    $files = [
        __DIR__ . '/../school_be/src/Core/Config/' . $class . '.php',
        __DIR__ . '/../school_be/src/Core/Utils/' . $class . '.php',
        __DIR__ . '/../school_be/src/Modules/Auth/' . $class . '.php',
    ];
    foreach ($files as $file) {
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});
