import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_customer_app/src/screens/home_screen.dart';
import 'package:quickgo_customer_app/src/screens/login_screen.dart';
import 'package:quickgo_customer_app/src/screens/orders_screen.dart';
import 'package:quickgo_customer_app/src/screens/profile_screen.dart';
import 'package:quickgo_customer_app/src/screens/support_screen.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import 'package:quickgo_customer_app/src/providers.dart';

class CustomerApp extends ConsumerStatefulWidget {
  const CustomerApp({super.key});

  @override
  ConsumerState<CustomerApp> createState() => _CustomerAppState();
}

class _CustomerAppState extends ConsumerState<CustomerApp> {
  var _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final loggedIn = session.isAuthenticated;

    return MaterialApp(
      title: 'QuickGO',
      theme: quickGoTheme(),
      home: loggedIn
          ? Scaffold(
              appBar: AppBar(title: const Text('QuickGO')),
              body: IndexedStack(
                index: _tabIndex,
                children: const [
                  HomeScreen(),
                  OrdersScreen(),
                  SupportScreen(),
                  ProfileScreen(),
                ],
              ),
              bottomNavigationBar: NavigationBar(
                selectedIndex: _tabIndex,
                onDestinationSelected: (index) => setState(() => _tabIndex = index),
                destinations: const [
                  NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
                  NavigationDestination(
                    icon: Icon(Icons.receipt_long),
                    label: 'Orders',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.support_agent),
                    label: 'Support',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.person),
                    label: 'Profile',
                  ),
                ],
              ),
            )
          : LoginScreen(onVerified: () {}),
    );
  }
}

