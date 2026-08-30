import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../widgets/go_buddy/go_buddy.dart';
import '../providers.dart';

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  Color _statusColor(String status) {
    switch (status) {
      case 'PLACED':
        return Colors.blue;
      case 'VENDOR_ACCEPTED':
      case 'PREPARING_OR_PACKING':
        return Colors.orange;
      case 'READY_FOR_PICKUP':
      case 'RIDER_ASSIGNED':
      case 'PICKED_UP':
        return Colors.purple;
      case 'DELIVERED':
      case 'COMPLETED':
        return quickGoGreen;
      case 'VENDOR_REJECTED':
      case 'CUSTOMER_CANCELLED':
      case 'ADMIN_CANCELLED':
        return Colors.redAccent;
      default:
        return quickGoTextLight;
    }
  }

  void _showOrderDetails(BuildContext context, WidgetRef ref, Map<String, dynamic> order) {
    final num = order['orderNumber'] as String? ?? 'Order';
    final amount = order['totalAmount'] as String? ?? '0';
    final status = order['status'] as String? ?? 'PLACED';
    final items = order['items'] as List<dynamic>? ?? const [];
    final address = order['deliveryAddress'] as Map<String, dynamic>?;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order #$num',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: quickGoTextDark),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView(
                children: [
                  // Go Buddy Delivery Companion Timeline Row
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _statusColor(status).withOpacity(0.05),
                      border: Border.all(color: _statusColor(status).withOpacity(0.2)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        GoBuddyWidget(
                          pose: mapOrderStatusToGoBuddyPose(status),
                          width: 60,
                          height: 60,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Go Buddy Status',
                                style: TextStyle(fontSize: 12, color: quickGoTextLight),
                              ),
                              Text(
                                status,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: _statusColor(status),
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                status == 'DELIVERED' || status == 'COMPLETED'
                                    ? 'Order successfully delivered!'
                                    : 'Go Buddy is keeping your order safe and on track.',
                                style: const TextStyle(fontSize: 11, color: quickGoTextLight),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Delivery Address
                  if (address != null) ...[
                    const Text('Delivery Address', style: TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark)),
                    const SizedBox(height: 6),
                    Text(
                      '${address['receiverName']} - ${address['line1']}, ${address['city']}',
                      style: const TextStyle(color: quickGoTextLight, fontSize: 13),
                    ),
                    const Divider(height: 24, color: quickGoLine),
                  ],

                  // Items List
                  const Text('Items', style: TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark)),
                  const SizedBox(height: 8),
                  ...items.map<Widget>((item) {
                    final product = item['product'] as Map<String, dynamic>?;
                    final name = product?['name'] as String? ?? 'Product';
                    final qty = int.tryParse(item['quantity'].toString()) ?? 0;
                    final price = double.tryParse(item['unitPrice'].toString()) ?? 0.0;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              '$name x $qty',
                              style: const TextStyle(color: quickGoTextDark),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text('₹${(qty * price).toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    );
                  }),
                  const Divider(height: 24, color: quickGoLine),

                  // Summary details
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount', style: TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark)),
                      Text('₹$amount', style: const TextStyle(fontWeight: FontWeight.bold, color: quickGoGreen, fontSize: 16)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(ordersProvider);

    Future<void> cancelOrder(Map<String, dynamic> order) async {
      final reason = await showDialog<String>(
        context: context,
        builder: (context) {
          final controller = TextEditingController(text: 'Customer requested cancellation');
          return AlertDialog(
            title: const Text('Cancel Order'),
            content: TextField(
              controller: controller,
              decoration: const InputDecoration(labelText: 'Reason'),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Back')),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
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
            const SnackBar(content: Text('Order cancelled successfully')),
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

    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(ordersProvider),
        color: quickGoGreen,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            ordersAsync.when(
              data: (orders) {
                if (orders.isEmpty) {
                  return const SizedBox(
                    height: 400,
                    child: QuickGoEmptyState(
                      title: 'No Orders Yet',
                      message: 'Placed orders and status tracking will appear here.',
                      icon: Icons.receipt_long_outlined,
                    ),
                  );
                }
                return Column(
                  children: orders.map<Widget>((order) {
                    final num = order['orderNumber'] as String? ?? 'QG-Order';
                    final amount = order['totalAmount'] as String? ?? '0';
                    final status = order['status'] as String? ?? 'PLACED';
                    final showCancel = status == 'PLACED';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: quickGoLine),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: const Icon(Icons.receipt_long, color: Colors.indigo),
                        title: Text(
                          'Order #$num',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark),
                        ),
                        subtitle: Text(
                          'Amount: ₹$amount',
                          style: const TextStyle(color: quickGoTextLight),
                        ),
                        trailing: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: _statusColor(status).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                status,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: _statusColor(status),
                                ),
                              ),
                            ),
                            if (showCancel)
                              TextButton(
                                onPressed: () => cancelOrder(order),
                                child: const Text(
                                  'Cancel',
                                  style: TextStyle(color: Colors.redAccent, fontSize: 12),
                                ),
                              ),
                          ],
                        ),
                        onTap: () => _showOrderDetails(context, ref, order),
                      ),
                    );
                  }).toList(),
                );
              },
              loading: () => Column(
                children: List.generate(
                  4,
                  (index) => Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        border: Border.all(color: quickGoLine),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        children: [
                          QuickGoSkeleton(width: 40, height: 40, borderRadius: 8),
                          SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                QuickGoSkeleton(width: 120, height: 16),
                                SizedBox(height: 8),
                                QuickGoSkeleton(width: 80, height: 12),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              error: (err, _) => QuickGoErrorState(
                title: 'Failed to load orders',
                message: err.toString(),
                onRetry: () => ref.invalidate(ordersProvider),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
