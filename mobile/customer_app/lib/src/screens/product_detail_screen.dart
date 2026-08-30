import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';
import '../utils.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({
    super.key,
    required this.product,
  });

  final Map<String, dynamic> product;

  @override
  ConsumerState<ProductDetailScreen> createState() =>
      _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int _quantity = 1;
  bool _submitting = false;

  Future<void> _addToCart() async {
    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.postMap('/cart/items', {
        'product_id': widget.product['id'],
        'quantity': _quantity,
      });
      ref.invalidate(cartProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${widget.product['name']} added to cart')),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to add to cart: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.product['name'] as String? ?? 'Product Details';
    final description =
        widget.product['description'] as String? ?? 'No description available.';
    final unit = widget.product['unit'] as String? ?? 'unit';
    final isAvailable = widget.product['isAvailable'] as bool? ?? true;

    final prices = widget.product['prices'] as List<dynamic>? ?? const [];
    final activePrice = prices.isNotEmpty ? prices[0] : null;
    final priceVal = activePrice != null
        ? double.tryParse(activePrice['price'].toString()) ?? 0.0
        : 0.0;
    final mrpVal = widget.product['mrp'] != null
        ? double.tryParse(widget.product['mrp'].toString()) ?? priceVal
        : priceVal;

    final vendor = widget.product['vendor'] as Map<String, dynamic>?;
    final shopName = vendor?['shopName'] as String? ?? 'Local Partner';

    final discount = mrpVal > priceVal ? mrpVal - priceVal : 0.0;
    final discountPercent = mrpVal > priceVal ? ((mrpVal - priceVal) / mrpVal * 100).round() : 0;

    return Scaffold(
      appBar: AppBar(title: Text(name)),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        children: [
          // Image placeholder block
          Container(
            height: 240,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: quickGoLine),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: (widget.product['imageUrl'] != null && (widget.product['imageUrl'] as String).isNotEmpty)
                  ? Image.network(
                      resolveMediaUrl(
                        widget.product['imageUrl'],
                        ref.read(apiClientProvider).baseUrl,
                      ),
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => const Center(
                        child: Icon(
                          Icons.broken_image_outlined,
                          size: 80,
                          color: quickGoTextLight,
                        ),
                      ),
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return const Center(
                          child: CircularProgressIndicator(),
                        );
                      },
                    )
                  : const Center(
                      child: Icon(
                        Icons.shopping_bag_outlined,
                        size: 80,
                        color: quickGoTextLight,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 20),

          // Detail Section
          QuickGoCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: quickGoTextDark,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.storefront, size: 16, color: quickGoGreen),
                    const SizedBox(width: 6),
                    Text(
                      'Sold by: $shopName',
                      style: const TextStyle(fontSize: 14, color: quickGoGreen, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                const Divider(height: 24, color: quickGoLine),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      '₹${priceVal.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: quickGoGreen,
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (discount > 0.0) ...[
                      Text(
                        '₹${mrpVal.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 16,
                          color: quickGoTextLight,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '$discountPercent% OFF',
                          style: const TextStyle(
                            color: Colors.red,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Unit: $unit',
                  style: const TextStyle(color: quickGoTextLight, fontSize: 14),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Description Section
          QuickGoSection(
            title: 'Description',
            children: [
              Text(
                description,
                style: const TextStyle(fontSize: 15, color: quickGoTextDark, height: 1.4),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Purchase section
          if (isAvailable) ...[
            QuickGoCard(
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Quantity:',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: quickGoTextDark),
                      ),
                      Row(
                        children: [
                          IconButton(
                            onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                            icon: const Icon(Icons.remove_circle_outline, color: quickGoGreen),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                            decoration: BoxDecoration(
                              border: Border.all(color: quickGoLine),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '$_quantity',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: quickGoTextDark),
                            ),
                          ),
                          IconButton(
                            onPressed: () => setState(() => _quantity++),
                            icon: const Icon(Icons.add_circle_outline, color: quickGoGreen),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  QuickGoButton(
                    onPressed: _addToCart,
                    isLoading: _submitting,
                    label: 'Add to Cart',
                    icon: Icons.add_shopping_cart,
                  ),
                ],
              ),
            ),
          ] else
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 28),
                  SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      'This product is currently out of stock. Please check back later.',
                      style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
