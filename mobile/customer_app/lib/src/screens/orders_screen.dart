import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(ordersProvider);

    Future<void> cancelOrder(Map<String, dynamic> order) async {
      final reason = await showDialog<String>(
        context: context,
        builder: (context) {
          final controller = TextEditingController(text: 'Customer requested cancellation');
          return AlertDialog(
            title: const Text('Cancel order'),
            content: TextField(
              controller: controller,
              decoration: const InputDecoration(labelText: 'Reason'),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Back')),
              FilledButton(
                onPressed: () => Navigator.pop(context, controller.text.trim()),
                child: const Text('Cancel Order'),
              ),
            ],
          );
        },
      );
      if (reason == null || reason.isEmpty) return;

      try {
        final client = ref.read(apiClientProvider);
        await client.postMap(
          '/orders/${order['id']}/cancel',
          {'reason': reason},
          idempotencyKey: 'cancel-${order['id']}-${DateTime.now().millisecondsSinceEpoch}',
        );
        ref.invalidate(ordersProvider);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Order cancelled')),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to cancel order: $e')),
          );
        }
      }
    }

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        QuickGoSection(
          title: 'My Orders',
          children: [
            ordersAsync.when(
              data: (orders) {
                if (orders.isEmpty) {
                  return const ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('No orders yet'),
                    subtitle: Text('Placed orders and status tracking appear here.'),
                  );
                }
                return Column(
                  children: orders.map<Widget>((order) {
                    final num = order['orderNumber'] as String? ?? 'QG-Order';
                    final amount = order['totalAmount'] as String? ?? '0';
                    final status = order['status'] as String? ?? 'PLACED';
                    return Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        leading: const Icon(Icons.receipt_long, color: Colors.indigo),
                        title: Text('Order #$num'),
                        subtitle: Text('Total Amount: Rs $amount'),
                        trailing: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Chip(
                              label: Text(
                                status,
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                            if (status == 'PLACED')
                              TextButton(
                                onPressed: () => cancelOrder(order),
                                child: const Text('Cancel'),
                              ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Text('Error loading orders: $err'),
            ),
          ],
        ),
      ],
    );
  }
}
