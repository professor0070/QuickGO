import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';
import 'category_products_screen.dart';
import 'cart_screen.dart';
import 'search_screen.dart';
import 'address_list_screen.dart';
import 'product_detail_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final vendorsAsync = ref.watch(vendorsProvider);
    final addressesAsync = ref.watch(addressesProvider);
    final cartAsync = ref.watch(cartProvider);
    final selectedAddress = ref.watch(selectedAddressProvider);
    final serviceabilityAsync = ref.watch(serviceabilityProvider);
    final serviceable =
        serviceabilityAsync.valueOrNull?['serviceable'] != false;

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        // Search Bar Row
        Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: InkWell(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SearchScreen()),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: quickGoLine),
              ),
              child: const Row(
                children: [
                  Icon(Icons.search, color: Colors.grey),
                  SizedBox(width: 12),
                  Text('Search for tomatoes, thalis, dairy...',
                      style: TextStyle(color: Colors.grey)),
                ],
              ),
            ),
          ),
        ),

        // Selected Address Section
        QuickGoSection(
          title: 'Selected Delivery Address',
          children: [
            addressesAsync.when(
              data: (addresses) {
                if (addresses.isEmpty) {
                  return const Text('No address saved yet.');
                }
                final selected = selectedAddress ??
                    addresses.firstWhere(
                        (a) => a['isDefault'] as bool? ?? false,
                        orElse: () => addresses.first);
                if (selectedAddress == null) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    ref.read(selectedAddressProvider.notifier).state = selected;
                  });
                }
                return Text(
                  '${selected['receiverName']} - ${selected['line1']}, ${selected['city']}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                );
              },
              loading: () => const Text('Loading address...'),
              error: (err, _) => Text('Error: $err'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const AddressListScreen()),
                );
              },
              child: const Text('Change/Manage Address'),
            ),
          ],
        ),

        if (!serviceable)
          const QuickGoSection(
            title: 'Service Status',
            children: [Text('Coming soon in your area')],
          )
        else ...[
          // Dynamic Categories Section
          QuickGoSection(
            title: 'Categories',
            children: [
              categoriesAsync.when(
                data: (categories) {
                  if (categories.isEmpty) {
                    return const Text('No categories available.');
                  }
                  return Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: categories.map<Widget>((cat) {
                      final code = cat['code'] as String? ?? 'N/A';
                      final name = cat['name'] as String? ?? code;
                      return InkWell(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => CategoryProductsScreen(
                                categoryId: cat['id'],
                                categoryName: name,
                              ),
                            ),
                          );
                        },
                        child: Chip(
                          label: Text(name),
                          backgroundColor: Colors.white,
                          side: const BorderSide(color: quickGoLine),
                        ),
                      );
                    }).toList(),
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Text('Error loading categories: $err'),
              ),
            ],
          ),

          // Top Local Vendors Section
          QuickGoSection(
            title: 'Top Local Vendors',
            children: [
              vendorsAsync.when(
                data: (vendors) {
                  if (vendors.isEmpty) {
                    return const ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('No vendors loaded yet'),
                      subtitle: Text('Admin-approved vendors appear here.'),
                    );
                  }
                  return Column(
                    children: vendors.map<Widget>((v) {
                      final shopName = v['shopName'] as String? ?? 'Vendor';
                      final category = v['categoryCode'] as String? ?? '';
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading:
                            const Icon(Icons.storefront, color: quickGoGreen),
                        title: Text(shopName,
                            style:
                                const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(category),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () async {
                          try {
                            final client = ref.read(apiClientProvider);
                            final detail = await client
                                .getMap('/catalog/vendors/${v['id']}');
                            final products =
                                detail['products'] as List<dynamic>? ??
                                    const [];

                            if (context.mounted) {
                              showModalBottomSheet(
                                context: context,
                                builder: (context) => Container(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(shopName,
                                          style: const TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.bold)),
                                      const SizedBox(height: 12),
                                      Expanded(
                                        child: products.isEmpty
                                            ? const Center(
                                                child:
                                                    Text('No products listed.'))
                                            : ListView.builder(
                                                itemCount: products.length,
                                                itemBuilder: (context, idx) {
                                                  final product = products[idx]
                                                      as Map<String, dynamic>;
                                                  final prices = product[
                                                              'prices']
                                                          as List<dynamic>? ??
                                                      const [];
                                                  final activePrice =
                                                      prices.isNotEmpty
                                                          ? prices[0]
                                                          : null;
                                                  final priceVal = activePrice !=
                                                          null
                                                      ? double.tryParse(
                                                              activePrice[
                                                                      'price']
                                                                  .toString()) ??
                                                          0.0
                                                      : 0.0;

                                                  return ListTile(
                                                    title: Text(product['name']
                                                            as String? ??
                                                        ''),
                                                    subtitle: Text(
                                                        '₹${priceVal.toStringAsFixed(2)} / ${product['unit']}'),
                                                    trailing: const Icon(
                                                        Icons.add_shopping_cart,
                                                        color: quickGoGreen),
                                                    onTap: () {
                                                      Navigator.pop(context);
                                                      Navigator.push(
                                                        context,
                                                        MaterialPageRoute(
                                                          builder: (context) =>
                                                              ProductDetailScreen(
                                                                  product: {
                                                                ...product,
                                                                'vendor': v,
                                                              }),
                                                        ),
                                                      );
                                                    },
                                                  );
                                                },
                                              ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }
                          } catch (e) {
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                  content: Text('Failed to load products: $e')),
                            );
                          }
                        },
                      );
                    }).toList(),
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Text('Error loading vendors: $err'),
              ),
            ],
          ),

          // Active Cart Overview
          QuickGoSection(
            title: 'Cart Status',
            children: [
              cartAsync.when(
                data: (cart) {
                  final items = cart['items'] as List<dynamic>? ?? const [];
                  if (items.isEmpty) {
                    return const Text(
                        'Your cart is empty. Add fresh veggies or delicious local food!');
                  }
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('${items.length} items in cart',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      FilledButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => const CartScreen()),
                          );
                        },
                        child: const Text('View Cart'),
                      ),
                    ],
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Text('Error: $err'),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
