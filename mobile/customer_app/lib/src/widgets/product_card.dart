import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';
import '../utils.dart';

class ProductCard extends ConsumerWidget {
  const ProductCard({
    super.key,
    required this.product,
    required this.onAddToCart,
  });

  final Map<String, dynamic> product;
  final VoidCallback onAddToCart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rawName = product['name'] as String? ?? 'Product';
    final name = rawName
        .replaceAll(RegExp(r'^\d+[\.\:\-\s]+'), '')
        .replaceAll(RegExp(r'^\[\d+\]\s*'), '');

    final rawUnit = product['unit'] as String? ?? '';
    final cleanUnit = (rawUnit.isEmpty || rawUnit.toLowerCase() == 'unit') ? '' : rawUnit;
    final description = product['description'] as String? ?? '';
    final subText = description.isNotEmpty ? description : cleanUnit;

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
    final discountPercent = hasDiscount ? ((mrpVal - priceVal) / mrpVal * 100).round() : 0;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {}, // Default click handler for card
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  children: [
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: quickGoSurface,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: (product['imageUrl'] != null && (product['imageUrl'] as String).isNotEmpty)
                            ? Image.network(
                                resolveMediaUrl(
                                  product['imageUrl'],
                                  ref.read(apiClientProvider).baseUrl,
                                ),
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => const Center(
                                  child: Icon(
                                    Icons.broken_image_outlined,
                                    size: 40,
                                    color: quickGoTextLight,
                                  ),
                                ),
                                loadingBuilder: (context, child, loadingProgress) {
                                  if (loadingProgress == null) return child;
                                  return const Center(
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  );
                                },
                              )
                            : const Center(
                                child: Icon(
                                  Icons.shopping_bag_outlined,
                                  size: 40,
                                  color: quickGoTextLight,
                                ),
                              ),
                      ),
                    ),
                    if (hasDiscount)
                      Positioned(
                        top: 6,
                        left: 6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.redAccent,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '$discountPercent% OFF',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: quickGoTextDark,
                ),
              ),
              if (subText.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  subText,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: quickGoTextLight, fontSize: 12),
                ),
              ],
              const SizedBox(height: 6),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Row(
                  children: [
                    Text(
                      '₹${priceVal.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: quickGoGreen,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    if (hasDiscount) ...[
                      const SizedBox(width: 6),
                      Text(
                        '₹${mrpVal.toStringAsFixed(2)}',
                        style: const TextStyle(
                          color: quickGoTextLight,
                          decoration: TextDecoration.lineThrough,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 32,
                child: isAvailable && isApproved
                    ? FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: quickGoGreen,
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                        onPressed: onAddToCart,
                        child: const Text(
                          'Add',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      )
                    : OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          padding: EdgeInsets.zero,
                          foregroundColor: Colors.grey,
                          side: const BorderSide(color: Colors.grey),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                        onPressed: null,
                        child: const Text(
                          'OOS',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
