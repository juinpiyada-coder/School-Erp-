import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_app/main.dart';
import 'package:school_erp_app/auth/user_model.dart';
import 'package:school_erp_app/dashboards/role_dashboard_router.dart';
import 'package:school_erp_app/dashboards/admin_dashboard_screen.dart';
import 'package:school_erp_app/dashboards/school_admin_dashboard_screen.dart';
import 'package:school_erp_app/dashboards/branch_dashboard_screen.dart';
import 'package:school_erp_app/dashboards/teacher_dashboard_screen.dart';
import 'package:school_erp_app/dashboards/student_dashboard_screen.dart';
import 'package:school_erp_app/dashboards/guardian_dashboard_screen.dart';

void main() {
  testWidgets('App loads LoginScreen smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MySkoolApp());
    await tester.pumpAndSettle();

    expect(find.text('MySkool ERP'), findsOneWidget);
    expect(find.text('Institutional Management Platform'), findsOneWidget);
    expect(find.byType(ElevatedButton), findsOneWidget);
  });

  group('RoleDashboardRouter role-based redirection unit test', () {
    testWidgets('R_SUPERADMIN redirects to AdminDashboardScreen', (WidgetTester tester) async {
      final user = UserModel(
        userId: 'usr_super',
        email: 'super_admin@gmail.com',
        name: 'Super Admin',
        roleCode: 'R_SUPERADMIN',
      );
      await tester.pumpWidget(MaterialApp(home: RoleDashboardRouter(user: user)));
      await tester.pump();

      expect(find.byType(AdminDashboardScreen), findsOneWidget);
      expect(find.text('Super Admin Dashboard'), findsOneWidget);
    });

    testWidgets('R_SCHOOLADMIN redirects to SchoolAdminDashboardScreen', (WidgetTester tester) async {
      final user = UserModel(
        userId: 'usr_sch',
        email: 'school@gmail.com',
        name: 'School Admin',
        roleCode: 'R_SCHOOLADMIN',
      );
      await tester.pumpWidget(MaterialApp(home: RoleDashboardRouter(user: user)));
      await tester.pumpAndSettle();

      expect(find.byType(SchoolAdminDashboardScreen), findsOneWidget);
      expect(find.text('School Admin Dashboard'), findsOneWidget);
    });

    testWidgets('R_BRANCHADMIN redirects to BranchDashboardScreen', (WidgetTester tester) async {
      final user = UserModel(
        userId: 'usr_br',
        email: 'branch@gmail.com',
        name: 'Branch Admin',
        roleCode: 'R_BRANCHADMIN',
      );
      await tester.pumpWidget(MaterialApp(home: RoleDashboardRouter(user: user)));
      await tester.pumpAndSettle();

      expect(find.byType(BranchDashboardScreen), findsOneWidget);
      expect(find.text('Branch Executive Dashboard'), findsOneWidget);
    });

    testWidgets('R_TEACHER redirects to TeacherDashboardScreen', (WidgetTester tester) async {
      final user = UserModel(
        userId: 'usr_tea',
        email: 'teacher@gmail.com',
        name: 'Teacher',
        roleCode: 'R_TEACHER',
      );
      await tester.pumpWidget(MaterialApp(home: RoleDashboardRouter(user: user)));
      await tester.pumpAndSettle();

      expect(find.byType(TeacherDashboardScreen), findsOneWidget);
      expect(find.text('Teacher Faculty Dashboard'), findsOneWidget);
    });

    testWidgets('R_STUDENT redirects to StudentDashboardScreen', (WidgetTester tester) async {
      final user = UserModel(
        userId: 'usr_stu',
        email: 'student@gmail.com',
        name: 'Student',
        roleCode: 'R_STUDENT',
      );
      await tester.pumpWidget(MaterialApp(home: RoleDashboardRouter(user: user)));
      await tester.pumpAndSettle();

      expect(find.byType(StudentDashboardScreen), findsOneWidget);
      expect(find.text('Student Learning Space'), findsOneWidget);
    });

    testWidgets('R_GUARDIAN redirects to GuardianDashboardScreen', (WidgetTester tester) async {
      final user = UserModel(
        userId: 'usr_guar',
        email: 'parent@gmail.com',
        name: 'Guardian',
        roleCode: 'R_GUARDIAN',
      );
      await tester.pumpWidget(MaterialApp(home: RoleDashboardRouter(user: user)));
      await tester.pumpAndSettle();

      expect(find.byType(GuardianDashboardScreen), findsOneWidget);
      expect(find.text('Parent & Guardian Portal'), findsOneWidget);
    });
  });
}
