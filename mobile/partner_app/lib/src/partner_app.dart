import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_partner_app/src/screens/login_screen.dart';
import 'package:quickgo_partner_app/src/screens/rider_mode_screen.dart';
import 'package:quickgo_partner_app/src/screens/vendor_mode_screen.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import 'providers.dart';

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
              body: mode == PartnerMode.vendor
                  ? const VendorModeScreen()
                  : const RiderModeScreen(),
            )
          : LoginScreen(onVerified: () => setState(() => _loggedIn = true)),
    );
  }
}
