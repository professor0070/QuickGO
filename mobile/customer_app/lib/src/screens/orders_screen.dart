import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(ordersProvider);

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
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.receipt_long, color: Colors.indigo),
                      title: Text('Order #$num'),
                      subtitle: Text('Total Amount: Rs $amount'),
                      trailing: Chip(
                        label: Text(
                          status,
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
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
