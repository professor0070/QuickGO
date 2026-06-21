import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers.dart';
import 'address_list_screen.dart';
import 'order_confirmation_screen.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String _paymentMethod = 'COD';
  bool _submitting = false;
  String? _orderAttemptKey;

  Future<void> _placeOrder(
      Map<String, dynamic> cart, Map<String, dynamic> address) async {
    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      _orderAttemptKey ??= 'order-${DateTime.now().millisecondsSinceEpoch}';
      final order = await client.postMap(
          '/orders',
          {
            'address_id': address['id'],
            'payment_method': _paymentMethod,
          },
          idempotencyKey: _orderAttemptKey);

      ref.invalidate(cartProvider);
      ref.invalidate(ordersProvider);
      _orderAttemptKey = null;

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => OrderConfirmationScreen(
            orderNumber: order['orderNumber'] as String? ?? 'N/A',
            totalAmount:
                double.tryParse(order['totalAmount'].toString()) ?? 0.0,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to place order: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartAsync = ref.watch(cartProvider);
    final selectedAddress = ref.watch(selectedAddressProvider);
    final addressesAsync = ref.watch(addressesProvider);

    // Try to auto-select default address if none selected yet
    addressesAsync.whenData((addresses) {
      if (selectedAddress == null && addresses.isNotEmpty) {
        final defAddr = addresses.firstWhere(
            (a) => a['isDefault'] as bool? ?? false,
            orElse: () => addresses.first);
        ref.read(selectedAddressProvider.notifier).state = defAddr;
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: cartAsync.when(
        data: (cart) {
          final items = cart['items'] as List<dynamic>? ?? const [];
          double itemsTotal = 0.0;
          for (final item in items) {
            final qty = int.tryParse(item['quantity'].toString()) ?? 0;
            final price = double.tryParse(item['unitPrice'].toString()) ?? 0.0;
            itemsTotal += qty * price;
          }

          final deliveryFee = 30.0; // Mock delivery fee
          final totalAmount = itemsTotal + deliveryFee;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text('Delivery Address',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (selectedAddress != null) ...[
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.location_on_outlined,
                        color: Colors.green),
                    title: Text(
                        '${selectedAddress['receiverName']} (${selectedAddress['receiverPhone']})'),
                    subtitle: Text(
                        '${selectedAddress['line1']}, ${selectedAddress['city']}'),
                    trailing: TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => AddressListScreen(
                              onSelected: (addr) {
                                ref
                                    .read(selectedAddressProvider.notifier)
                                    .state = addr;
                                Navigator.pop(context);
                              },
                            ),
                          ),
                        );
                      },
                      child: const Text('Change'),
                    ),
                  ),
                ),
              ] else ...[
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const AddressListScreen()),
                    );
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Add/Select Address'),
                ),
              ],
              const Divider(height: 32),
              const Text('Order Summary',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ...items.map<Widget>((item) {
                final product = item['product'] as Map<String, dynamic>?;
                final name = product?['name'] as String? ?? 'Product';
                final qty = int.tryParse(item['quantity'].toString()) ?? 0;
                final price =
                    double.tryParse(item['unitPrice'].toString()) ?? 0.0;

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('$name x $qty',
                          style: const TextStyle(color: Colors.black87)),
                      Text('₹${(qty * price).toStringAsFixed(2)}'),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Delivery Fee:'),
                  Text('₹${deliveryFee.toStringAsFixed(2)}'),
                ],
              ),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Amount:',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Text('₹${totalAmount.toStringAsFixed(2)}',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: Colors.green)),
                ],
              ),
              const Divider(height: 32),
              const Text('Payment Method',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              SegmentedButton<String>(
                selected: {_paymentMethod},
                segments: const [
                  ButtonSegment(value: 'COD', label: Text('COD')),
                  ButtonSegment(
                      value: 'UPI_ON_DELIVERY', label: Text('UPI on Delivery')),
                ],
                onSelectionChanged: (selection) => setState(
                  () => _paymentMethod = selection.first,
                ),
              ),
              const SizedBox(height: 24),
              _submitting
                  ? const Center(child: CircularProgressIndicator())
                  : FilledButton(
                      onPressed: selectedAddress != null
                          ? () => _placeOrder(cart, selectedAddress)
                          : null,
                      child: const Text('Place Order'),
                    ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
