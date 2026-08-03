import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_partner_app/src/screens/login_screen.dart';
import 'package:quickgo_partner_app/src/screens/rider_mode_screen.dart';
import 'package:quickgo_partner_app/src/screens/vendor_mode_screen.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import 'providers.dart';
import 'screens/partner_support_screen.dart';
import 'screens/partner_legal_screen.dart';
import 'screens/role_selection_screen.dart';

class PartnerApp extends ConsumerStatefulWidget {
  const PartnerApp({super.key});

  @override
  ConsumerState<PartnerApp> createState() => _PartnerAppState();
}

class _PartnerAppState extends ConsumerState<PartnerApp> {
  var _loggedIn = false;
  bool _fcmInitialized = false;
  final _navigatorKey = GlobalKey<NavigatorState>();
  final _scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

  PartnerMode _getCurrentMode() {
    final session = ref.read(sessionProvider);
    return session.selectedPartnerMode ??
        (session.defaultPartnerMode ?? PartnerMode.vendor);
  }

  void _initFcm() {
    if (_fcmInitialized) return;
    _fcmInitialized = true;

    final isInitialized = ref.read(isFirebaseInitializedProvider);
    if (!isInitialized) {
      debugPrint('FCM initialization skipped: Firebase is not initialized.');
      return;
    }

    // Register partner device token with backend
    final client = ref.read(apiClientProvider);
    registerPartnerDeviceToken(client);

    // Listen for foreground push messages and show a dialog for new order alerts
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final title = message.notification?.title ?? 'New notification';
      final body = message.notification?.body ?? '';
      if (!mounted) return;

      // Extract order details from payload data
      final payloadStr = message.data['payload'] as String?;
      Map<String, dynamic>? payload;
      if (payloadStr != null) {
        try {
          payload = jsonDecode(payloadStr) as Map<String, dynamic>?;
        } catch (_) {}
      }
      final orderId = payload?['orderId'] ?? message.data['orderId'] as String?;

      // If notification looks like a new order alert, show a prominent dialog
      final isOrderAlert = title.toLowerCase().contains('order') ||
          title.toLowerCase().contains('delivery');
      if (isOrderAlert) {
        showDialog(
          context: _navigatorKey.currentContext!,
          builder: (c) {
            final currentMode = _getCurrentMode();
            return AlertDialog(
              title: Text(title),
              content: Text(body),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(c),
                  child: const Text('Dismiss'),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(c);
                    ref.read(vendorTabIndexProvider.notifier).state = 1;
                    ref.invalidate(vendorOrdersProvider);
                    ref.invalidate(riderOrdersProvider);
                    ref.invalidate(riderDashboardProvider);
                    ref.invalidate(vendorDashboardProvider);
                  },
                  child: const Text('View Orders'),
                ),
                FilledButton(
                  onPressed: () async {
                    Navigator.pop(c);
                    if (orderId == null || orderId.isEmpty) {
                      _scaffoldMessengerKey.currentState?.showSnackBar(
                        const SnackBar(
                            content: Text(
                                'Cannot accept order: missing order identity.')),
                      );
                      return;
                    }
                    try {
                      final client = ref.read(apiClientProvider);
                      if (currentMode == PartnerMode.rider) {
                        await client.postMap(
                          '/rider/orders/$orderId/accept',
                          {},
                          idempotencyKey:
                              'rider-accept-$orderId-${DateTime.now().millisecondsSinceEpoch}',
                        );
                      } else {
                        await client.postMap(
                          '/vendor/orders/$orderId/accept',
                          {},
                          idempotencyKey:
                              'vendor-accept-$orderId-${DateTime.now().millisecondsSinceEpoch}',
                        );
                      }
                      _scaffoldMessengerKey.currentState?.showSnackBar(
                        const SnackBar(
                            content: Text('Order accepted successfully!')),
                      );
                    } catch (e) {
                      _scaffoldMessengerKey.currentState?.showSnackBar(
                        SnackBar(content: Text('Failed to accept order: $e')),
                      );
                    }
                    ref.invalidate(vendorOrdersProvider);
                    ref.invalidate(riderOrdersProvider);
                    ref.invalidate(riderDashboardProvider);
                    ref.invalidate(vendorDashboardProvider);
                  },
                  child: const Text('Accept'),
                ),
              ],
            );
          },
        );
      } else {
        _scaffoldMessengerKey.currentState?.showSnackBar(
          SnackBar(
            content: Text(body.isNotEmpty ? '$title: $body' : title),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);

    // Auto-align loggedIn state with session authentication
    if (!session.isAuthenticated && _loggedIn) {
      _loggedIn = false;
    }

    // Initialize FCM once logged in and authorized
    if (_loggedIn && session.hasPartnerAccess) {
      _initFcm();
    }

    Widget homeWidget;
    if (!_loggedIn) {
      homeWidget =
          LoginScreen(onVerified: () => setState(() => _loggedIn = true));
    } else if (!session.hasPartnerAccess) {
      homeWidget = Scaffold(
        appBar: AppBar(
          title: const Text('Access Denied'),
        ),
        body: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.gpp_bad, size: 80, color: Colors.redAccent),
              const SizedBox(height: 24),
              const Text(
                'Access Denied',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              const Text(
                'This phone number is not registered as a QuickGO Partner.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: () {
                  ref.read(sessionProvider.notifier).logout();
                  setState(() => _loggedIn = false);
                },
                child: const Text('Logout / Use different number'),
              ),
            ],
          ),
        ),
      );
    } else if (session.selectedPartnerMode == null) {
      homeWidget = const RoleSelectionScreen();
    } else {
      final resolvedMode = session.selectedPartnerMode!;

      homeWidget = Scaffold(
        appBar: AppBar(
          title: const Text('QuickGO Partner'),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Text(
                  resolvedMode == PartnerMode.rider ? 'Rider' : 'Vendor',
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 16),
                ),
              ),
            ),
          ],
        ),
        drawer: Drawer(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              DrawerHeader(
                decoration: const BoxDecoration(
                  color: quickGoGreen,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    const CircleAvatar(
                      radius: 30,
                      backgroundColor: Colors.white,
                      child: Icon(Icons.business_center,
                          color: quickGoGreen, size: 30),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'QuickGO Partner',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold),
                    ),
                    Text(
                      session.phone ?? 'Partner session',
                      style:
                          const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
              ListTile(
                leading: const Icon(Icons.help_outline),
                title: const Text('Help & Support'),
                onTap: () {
                  final activeContext = _navigatorKey.currentContext!;
                  Navigator.pop(activeContext); // close drawer
                  Navigator.push(
                    activeContext,
                    MaterialPageRoute(
                        builder: (c) => const PartnerSupportScreen()),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.gavel),
                title: const Text('Policies & Agreements'),
                onTap: () {
                  final activeContext = _navigatorKey.currentContext!;
                  Navigator.pop(activeContext); // close drawer
                  Navigator.push(
                    activeContext,
                    MaterialPageRoute(
                        builder: (c) => PartnerLegalScreen(mode: resolvedMode)),
                  );
                },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.redAccent),
                title: const Text('Logout',
                    style: TextStyle(color: Colors.redAccent)),
                onTap: () async {
                  final dialogContext = _navigatorKey.currentContext!;
                  final confirm = await showDialog<bool>(
                    context: dialogContext,
                    builder: (c) => AlertDialog(
                      title: const Text('Logout?'),
                      content: const Text('Are you sure you want to logout?'),
                      actions: [
                        TextButton(
                            onPressed: () => Navigator.pop(c, false),
                            child: const Text('Cancel')),
                        TextButton(
                            onPressed: () => Navigator.pop(c, true),
                            child: const Text('Logout')),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    if (dialogContext.mounted) {
                      Navigator.pop(dialogContext); // close drawer
                    }
                    ref.read(sessionProvider.notifier).logout();
                    setState(() => _loggedIn = false);
                  }
                },
              ),
            ],
          ),
        ),
        body: resolvedMode == PartnerMode.vendor
            ? ref.watch(vendorProfileProvider).when(
                  data: (profile) {
                    final isVerified = profile['isVerified'] as bool? ?? false;
                    final status =
                        profile['status'] ?? profile['onboardingStatus'] ?? '';
                    if (profile.isEmpty) {
                      return const Center(
                          child: Text(
                              'No vendor profile found. Please contact support.'));
                    }
                    if (!isVerified && status != 'APPROVED') {
                      return const PendingVerificationScreen(
                          mode: PartnerMode.vendor);
                    }
                    return const VendorModeScreen();
                  },
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(child: Text('Error: $err')),
                )
            : ref.watch(riderProfileProvider).when(
                  data: (profile) {
                    final status =
                        profile['status'] ?? profile['onboardingStatus'] ?? '';
                    if (profile.isEmpty) {
                      return const Center(
                          child: Text(
                              'No rider profile found. Please contact support.'));
                    }
                    if (status != 'APPROVED') {
                      return const PendingVerificationScreen(
                          mode: PartnerMode.rider);
                    }
                    return const RiderModeScreen();
                  },
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(child: Text('Error: $err')),
                ),
      );
    }

    return MaterialApp(
      title: 'QuickGO Partner',
      theme: quickGoTheme(),
      navigatorKey: _navigatorKey,
      scaffoldMessengerKey: _scaffoldMessengerKey,
      debugShowCheckedModeBanner: false,
      home: Builder(
        builder: (context) => homeWidget,
      ),
    );
  }
}

class PendingVerificationScreen extends ConsumerWidget {
  const PendingVerificationScreen({super.key, required this.mode});
  final PartnerMode mode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final modeLabel = mode == PartnerMode.vendor ? 'Vendor' : 'Rider';
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.verified_user_outlined,
                size: 80, color: Colors.orangeAccent),
            const SizedBox(height: 24),
            Text(
              'Pending $modeLabel Approval',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text(
              'Your $modeLabel partner profile is pending verification from the QuickGO Operations team. '
              'Please ensure all compliance documents/KYC details have been uploaded in the Profile tab.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 15, color: Colors.grey, height: 1.4),
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              icon: const Icon(Icons.refresh),
              onPressed: () {
                if (mode == PartnerMode.vendor) {
                  ref.invalidate(vendorProfileProvider);
                  ref.invalidate(vendorDashboardProvider);
                } else {
                  ref.invalidate(riderProfileProvider);
                  ref.invalidate(riderDashboardProvider);
                }
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Refreshed status')),
                );
              },
              label: const Text('Refresh Status'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () {
                ref.read(sessionProvider.notifier).logout();
              },
              child: const Text('Logout / Use different number'),
            ),
          ],
        ),
      ),
    );
  }
}
