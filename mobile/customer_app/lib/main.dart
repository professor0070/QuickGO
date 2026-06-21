import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_customer_app/src/customer_app.dart';

void main() {
  runApp(const ProviderScope(child: CustomerApp()));
}

