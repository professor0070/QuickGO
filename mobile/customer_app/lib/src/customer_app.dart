import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_customer_app/src/screens/home_screen.dart';
import 'package:quickgo_customer_app/src/screens/login_screen.dart';
import 'package:quickgo_customer_app/src/screens/notifications_screen.dart';
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
  bool _fcmInitialized = false;

  void _initFcm() {
    if (_fcmInitialized) return;
    _fcmInitialized = true;

    final isInitialized = ref.read(isFirebaseInitializedProvider);
    if (!isInitialized) {
      debugPrint('FCM initialization skipped: Firebase is not initialized.');
      return;
    }

    // Register device token with backend
    final client = ref.read(apiClientProvider);
    registerDeviceToken(client);

    // Listen for foreground push messages and show a snackbar
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final title = message.notification?.title ?? 'New notification';
      final body = message.notification?.body ?? '';
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(body.isNotEmpty ? '$title: $body' : title),
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: 'View',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            },
          ),
        ),
      );
      // Refresh notification counts
      ref.invalidate(notificationsProvider);
      ref.invalidate(unreadNotificationCountProvider);
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final loggedIn = session.isAuthenticated;

    // Initialize FCM once authenticated
    if (loggedIn) {
      _initFcm();
    }

    final unreadAsync = ref.watch(unreadNotificationCountProvider);
    final unreadCount = unreadAsync.valueOrNull ?? 0;

    return MaterialApp(
      title: 'QuickGO',
      theme: quickGoTheme(),
      home: loggedIn
          ? Scaffold(
              appBar: AppBar(
                title: const Text('QuickGO'),
                actions: [
                  Stack(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.notifications_outlined),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const NotificationsScreen(),
                            ),
                          );
                        },
                      ),
                      if (unreadCount > 0)
                        Positioned(
                          right: 6,
                          top: 6,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.redAccent,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              unreadCount > 9 ? '9+' : '$unreadCount',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
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
