import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers.dart';
import 'checkout_screen.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  Future<void> _updateQuantity(
      BuildContext context, WidgetRef ref, String itemId, int quantity) async {
    try {
      final client = ref.read(apiClientProvider);
      await client.patchMap('/cart/items/$itemId', {
        'quantity': quantity,
      });
      ref.invalidate(cartProvider);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update cart: $e')),
      );
    }
  }

  Future<void> _clearCart(BuildContext context, WidgetRef ref) async {
    try {
      final client = ref.read(apiClientProvider);
      await client.clear('/cart'); // Clear helper clears active items
      ref.invalidate(cartProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cart cleared')),
      );
    } catch (e) {
      // Clear fallback if generic clear fails
      try {
        final client = ref.read(apiClientProvider);
        await client.postMap('/cart', {}); // fallback to clear via active route
        ref.invalidate(cartProvider);
      } catch (err) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to clear cart: $err')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartAsync = ref.watch(cartProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Cart'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep_outlined),
            onPressed: () => _clearCart(context, ref),
          ),
        ],
      ),
      body: cartAsync.when(
        data: (cart) {
          final items = cart['items'] as List<dynamic>? ?? const [];
          if (items.isEmpty) {
            return const Center(child: Text('Your cart is empty.'));
          }

          double subtotal = 0.0;
          for (final item in items) {
            final qty = int.tryParse(item['quantity'].toString()) ?? 0;
            final price = double.tryParse(item['unitPrice'].toString()) ?? 0.0;
            subtotal += qty * price;
          }

          return Column(
            children: [
              Expanded(
                child: ListView.builder(
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final item = items[index] as Map<String, dynamic>;
                    final product = item['product'] as Map<String, dynamic>?;
                    final name = product?['name'] as String? ?? 'Product';
                    final qty = int.tryParse(item['quantity'].toString()) ?? 0;
                    final price =
                        double.tryParse(item['unitPrice'].toString()) ?? 0.0;

                    return ListTile(
                      title: Text(name),
                      subtitle: Text('₹${price.toStringAsFixed(2)} x $qty'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline),
                            onPressed: () => _updateQuantity(
                                context, ref, item['id'], qty - 1),
                          ),
                          Text('$qty',
                              style:
                                  const TextStyle(fontWeight: FontWeight.bold)),
                          IconButton(
                            icon: const Icon(Icons.add_circle_outline),
                            onPressed: () => _updateQuantity(
                                context, ref, item['id'], qty + 1),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              Card(
                margin: const EdgeInsets.all(16),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Subtotal:',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16)),
                          Text('₹${subtotal.toStringAsFixed(2)}',
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) => const CheckoutScreen()),
                            );
                          },
                          child: const Text('Proceed to Checkout'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error loading cart: $err')),
      ),
    );
  }
}
