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
  Future<void> _refreshData() async {
    ref.invalidate(categoriesProvider);
    ref.invalidate(vendorsProvider);
    ref.invalidate(addressesProvider);
    ref.invalidate(cartProvider);
    ref.invalidate(serviceabilityProvider);
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final vendorsAsync = ref.watch(vendorsProvider);
    final addressesAsync = ref.watch(addressesProvider);
    final cartAsync = ref.watch(cartProvider);
    final selectedAddress = ref.watch(selectedAddressProvider);
    final serviceabilityAsync = ref.watch(serviceabilityProvider);
    final serviceable = serviceabilityAsync.valueOrNull?['serviceable'] != false;

    return RefreshIndicator(
      onRefresh: _refreshData,
      color: quickGoGreen,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // Premium Search Bar
          Padding(
            padding: const EdgeInsets.only(bottom: 16.0),
            child: InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const SearchScreen()),
                );
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: quickGoLine),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Row(
                  children: [
                    Icon(Icons.search, color: quickGoTextLight),
                    SizedBox(width: 12),
                    Text(
                      'Search for tomatoes, thalis, dairy...',
                      style: TextStyle(color: quickGoTextLight, fontSize: 15),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Selected Address card
          QuickGoSection(
            title: 'Delivering to',
            children: [
              addressesAsync.when(
                data: (addresses) {
                  if (addresses.isEmpty) {
                    return Row(
                      children: [
                        const Icon(Icons.location_off_outlined, color: Colors.redAccent),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            'No addresses saved yet.',
                            style: TextStyle(color: quickGoTextLight),
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const AddressListScreen()),
                            );
                          },
                          child: const Text('Add Address'),
                        ),
                      ],
                    );
                  }
                  final selected = selectedAddress ??
                      addresses.firstWhere(
                        (a) => a['isDefault'] as bool? ?? false,
                        orElse: () => addresses.first,
                      );
                  if (selectedAddress == null) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      ref.read(selectedAddressProvider.notifier).state = selected;
                    });
                  }
                  return Row(
                    children: [
                      const Icon(Icons.location_on, color: quickGoGreen, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              selected['receiverName'] as String? ?? 'Receiver',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${selected['line1']}, ${selected['city']}',
                              style: const TextStyle(color: quickGoTextLight, fontSize: 14),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const AddressListScreen()),
                          );
                        },
                        child: const Text('Change'),
                      ),
                    ],
                  );
                },
                loading: () => const Row(
                  children: [
                    QuickGoSkeleton(width: 24, height: 24),
                    SizedBox(width: 12),
                    Expanded(child: QuickGoSkeleton(width: 200, height: 16)),
                  ],
                ),
                error: (err, _) => QuickGoErrorState(
                  title: 'Failed to load address',
                  message: err.toString(),
                  onRetry: () => ref.invalidate(addressesProvider),
                ),
              ),
            ],
          ),

          if (!serviceable)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.orangeAccent, size: 30),
                  SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Coming Soon',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.orange,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'We are currently coming soon to your area! Try selecting another address.',
                          style: TextStyle(fontSize: 13, color: Colors.black87),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )
          else ...[
            // Categories List
            QuickGoSection(
              title: 'Browse Categories',
              children: [
                categoriesAsync.when(
                  data: (categories) {
                    if (categories.isEmpty) {
                      return const QuickGoEmptyState(
                        title: 'No Categories',
                        message: 'No categories are currently loaded.',
                      );
                    }
                    return SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: categories.map<Widget>((cat) {
                          final code = cat['code'] as String? ?? 'N/A';
                          final name = cat['name'] as String? ?? code;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8.0),
                            child: ActionChip(
                              onPressed: () {
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
                              label: Text(name),
                              backgroundColor: Colors.white,
                              side: const BorderSide(color: quickGoLine),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                          );
                        }).toList(),
                      ),
                    );
                  },
                  loading: () => SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: List.generate(
                        4,
                        (index) => const Padding(
                          padding: EdgeInsets.only(right: 8.0),
                          child: QuickGoSkeleton(width: 80, height: 32, borderRadius: 8),
                        ),
                      ),
                    ),
                  ),
                  error: (err, _) => Text('Error loading categories: $err'),
                ),
              ],
            ),

            // Local stores section
            QuickGoSection(
              title: 'Top Local Vendors',
              children: [
                vendorsAsync.when(
                  data: (vendors) {
                    if (vendors.isEmpty) {
                      return const QuickGoEmptyState(
                        title: 'No Local Vendors',
                        message: 'Approved vendors will appear here.',
                        icon: Icons.store_mall_directory_outlined,
                      );
                    }
                    return Column(
                      children: vendors.map<Widget>((v) {
                        final shopName = v['shopName'] as String? ?? 'Vendor';
                        final category = v['categoryCode'] as String? ?? '';
                        final isOpen = v['isOpen'] as bool? ?? false;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: quickGoLine),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: ListTile(
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: quickGoSurface,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.storefront, color: quickGoGreen),
                            ),
                            title: Text(
                              shopName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    category,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isOpen ? Colors.green.shade50 : Colors.red.shade50,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    isOpen ? 'OPEN' : 'CLOSED',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: isOpen ? Colors.green : Colors.red,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            trailing: const Icon(Icons.chevron_right, color: quickGoGreen),
                            onTap: () async {
                              try {
                                final client = ref.read(apiClientProvider);
                                final detail = await client.getMap('/catalog/vendors/${v['id']}');
                                final products = detail['products'] as List<dynamic>? ?? const [];

                                if (context.mounted) {
                                  showModalBottomSheet(
                                    context: context,
                                    shape: const RoundedRectangleBorder(
                                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                                    ),
                                    builder: (context) => Container(
                                      padding: const EdgeInsets.all(20),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                shopName,
                                                style: const TextStyle(
                                                  fontSize: 20,
                                                  fontWeight: FontWeight.bold,
                                                  color: quickGoTextDark,
                                                ),
                                              ),
                                              IconButton(
                                                icon: const Icon(Icons.close),
                                                onPressed: () => Navigator.pop(context),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 16),
                                          Expanded(
                                            child: products.isEmpty
                                                ? const QuickGoEmptyState(
                                                    title: 'No Products',
                                                    message: 'This vendor does not have any items listed yet.',
                                                  )
                                                : ListView.builder(
                                                    itemCount: products.length,
                                                    itemBuilder: (context, idx) {
                                                      final product = products[idx] as Map<String, dynamic>;
                                                      final prices = product['prices'] as List<dynamic>? ?? const [];
                                                      final activePrice = prices.isNotEmpty ? prices[0] : null;
                                                      final priceVal = activePrice != null
                                                          ? double.tryParse(activePrice['price'].toString()) ?? 0.0
                                                          : 0.0;

                                                      return ListTile(
                                                        contentPadding: EdgeInsets.zero,
                                                        title: Text(
                                                          product['name'] as String? ?? '',
                                                          style: const TextStyle(fontWeight: FontWeight.w600),
                                                        ),
                                                        subtitle: Text('₹${priceVal.toStringAsFixed(2)} / ${product['unit']}'),
                                                        trailing: const Icon(Icons.add_shopping_cart, color: quickGoGreen),
                                                        onTap: () {
                                                          Navigator.pop(context);
                                                          Navigator.push(
                                                            context,
                                                            MaterialPageRoute(
                                                              builder: (context) => ProductDetailScreen(
                                                                product: {
                                                                  ...product,
                                                                  'vendor': v,
                                                                },
                                                              ),
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
                                  SnackBar(content: Text('Failed to load products: $e')),
                                );
                              }
                            },
                          ),
                        );
                      }).toList(),
                    );
                  },
                  loading: () => Column(
                    children: List.generate(
                      3,
                      (index) => Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            border: Border.all(color: quickGoLine),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Row(
                            children: [
                              QuickGoSkeleton(width: 48, height: 48, borderRadius: 8),
                              SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    QuickGoSkeleton(width: 120, height: 16),
                                    SizedBox(height: 8),
                                    QuickGoSkeleton(width: 80, height: 12),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  error: (err, _) => QuickGoErrorState(
                    title: 'Something went wrong',
                    message: 'Please try again to reload local stores.',
                    onRetry: () => ref.invalidate(vendorsProvider),
                  ),
                ),
              ],
            ),

            // Cart overview
            cartAsync.when(
              data: (cart) {
                final items = cart['items'] as List<dynamic>? ?? const [];
                if (items.isEmpty) {
                  return const SizedBox.shrink();
                }

                double subtotal = 0.0;
                for (final item in items) {
                  final qty = int.tryParse(item['quantity'].toString()) ?? 0;
                  final price = double.tryParse(item['unitPrice'].toString()) ?? 0.0;
                  subtotal += qty * price;
                }

                return Card(
                  color: Colors.green.shade50,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Colors.green.shade200),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        const Icon(Icons.shopping_bag, color: quickGoGreen),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${items.length} Item${items.length > 1 ? 's' : ''} in cart',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Subtotal: ₹${subtotal.toStringAsFixed(2)}',
                                style: const TextStyle(color: quickGoGreen, fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        QuickGoButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const CartScreen()),
                            );
                          },
                          label: 'View Cart',
                          fullWidth: false,
                        ),
                      ],
                    ),
                  ),
                );
              },
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ],
      ),
    );
  }
}
