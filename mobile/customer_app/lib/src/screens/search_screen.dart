import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';
import 'product_detail_screen.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(searchQueryProvider.notifier).state = '';
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onSearchChanged(String val) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (mounted) {
        ref.read(searchQueryProvider.notifier).state = val;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(searchedProductsProvider);
    final query = ref.watch(searchQueryProvider);

    return Scaffold(
      appBar: AppBar(
        title: Container(
          height: 40,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          child: TextField(
            controller: _controller,
            autofocus: true,
            style: const TextStyle(
              color: quickGoTextDark,
              fontSize: 16,
              fontWeight: FontWeight.normal,
            ),
            cursorColor: quickGoPrimary,
            decoration: InputDecoration(
              hintText: 'Search food, fruits, vegetables...',
              hintStyle: const TextStyle(
                color: quickGoTextLight,
                fontSize: 14,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              filled: false,
              suffixIcon: ValueListenableBuilder<TextEditingValue>(
                valueListenable: _controller,
                builder: (context, value, child) {
                  if (value.text.isEmpty) {
                    return const SizedBox.shrink();
                  }
                  return IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    icon: const Icon(Icons.clear, color: quickGoTextLight, size: 20),
                    onPressed: () {
                      _controller.clear();
                      _onSearchChanged('');
                    },
                  );
                },
              ),
            ),
            onChanged: _onSearchChanged,
          ),
        ),
      ),
      body: query.length < 2
          ? const Center(child: Text('Type at least 2 characters to search.'))
          : productsAsync.when(
              data: (products) {
                if (products.isEmpty) {
                  return const Center(child: Text('No products found matching query.'));
                }

                return ListView.builder(
                  itemCount: products.length,
                  itemBuilder: (context, index) {
                    final product = products[index] as Map<String, dynamic>;
                    final name = product['name'] as String? ?? 'Product';
                    final prices = product['prices'] as List<dynamic>? ?? const [];
                    final activePrice = prices.isNotEmpty ? prices[0] : null;
                    final priceVal = activePrice != null ? double.tryParse(activePrice['price'].toString()) ?? 0.0 : 0.0;

                    return ListTile(
                      leading: const Icon(Icons.search),
                      title: Text(name),
                      subtitle: Text('₹${priceVal.toStringAsFixed(2)}'),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => ProductDetailScreen(product: product),
                          ),
                        );
                      },
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Center(child: Text('Error: $err')),
            ),
    );
  }
}
