import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

class RiderModeScreen extends ConsumerStatefulWidget {
  const RiderModeScreen({super.key});

  @override
  ConsumerState<RiderModeScreen> createState() => _RiderModeScreenState();
}

class _RiderModeScreenState extends ConsumerState<RiderModeScreen> {
  var _online = false;
  var _submitting = false;

  Future<void> _toggleOnlineStatus(bool val) async {
    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.patchMap('/partner/rider/online-status', {'is_online': val});
      setState(() => _online = val);
      ref.invalidate(riderDashboardProvider);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update online status: $e')),
      );
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(riderDashboardProvider);

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        QuickGoSection(
          title: 'Rider Home',
          children: [
            if (_submitting)
              const LinearProgressIndicator()
            else
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _online,
                onChanged: _toggleOnlineStatus,
                title: const Text('Online'),
              ),
            dashboardAsync.when(
              data: (data) {
                final assigned = data['assignedCount'] ?? 0;
                final picked = data['pickedCount'] ?? 0;
                final delivered = data['deliveredCount'] ?? 0;

                return Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Chip(label: Text('Assigned: $assigned')),
                    Chip(label: Text('Picked Up: $picked')),
                    Chip(label: Text('Delivered Today: $delivered')),
                  ],
                );
              },
              loading: () => const Text('Loading stats...'),
              error: (err, _) => Text('Dashboard error: $err'),
            ),
          ],
        ),
        QuickGoSection(
          title: 'Assigned Orders',
          children: [
            const ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('No assigned orders'),
              subtitle: Text('Pickup and drop details appear here.'),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton(onPressed: () {}, child: const Text('Call Vendor')),
                OutlinedButton(onPressed: () {}, child: const Text('Call Customer')),
                OutlinedButton(onPressed: () {}, child: const Text('Open Maps')),
              ],
            ),
          ],
        ),
        QuickGoSection(
          title: 'Delivery Actions',
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton(onPressed: () {}, child: const Text('Picked Up')),
                FilledButton(onPressed: () {}, child: const Text('Delivered')),
                OutlinedButton(
                  onPressed: () {},
                  child: const Text('Payment Collected'),
                ),
                OutlinedButton(onPressed: () {}, child: const Text('Report Issue')),
              ],
            ),
          ],
        ),
      ],
    );
  }
}
