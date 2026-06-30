import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:quickgo_customer_app/src/customer_app.dart';
import 'package:quickgo_customer_app/src/providers.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  bool firebaseInitialized = false;
  try {
    await Firebase.initializeApp();
    firebaseInitialized = true;
  } catch (e) {
    debugPrint('Firebase initialization failed (Mock operations will be used): $e');
  }

  runApp(
    ProviderScope(
      overrides: [
        isFirebaseInitializedProvider.overrideWithValue(firebaseInitialized),
      ],
      child: const CustomerApp(),
    ),
  );
}

