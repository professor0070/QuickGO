import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

class RoleSelectionScreen extends ConsumerStatefulWidget {
  const RoleSelectionScreen({super.key});

  @override
  ConsumerState<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends ConsumerState<RoleSelectionScreen> {
  PartnerMode? _selectedMode;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('QuickGO Partner'),
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(
                Icons.account_circle_outlined,
                size: 80,
                color: quickGoGreen,
              ),
              const SizedBox(height: 24),
              const Text(
                'Continue as',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Choose how you want to use QuickGO Partner for this session.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.black54,
                ),
              ),
              const SizedBox(height: 32),
              // Vendor Option
              Card(
                elevation: _selectedMode == PartnerMode.vendor ? 4 : 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: _selectedMode == PartnerMode.vendor
                        ? quickGoGreen
                        : Colors.transparent,
                    width: 2,
                  ),
                ),
                child: RadioListTile<PartnerMode>(
                  activeColor: quickGoGreen,
                  title: const Text(
                    'Vendor',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Manage your shop, inventory, and vendor orders.'),
                  value: PartnerMode.vendor,
                  groupValue: _selectedMode,
                  onChanged: (mode) => setState(() => _selectedMode = mode),
                ),
              ),
              const SizedBox(height: 16),
              // Rider Option
              Card(
                elevation: _selectedMode == PartnerMode.rider ? 4 : 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: _selectedMode == PartnerMode.rider
                        ? quickGoGreen
                        : Colors.transparent,
                    width: 2,
                  ),
                ),
                child: RadioListTile<PartnerMode>(
                  activeColor: quickGoGreen,
                  title: const Text(
                    'Rider',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Accept delivery assignments and track earnings.'),
                  value: PartnerMode.rider,
                  groupValue: _selectedMode,
                  onChanged: (mode) => setState(() => _selectedMode = mode),
                ),
              ),
              const SizedBox(height: 40),
              FilledButton(
                onPressed: _selectedMode != null
                    ? () {
                        ref.read(sessionProvider.notifier).selectMode(_selectedMode!);
                      }
                    : null,
                style: FilledButton.styleFrom(
                  backgroundColor: quickGoGreen,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Continue',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  ref.read(sessionProvider.notifier).logout();
                },
                child: const Text(
                  'Cancel / Logout',
                  style: TextStyle(color: Colors.redAccent),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
