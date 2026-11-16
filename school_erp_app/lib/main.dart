import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'auth/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load the production environment file
  try {
    await dotenv.load(fileName: ".env.production");
  } catch (e) {
    debugPrint("Warning: Could not load .env.production, falling back to default URL: $e");
  }

  runApp(const MySkoolApp());
}

class MySkoolApp extends StatelessWidget {
  const MySkoolApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MySkool ERP',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF005A9E),
          primary: const Color(0xFF005A9E),
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: const LoginScreen(),
    );
  }
}
