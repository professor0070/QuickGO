import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers.dart';

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

    return Scaffold(
      appBar: AppBar(title: Text(name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            height: 200,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.shopping_bag_outlined,
                size: 80, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          Text(name,
              style:
                  const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          Text('Sold by: $shopName',
              style: const TextStyle(fontSize: 14, color: Colors.indigo)),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                '₹${priceVal.toStringAsFixed(2)}',
                style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.green),
              ),
              const SizedBox(width: 8),
              if (discount > 0.0) ...[
                Text(
                  '₹${mrpVal.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'Save ₹${discount.toStringAsFixed(2)}',
                    style: const TextStyle(
                        color: Colors.red,
                        fontSize: 11,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ],
          ),
          Text('Unit: $unit',
              style: const TextStyle(color: Colors.grey, fontSize: 13)),
          const Divider(height: 32),
          const Text('Description',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(description,
              style: const TextStyle(fontSize: 14, color: Colors.black87)),
          const SizedBox(height: 24),
          if (isAvailable) ...[
            Row(
              children: [
                const Text('Quantity:',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(width: 16),
                IconButton(
                  onPressed:
                      _quantity > 1 ? () => setState(() => _quantity--) : null,
                  icon: const Icon(Icons.remove_circle_outline),
                ),
                Text('$_quantity',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(
                  onPressed: () => setState(() => _quantity++),
                  icon: const Icon(Icons.add_circle_outline),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _submitting
                ? const Center(child: CircularProgressIndicator())
                : FilledButton(
                    onPressed: _addToCart,
                    child: const Text('Add to Cart'),
                  ),
          ] else
            const Card(
              color: Colors.redAccent,
              child: Padding(
                padding: EdgeInsets.all(12.0),
                child: Text(
                  'This product is currently out of stock.',
                  style: TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
