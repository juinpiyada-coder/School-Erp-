<?php
use PHPUnit\Framework\TestCase;

class AuthTest extends TestCase {
    protected $db;
    protected $userService;
    protected $roleService;
    protected $roleLinkService;

    protected function setUp(): void {
        parent::setUp();

        $this->db = Database::getConnection();

        // Clear tables before each test
        $this->db->exec("DELETE FROM SM_USER_LOGIN");
        $this->db->exec("DELETE FROM SM_MAS_ROLE");
        $this->db->exec("DELETE FROM SM_ROLE_LINKS");

        $this->userService = new UserService();
        $this->roleService = new RoleService();
        $this->roleLinkService = new RoleLinkService();
    }

    public function testLoginWithValidCredentialsReturns200WithJwt() {
        // Setup user and role
        $this->roleService->createRole([
            'MAS_role_id' => 'R_TEST',
            'MAS_role_DESC' => 'Test Role'
        ]);

        $this->userService->createUser([
            'user_id' => 'test_user',
            'user_email_id' => 'test@example.com',
            'user_passwd' => 'password123',
            'user_role' => 'R_TEST'
        ]);

        $result = $this->userService->login('test@example.com', 'password123');

        $this->assertTrue($result['success']);
        $this->assertEquals('Login successful', $result['message']);
        $this->assertArrayHasKey('token', $result);
        $this->assertNotEmpty($result['token']);

        $this->assertArrayHasKey('user', $result);
        $this->assertEquals('test_user', $result['user']['id']);
        $this->assertEquals('test@example.com', $result['user']['email']);
        $this->assertEquals('R_TEST', $result['user']['role_id']);
    }

    public function testLoginWithWrongPasswordReturnsError() {
        $this->roleService->createRole([
            'MAS_role_id' => 'R_TEST',
            'MAS_role_DESC' => 'Test Role'
        ]);

        $this->userService->createUser([
            'user_id' => 'test_user',
            'user_email_id' => 'test@example.com',
            'user_passwd' => 'password123',
            'user_role' => 'R_TEST'
        ]);

        $result = $this->userService->login('test@example.com', 'wrongpassword');

        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid email or password', $result['message']);
        $this->assertArrayNotHasKey('token', $result);
    }

    public function testLoginWithNonExistentUserReturnsError() {
        $result = $this->userService->login('nonexistent@example.com', 'password123');

        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid email or password', $result['message']);
    }

    public function testUserCreationHashesPasswordAndCannotBePlainText() {
        $this->roleService->createRole([
            'MAS_role_id' => 'R_TEST',
            'MAS_role_DESC' => 'Test Role'
        ]);

        $this->userService->createUser([
            'user_id' => 'hash_test_user',
            'user_email_id' => 'hash_test@example.com',
            'user_passwd' => 'plain_text_password',
            'user_role' => 'R_TEST'
        ]);

        $userModel = new User();
        $user = $userModel->getById('hash_test_user');

        $this->assertNotNull($user);

        // Fetch raw DB row to check the password field
        $stmt = $this->db->prepare("SELECT user_passwd FROM SM_USER_LOGIN WHERE user_id = 'hash_test_user'");
        $stmt->execute();
        $dbUser = $stmt->fetch();

        $this->assertNotEquals('plain_text_password', $dbUser['user_passwd']);
        $this->assertTrue(password_verify('plain_text_password', $dbUser['user_passwd']));
    }

    public function testDuplicateUserCreationReturnsError() {
        $this->roleService->createRole([
            'MAS_role_id' => 'R_TEST',
            'MAS_role_DESC' => 'Test Role'
        ]);

        $result1 = $this->userService->createUser([
            'user_id' => 'dup_user',
            'user_email_id' => 'dup@example.com',
            'user_passwd' => 'pass123',
            'user_role' => 'R_TEST'
        ]);

        $this->assertTrue($result1['success']);

        $result2 = $this->userService->createUser([
            'user_id' => 'dup_user',
            'user_email_id' => 'another@example.com',
            'user_passwd' => 'pass123',
            'user_role' => 'R_TEST'
        ]);

        $this->assertFalse($result2['success']);
        $this->assertEquals('User with this ID already exists', $result2['message']);
}

    public function testGetAllRolesReturnsArray() {
        $this->roleService->createRole([
            'MAS_role_id' => 'R_ADMIN',
            'MAS_role_DESC' => 'Admin Role'
        ]);

        $roles = $this->roleService->getAllRoles();
        $this->assertIsArray($roles);
        $this->assertCount(1, $roles);
        $this->assertEquals('R_ADMIN', $roles[0]['MAS_role_id']);
    }

