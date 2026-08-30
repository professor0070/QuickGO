import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';
import '../widgets/product_card.dart';

class CategoryProductsScreen extends ConsumerWidget {
  const CategoryProductsScreen({
    super.key,
    required this.categoryId,
    required this.categoryName,
  });

  final String categoryId;
  final String categoryName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(categoryProductsProvider(categoryId));

    return Scaffold(
      appBar: AppBar(title: Text(categoryName)),
      body: productsAsync.when(
        data: (products) {
          if (products.isEmpty) {
            return const QuickGoEmptyState(
              title: 'No Products Found',
              message: 'There are no items currently available in this category.',
              icon: Icons.search_off,
            );
          }

          return GridView.builder(
            padding: const EdgeInsets.all(12),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 0.67,
            ),
            itemCount: products.length,
            itemBuilder: (context, index) {
              final product = products[index] as Map<String, dynamic>;
              return ProductCard(
                product: product,
                onAddToCart: () async {
                  try {
                    final client = ref.read(apiClientProvider);
                    await client.postMap('/cart/items', {
                      'product_id': product['id'],
                      'quantity': 1,
                    });
                    ref.invalidate(cartProvider);
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${product['name']} added to cart'),
                        backgroundColor: quickGoGreen,
                      ),
                    );
                  } catch (e) {
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Failed to add to cart: $e'),
                        backgroundColor: Colors.redAccent,
                      ),
                    );
                  }
                },
              );
            },
          );
        },
        loading: () => GridView.builder(
          padding: const EdgeInsets.all(12),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.67,
          ),
          itemCount: 4,
          itemBuilder: (context, index) => const Card(
            child: Padding(
              padding: EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: QuickGoSkeleton(width: double.infinity, height: double.infinity)),
                  SizedBox(height: 8),
                  QuickGoSkeleton(width: 100, height: 14),
                  SizedBox(height: 4),
                  QuickGoSkeleton(width: 60, height: 10),
                  SizedBox(height: 8),
                  QuickGoSkeleton(width: double.infinity, height: 28),
                ],
              ),
            ),
          ),
        ),
        error: (err, _) => QuickGoErrorState(
          title: 'Failed to load products',
          message: err.toString(),
          onRetry: () => ref.invalidate(categoryProductsProvider(categoryId)),
        ),
      ),
    );
  }
}
