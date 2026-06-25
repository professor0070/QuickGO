import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_partner_app/src/screens/login_screen.dart';
import 'package:quickgo_partner_app/src/screens/rider_mode_screen.dart';
import 'package:quickgo_partner_app/src/screens/vendor_mode_screen.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import 'providers.dart';
import 'screens/partner_support_screen.dart';
import 'screens/partner_legal_screen.dart';

enum PartnerMode { vendor, rider }

class PartnerApp extends ConsumerStatefulWidget {
  const PartnerApp({super.key});

  @override
  ConsumerState<PartnerApp> createState() => _PartnerAppState();
}

class _PartnerAppState extends ConsumerState<PartnerApp> {
  var _loggedIn = false;
  var _mode = PartnerMode.vendor;

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final canUseVendor = session.isVendor;
    final canUseRider = session.isRider;
    final canSwitchModes = canUseVendor && canUseRider;
    final mode = canSwitchModes
        ? _mode
        : canUseRider
            ? PartnerMode.rider
            : PartnerMode.vendor;

    return MaterialApp(
      title: 'QuickGO Partner',
      theme: quickGoTheme(),
      home: _loggedIn
          ? Scaffold(
              appBar: AppBar(
                title: const Text('QuickGO Partner'),
                actions: [
                  if (canSwitchModes)
                    SegmentedButton<PartnerMode>(
                      showSelectedIcon: false,
                      segments: const [
                        ButtonSegment(
                          value: PartnerMode.vendor,
                          label: Text('Vendor'),
                        ),
                        ButtonSegment(
                          value: PartnerMode.rider,
                          label: Text('Rider'),
                        ),
                      ],
                      selected: {mode},
                      onSelectionChanged: (selection) =>
                          setState(() => _mode = selection.first),
                    )
                  else
                    Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: Center(
                        child: Text(
                          canUseRider ? 'Rider' : 'Vendor',
                          style: const TextStyle(fontWeight: FontWeight.w600),
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
                            child: Icon(Icons.business_center, color: quickGoGreen, size: 30),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'QuickGO Partner',
                            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            session.phone ?? 'Partner session',
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    ListTile(
                      leading: const Icon(Icons.help_outline),
                      title: const Text('Help & Support'),
                      onTap: () {
                        Navigator.pop(context); // close drawer
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (c) => const PartnerSupportScreen()),
                        );
                      },
                    ),
                    ListTile(
                      leading: const Icon(Icons.gavel),
                      title: const Text('Policies & Agreements'),
                      onTap: () {
                        Navigator.pop(context); // close drawer
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (c) => PartnerLegalScreen(mode: mode)),
                        );
                      },
                    ),
                    const Divider(),
                    ListTile(
                      leading: const Icon(Icons.logout, color: Colors.redAccent),
                      title: const Text('Logout', style: TextStyle(color: Colors.redAccent)),
                      onTap: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (c) => AlertDialog(
                            title: const Text('Logout?'),
                            content: const Text('Are you sure you want to logout?'),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                              TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Logout')),
                            ],
                          ),
                        );
                        if (confirm == true) {
                          ref.read(sessionProvider.notifier).logout();
                          setState(() => _loggedIn = false);
                          if (context.mounted) {
                            Navigator.pop(context); // close drawer if open
                          }
                        }
                      },
                    ),
                  ],
                ),
              ),
              body: mode == PartnerMode.vendor
                  ? const VendorModeScreen()
                  : const RiderModeScreen(),
            )
          : LoginScreen(onVerified: () => setState(() => _loggedIn = true)),
    );
  }
}
