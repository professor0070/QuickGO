import 'package:flutter/material.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.product,
    required this.onAddToCart,
  });

  final Map<String, dynamic> product;
  final VoidCallback onAddToCart;

  @override
  Widget build(BuildContext context) {
    final name = product['name'] as String? ?? 'Product';
    final unit = product['unit'] as String? ?? 'unit';
    final isAvailable = product['isAvailable'] as bool? ?? true;
    final isApproved = product['isApproved'] as bool? ?? true;

    final prices = product['prices'] as List<dynamic>? ?? const [];
    final activePrice = prices.isNotEmpty ? prices[0] : null;
    final priceVal = activePrice != null
        ? double.tryParse(activePrice['price'].toString()) ?? 0.0
        : 0.0;
    final mrpVal = product['mrp'] != null
        ? double.tryParse(product['mrp'].toString()) ?? priceVal
        : priceVal;

    final hasDiscount = mrpVal > priceVal;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Container(
                color: Colors.grey.shade100,
                width: double.infinity,
                child: const Icon(Icons.shopping_bag_outlined,
                    size: 40, color: Colors.grey),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            Text(
              unit,
              style: const TextStyle(color: Colors.grey, fontSize: 11),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Text(
                  '₹${priceVal.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: Colors.green,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                if (hasDiscount) ...[
                  const SizedBox(width: 4),
                  Text(
                    '₹${mrpVal.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Colors.grey,
                      decoration: TextDecoration.lineThrough,
                      fontSize: 10,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: double.infinity,
              height: 28,
              child: isAvailable && isApproved
                  ? FilledButton(
                      style: FilledButton.styleFrom(
                        padding: EdgeInsets.zero,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4)),
                      ),
                      onPressed: onAddToCart,
                      child: const Text('Add to Cart',
                          style: TextStyle(fontSize: 11)),
                    )
                  : OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.zero,
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4)),
                      ),
                      onPressed: null,
                      child: const Text('Out of Stock',
                          style: TextStyle(fontSize: 11)),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
