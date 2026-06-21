import 'package:flutter/material.dart';
import 'package:quickgo_partner_app/src/screens/login_screen.dart';
import 'package:quickgo_partner_app/src/screens/rider_mode_screen.dart';
import 'package:quickgo_partner_app/src/screens/vendor_mode_screen.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';

enum PartnerMode { vendor, rider }

class PartnerApp extends StatefulWidget {
  const PartnerApp({super.key});

  @override
  State<PartnerApp> createState() => _PartnerAppState();
}

class _PartnerAppState extends State<PartnerApp> {
  var _loggedIn = false;
  var _mode = PartnerMode.vendor;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuickGO Partner',
      theme: quickGoTheme(),
      home: _loggedIn
          ? Scaffold(
              appBar: AppBar(
                title: const Text('QuickGO Partner'),
                actions: [
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
                    selected: {_mode},
                    onSelectionChanged: (selection) =>
                        setState(() => _mode = selection.first),
                  ),
                ],
              ),
              body: _mode == PartnerMode.vendor
                  ? const VendorModeScreen()
                  : const RiderModeScreen(),
            )
          : LoginScreen(onVerified: () => setState(() => _loggedIn = true)),
    );
  }
}

