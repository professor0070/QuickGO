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
      await client.patchMap('/rider/online-status', {'is_online': val});
      if (!mounted) return;
      setState(() => _online = val);
      ref.invalidate(riderDashboardProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update online status: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _markPickedUp(String orderId) async {
    await _runOrderAction(
      () => ref
          .read(apiClientProvider)
          .postMap('/rider/orders/$orderId/picked-up', {}),
    );
  }

  Future<void> _markDelivered(String orderId) async {
    await _runOrderAction(
      () => ref.read(apiClientProvider).postMap(
            '/rider/orders/$orderId/delivered',
            {},
            idempotencyKey:
                'delivered-$orderId-${DateTime.now().millisecondsSinceEpoch}',
          ),
    );
  }

  Future<void> _markPaymentCollected(Map<String, dynamic> order) async {
    final amountController =
        TextEditingController(text: order['totalAmount']?.toString() ?? '0');
    final amount = await showDialog<double>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Payment Collected'),
        content: TextField(
          controller: amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Amount collected'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(
                context, double.tryParse(amountController.text.trim())),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    if (amount == null || amount <= 0) return;

    final orderId = order['id'] as String;
    await _runOrderAction(
      () => ref.read(apiClientProvider).postMap(
            '/rider/orders/$orderId/payment-collected',
            {'amount': amount, 'note': 'Collected by rider'},
            idempotencyKey:
                'rider-payment-$orderId-${DateTime.now().millisecondsSinceEpoch}',
          ),
    );
  }

  Future<void> _reportIssue(Map<String, dynamic> order) async {
    final controller = TextEditingController();
    final description = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Report Delivery Issue'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Issue details'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Report'),
          ),
        ],
      ),
    );
    if (description == null || description.isEmpty) return;

    await _runOrderAction(
      () => ref.read(apiClientProvider).postMap('/rider/issues', {
        'order_id': order['id'],
        'subject': 'Rider delivery issue',
        'description': description,
        'priority': 'HIGH',
      }),
    );
  }

  Future<void> _runOrderAction(Future<dynamic> Function() action) async {
    setState(() => _submitting = true);
    try {
      await action();
      ref.invalidate(riderOrdersProvider);
      ref.invalidate(riderDashboardProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Order updated')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Action failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(riderDashboardProvider);
    final ordersAsync = ref.watch(riderOrdersProvider);

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
                final assigned = data['assigned_orders'] ?? 0;
                final picked = data['picked_up'] ?? 0;
                final delivered = data['delivered_today'] ?? 0;

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
            ordersAsync.when(
              data: (orders) {
                if (orders.isEmpty) {
                  return const ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('No assigned orders'),
                    subtitle: Text('Pickup and drop details appear here.'),
                  );
                }
                return Column(
                  children: orders.map<Widget>((raw) {
                    final order = raw as Map<String, dynamic>;
                    final status = order['status'] as String? ?? '';
                    final vendor = order['vendor'] as Map<String, dynamic>?;
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Order #${order['orderNumber']}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text('Status: $status'),
                            Text(
                                'Pickup: ${vendor?['shopName'] ?? 'Vendor'} - ${vendor?['addressLine'] ?? ''}'),
                            Text(
                                'Drop: ${(order['deliveryAddressSnapshot'] as Map?)?['line1'] ?? 'Customer address'}'),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                if (status == 'RIDER_ASSIGNED')
                                  FilledButton(
                                    onPressed: () => _markPickedUp(order['id']),
                                    child: const Text('Picked Up'),
                                  ),
                                if (status == 'PICKED_UP')
                                  FilledButton(
                                    onPressed: () =>
                                        _markDelivered(order['id']),
                                    child: const Text('Delivered'),
                                  ),
                                if (status == 'DELIVERED' ||
                                    status == 'PAYMENT_PENDING')
                                  OutlinedButton(
                                    onPressed: () =>
                                        _markPaymentCollected(order),
                                    child: const Text('Payment Collected'),
                                  ),
                                OutlinedButton(
                                  onPressed: () => _reportIssue(order),
                                  child: const Text('Report Issue'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Text('Orders error: $err'),
            ),
          ],
        ),
      ],
    );
  }
}
