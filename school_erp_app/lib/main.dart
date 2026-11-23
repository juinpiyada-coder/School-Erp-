import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'academic/academic_theme.dart';
import 'auth/login_screen.dart';
import 'common/shorebird_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load the production environment file
  try {
    await dotenv.load(fileName: ".env.production");
  } catch (e) {
    debugPrint("Warning: Could not load .env.production, falling back to default URL: $e");
  }

  // Initialize cached dynamic theme settings
  await AppTheme.initialize();

  // Fetch updated whitelabel theme in the background from backend
  AppTheme.syncWithServer();

  // Silent background check for Shorebird CodePush OTA patches
  ShorebirdUpdateService.checkForUpdateInBackground();

  runApp(const MySkoolApp());
}

class MySkoolApp extends StatelessWidget {
  const MySkoolApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AppTheme(),
      builder: (context, _) {
        return MaterialApp(
          title: AppTheme.liveAppName,
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
              seedColor: AppTheme.livePrimary,
              primary: AppTheme.livePrimary,
            ),
            scaffoldBackgroundColor: AppTheme.background,
            appBarTheme: AppBarTheme(
              backgroundColor: AppTheme.livePrimary,
              foregroundColor: Colors.white,
              elevation: 0,
            ),
          ),
          home: const LoginScreen(),
        );
      },
    );
  }
}