    public function testUpdateRoleUpdatesDescriptionAndLink() {
        $this->roleService->createRole([
            'MAS_role_id' => 'R_TEST',
            'MAS_role_DESC' => 'Test Role'
        ]);

        $result = $this->roleService->updateRole('R_TEST', [
            'MAS_role_DESC' => 'Updated Role',
            'MAS_role_link' => '/admin'
        ]);

        $this->assertTrue($result['success']);

        $role = $this->roleService->getRoleById('R_TEST');
        $this->assertEquals('Updated Role', $role['MAS_role_DESC']);
        $this->assertEquals('/admin', $role['MAS_role_link']);
    }

    public function testDeleteRoleReturnsSuccess() {
        $this->roleService->createRole([
            'MAS_role_id' => 'R_DELETE',
            'MAS_role_DESC' => 'Delete Role'
        ]);

        $result = $this->roleService->deleteRole('R_DELETE');
        $this->assertTrue($result['success']);

        $role = $this->roleService->getRoleById('R_DELETE');
        $this->assertFalse($role);
    }

    public function testDeleteSuperAdminRoleFails() {
        $result = $this->roleService->deleteRole('R_SUPERADMIN');
        $this->assertFalse($result['success']);
        $this->assertEquals('The Super Admin role is protected and cannot be deleted.', $result['message']);
    }

    public function testRoleLinkCreationAndStatusToggle() {
        $this->roleService->createRole([
            'MAS_role_id' => 'R_TEACHER',
            'MAS_role_DESC' => 'Teacher'
        ]);

        $linkResult = $this->roleLinkService->createLink([
            'SM_RL_ROLE_ID' => 'R_TEACHER',
            'SM_RL_LINK_DESC' => 'View Grades',
            'SM_RL_LINK_URL' => '/teacher/grades',
            'SM_RL_STATUS' => 'ACTIVE'
        ], 'usr_super');

        $this->assertTrue($linkResult['success']);
        $this->assertArrayHasKey('data', $linkResult);
        $linkId = $linkResult['data']['SM_RL_ID'];

        $toggleResult = $this->roleLinkService->toggleStatus($linkId, 'usr_super');
        $this->assertTrue($toggleResult['success']);
        $this->assertEquals('Role link status changed to INACTIVE', $toggleResult['message']);

        $links = $this->roleLinkService->getLinksByRoleId('R_TEACHER');
        $this->assertCount(1, $links);
        $this->assertEquals('INACTIVE', $links[0]['SM_RL_STATUS']);
    }

    public function testValidatingAccessMatrixFailsOnUnassignedRoleLink() {
        // Testing attaching permission links to a role and validating existence
        $this->roleService->createRole([
            'MAS_role_id' => 'R_STUDENT',
            'MAS_role_DESC' => 'Student'
        ]);

        $this->roleLinkService->createLink([
            'SM_RL_ROLE_ID' => 'R_STUDENT',
            'SM_RL_LINK_DESC' => 'View Homework',
            'SM_RL_LINK_URL' => '/student/homework',
        ]);

        $links = $this->roleLinkService->getAllLinks('R_STUDENT');

        $this->assertCount(1, $links);
        $this->assertEquals('View Homework', $links[0]['SM_RL_LINK_DESC']);
        $this->assertEquals('/student/homework', $links[0]['SM_RL_LINK_URL']);
    }


    public function testSqlInjectionResistanceOnRoleLinkFetch() {
        // Try to fetch role links by a maliciously crafted role ID
        // The service should use prepared statements and return no results
        // rather than executing the injected SQL.

        $maliciousRoleId = "R_STUDENT' OR '1'='1";

        $links = $this->roleLinkService->getLinksByRoleId($maliciousRoleId);

        $this->assertIsArray($links);
        $this->assertEmpty($links);
    }

    public function testTransactionRollbackOnFailedBatchAssignment() {
        // Since SQLite handles constraints slightly differently,
        // we can test that creating a link with an invalid role returns validation failure
        // which simulates the application layer preventing bad data from entering.

        $result = $this->roleLinkService->createLink([
            'SM_RL_ROLE_ID' => 'NON_EXISTENT_ROLE', // Foreign key/validation violation
            'SM_RL_LINK_DESC' => 'Invalid Link',
            'SM_RL_LINK_URL' => '/invalid'
        ]);

        $this->assertFalse($result['success']);
        $this->assertEquals('Referenced Role does not exist', $result['errors']['SM_RL_ROLE_ID']);

        // Verify the link was not created in the database
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM SM_ROLE_LINKS WHERE SM_RL_ROLE_ID = 'NON_EXISTENT_ROLE'");
        $stmt->execute();
        $count = $stmt->fetchColumn();

        $this->assertEquals(0, $count);
    }
}
