import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_customer_app/src/screens/cart_screen.dart';
import 'package:quickgo_customer_app/src/screens/home_screen.dart';
import 'package:quickgo_customer_app/src/screens/legal_screen.dart';
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
  final _navigatorKey = GlobalKey<NavigatorState>();
  final _scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

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
      _scaffoldMessengerKey.currentState?.showSnackBar(
        SnackBar(
          content: Text(body.isNotEmpty ? '$title: $body' : title),
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: 'View',
            onPressed: () {
              _navigatorKey.currentState?.push(
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

    final cartAsync = ref.watch(cartProvider);
    final cartItems = cartAsync.valueOrNull?['items'] as List<dynamic>? ?? const [];
    final cartItemCount = cartItems.fold<int>(
      0,
      (sum, item) => sum + ((item['quantity'] as num?)?.toInt() ?? 1),
    );

    return MaterialApp(
      title: 'QuickGO',
      theme: quickGoTheme(),
      navigatorKey: _navigatorKey,
      scaffoldMessengerKey: _scaffoldMessengerKey,
      home: loggedIn
          ? Scaffold(
              appBar: AppBar(
                centerTitle: true,
                title: const Text('QuickGO'),
                actions: [
                  // Cart Icon with Badge
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.shopping_cart_outlined),
                        tooltip: 'Cart',
                        onPressed: () {
                          _navigatorKey.currentState?.push(
                            MaterialPageRoute(
                              builder: (_) => const CartScreen(),
                            ),
                          );
                        },
                      ),
                      if (cartItemCount > 0)
                        Positioned(
                          right: 6,
                          top: 6,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: quickGoGreen,
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(
                              minWidth: 16,
                              minHeight: 16,
                            ),
                            child: Text(
                              cartItemCount > 99 ? '99+' : '$cartItemCount',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 4),
                  // Notification Icon with Badge
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.notifications_outlined),
                        tooltip: 'Notifications',
                        onPressed: () {
                          _navigatorKey.currentState?.push(
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
                            constraints: const BoxConstraints(
                              minWidth: 16,
                              minHeight: 16,
                            ),
                            child: Text(
                              unreadCount > 9 ? '9+' : '$unreadCount',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 8),
                ],
              ),
              drawer: _CustomerDrawer(
                onSelectTab: (index) {
                  setState(() => _tabIndex = index);
                },
                navigatorKey: _navigatorKey,
              ),
              body: IndexedStack(
                index: _tabIndex,
                children: const [
                  HomeScreen(),
                  OrdersScreen(),
                  ProfileScreen(),
                ],
              ),
              bottomNavigationBar: QuickGoAnimatedBottomNav(
                selectedIndex: _tabIndex,
                onTap: (index) => setState(() => _tabIndex = index),
              ),
            )
          : LoginScreen(onVerified: () {}),
    );
  }
}

class _CustomerDrawer extends ConsumerWidget {
  const _CustomerDrawer({
    required this.onSelectTab,
    required this.navigatorKey,
  });

  final ValueChanged<int> onSelectTab;
  final GlobalKey<NavigatorState> navigatorKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final phone = session.phone ?? 'Customer';
    final cleaned = phone.replaceAll('+', '').replaceAll(' ', '');
    final avatarChar = cleaned.isNotEmpty ? cleaned[0] : 'C';

    return Drawer(
      child: Column(
        children: [
          // Drawer Header
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(
              color: quickGoGreen,
            ),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                avatarChar,
                style: const TextStyle(
                  color: quickGoGreen,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            accountName: const Text(
              'QuickGO Customer',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            accountEmail: Text(
              phone,
              style: const TextStyle(fontSize: 13, color: Colors.white70),
            ),
          ),
          // Drawer Items List
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                // 1. My Profile
                ListTile(
                  leading: const Icon(Icons.person_outline, color: quickGoGreen),
                  title: const Text('My Profile', style: TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab(2);
                  },
                ),
                // 2. Help & Support
                ListTile(
                  leading: const Icon(Icons.help_outline, color: quickGoGreen),
                  title: const Text('Help & Support', style: TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(context);
                    navigatorKey.currentState?.push(
                      MaterialPageRoute(builder: (_) => const SupportScreen()),
                    );
                  },
                ),
                // 3. FAQ
                ListTile(
                  leading: const Icon(Icons.quiz_outlined, color: quickGoGreen),
                  title: const Text('FAQ', style: TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(context);
                    navigatorKey.currentState?.push(
                      MaterialPageRoute(builder: (_) => const SupportScreen()),
                    );
                  },
                ),
                // 4. Contact Us
                ListTile(
                  leading: const Icon(Icons.phone_outlined, color: quickGoGreen),
                  title: const Text('Contact Us', style: TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(context);
                    navigatorKey.currentState?.push(
                      MaterialPageRoute(builder: (_) => const SupportScreen()),
                    );
                  },
                ),
                // 5. Terms & Privacy
                ListTile(
                  leading: const Icon(Icons.description_outlined, color: quickGoGreen),
                  title: const Text('Terms & Privacy', style: TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(context);
                    navigatorKey.currentState?.push(
                      MaterialPageRoute(builder: (_) => const LegalScreen()),
                    );
                  },
                ),
                // 6. Rate App
                ListTile(
                  leading: const Icon(Icons.star_outline, color: quickGoGreen),
                  title: const Text('Rate App', style: TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Thank you for rating QuickGO!')),
                    );
                  },
                ),
                // 7. About QuickGO
                ListTile(
                  leading: const Icon(Icons.info_outline, color: quickGoGreen),
                  title: const Text('About QuickGO', style: TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(context);
                    showAboutDialog(
                      context: context,
                      applicationName: 'QuickGO',
                      applicationVersion: '1.0.0 (Production Release)',
                      applicationIcon: const Icon(Icons.flash_on, color: quickGoGreen, size: 36),
                      children: const [
                        Text('QuickGO Ultra-Fast Hyperlocal Delivery Platform.'),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
          // Divider separating items from Logout
          const Divider(height: 1, color: quickGoLine),
          // Separated Logout at bottom
          SafeArea(
            top: false,
            child: ListTile(
              leading: const Icon(Icons.logout, color: Colors.redAccent),
              title: const Text(
                'Logout',
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.redAccent),
              ),
              onTap: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Logout?'),
                    content: const Text('Are you sure you want to logout from QuickGO?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Cancel'),
                      ),
                      FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Logout'),
                      ),
                    ],
                  ),
                );

                if (confirm == true) {
                  if (context.mounted) {
                    Navigator.pop(context);
                  }
                  ref.read(sessionProvider.notifier).logout();
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}

class QuickGoAnimatedBottomNav extends StatelessWidget {
  const QuickGoAnimatedBottomNav({
    super.key,
    required this.selectedIndex,
    required this.onTap,
  });

  final int selectedIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    const double barHeight = 64;
    final double bottomPadding = MediaQuery.of(context).padding.bottom;
    final double totalHeight = barHeight + bottomPadding;

    final items = [
      const _NavTab(
        label: 'Home',
        activeIcon: Icons.home_rounded,
        inactiveIcon: Icons.home_outlined,
      ),
      const _NavTab(
        label: 'Orders',
        activeIcon: Icons.receipt_long_rounded,
        inactiveIcon: Icons.receipt_long_outlined,
      ),
      const _NavTab(
        label: 'Profile',
        activeIcon: Icons.person_rounded,
        inactiveIcon: Icons.person_outlined,
      ),
    ];

    return Container(
      height: totalHeight,
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 8,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        bottom: true,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double barWidth = constraints.maxWidth;
            final double itemWidth = barWidth / items.length;
            final double pillWidth = itemWidth - 16;
            final double pillHeight = 48;

            return Stack(
              children: [
                // Sliding pill background container
                AnimatedPositioned(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOutBack,
                  left: (selectedIndex * itemWidth) + 8,
                  top: (barHeight - pillHeight) / 2,
                  width: pillWidth,
                  height: pillHeight,
                  child: Container(
                    decoration: BoxDecoration(
                      color: quickGoPrimary.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
                // Icon and labels row
                Row(
                  children: List.generate(items.length, (index) {
                    final item = items[index];
                    final isActive = index == selectedIndex;

                    return Expanded(
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => onTap(index),
                        child: Semantics(
                          label: '${item.label} Tab',
                          selected: isActive,
                          child: SizedBox(
                            height: barHeight,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                TweenAnimationBuilder<double>(
                                  tween: Tween<double>(
                                    begin: 1.0,
                                    end: isActive ? 1.15 : 1.0,
                                  ),
                                  duration: const Duration(milliseconds: 220),
                                  curve: Curves.easeOutBack,
                                  builder: (context, scale, child) {
                                    return Transform.scale(
                                      scale: scale,
                                      child: Icon(
                                        isActive ? item.activeIcon : item.inactiveIcon,
                                        color: isActive ? quickGoPrimary : quickGoTextLight,
                                        size: 24,
                                      ),
                                    );
                                  },
                                ),
                                const SizedBox(height: 2),
                                AnimatedDefaultTextStyle(
                                  duration: const Duration(milliseconds: 200),
                                  style: TextStyle(
                                    color: isActive ? quickGoPrimary : quickGoTextLight,
                                    fontSize: 11,
                                    fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                                  ),
                                  child: Text(item.label),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _NavTab {
  const _NavTab({
    required this.label,
    required this.activeIcon,
    required this.inactiveIcon,
  });

  final String label;
  final IconData activeIcon;
  final IconData inactiveIcon;
}
