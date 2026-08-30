import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../widgets/go_buddy/go_buddy.dart';
import '../providers.dart';
import 'checkout_screen.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  Future<void> _updateQuantity(
      BuildContext context, WidgetRef ref, String itemId, int quantity) async {
    try {
      final client = ref.read(apiClientProvider);
      if (quantity < 0) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Quantity must be positive.')));
        return;
      }
      await client.patchMap('/cart/items/$itemId', {
        'quantity': quantity,
      });
      ref.invalidate(cartProvider);
    } catch (e) {
      if (!context.mounted) return;
      final msg = e.toString().contains('Network') ? 'Network error. Check your connection.' : 'Something went wrong. Please try again.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  Future<void> _clearCart(BuildContext context, WidgetRef ref) async {
    try {
      final client = ref.read(apiClientProvider);
      await client.clear('/cart');
      ref.invalidate(cartProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cart cleared')),
      );
    } catch (e) {
      try {
        final client = ref.read(apiClientProvider);
        await client.postMap('/cart', {});
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
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const GoBuddyWidget(
                      state: GoBuddyState.emptyCart,
                      width: 140,
                      height: 140,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Your Cart is Empty',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: quickGoTextDark,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "Let's add something tasty! Add items from local stores to build your order.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: quickGoTextLight,
                      ),
                    ),
                  ],
                ),
              ),
            );
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
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final item = items[index] as Map<String, dynamic>;
                    final product = item['product'] as Map<String, dynamic>?;
                    final name = product?['name'] as String? ?? 'Product';
                    final qty = int.tryParse(item['quantity'].toString()) ?? 0;
                    final price =
                        double.tryParse(item['unitPrice'].toString()) ?? 0.0;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: quickGoLine),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        title: Text(
                          name,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          '₹${price.toStringAsFixed(2)} x $qty',
                          style: const TextStyle(color: quickGoTextLight, fontSize: 13),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: quickGoGreen),
                              onPressed: () => _updateQuantity(
                                  context, ref, item['id'], qty - 1),
                            ),
                            Text(
                              '$qty',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: quickGoTextDark),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline, color: quickGoGreen),
                              onPressed: () => _updateQuantity(
                                  context, ref, item['id'], qty + 1),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              QuickGoCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Subtotal:',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: quickGoTextDark),
                        ),
                        Text(
                          '₹${subtotal.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: quickGoGreen),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    QuickGoButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (context) => const CheckoutScreen()),
                        );
                      },
                      label: 'Proceed to Checkout',
                      icon: Icons.payment,
                    ),
                  ],
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: quickGoGreen)),
        error: (err, _) => QuickGoErrorState(
          title: 'Failed to load cart',
          message: err.toString(),
          onRetry: () => ref.invalidate(cartProvider),
        ),
      ),
    );
  }
}
