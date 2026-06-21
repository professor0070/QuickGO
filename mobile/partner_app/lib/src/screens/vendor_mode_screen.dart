import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

class VendorModeScreen extends ConsumerStatefulWidget {
  const VendorModeScreen({super.key});

  @override
  ConsumerState<VendorModeScreen> createState() => _VendorModeScreenState();
}

class _VendorModeScreenState extends ConsumerState<VendorModeScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  var _submitting = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _toggleShopStatus(bool val) async {
    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.patchMap('/vendor/shop-status', {'is_open': val});
      ref.invalidate(vendorDashboardProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(val ? 'Store Opened' : 'Store Closed')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update shop status: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _updateAvailability(String productId, bool val) async {
    try {
      final client = ref.read(apiClientProvider);
      await client.patchMap(
          '/vendor/products/$productId/availability', {'is_available': val});
      ref.invalidate(vendorProductsProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update availability: $e')),
      );
    }
  }

  Future<void> _deleteProduct(String productId) async {
    try {
      final client = ref.read(apiClientProvider);
      await client.delete('/vendor/products/$productId');
      ref.invalidate(vendorProductsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Product deleted successfully')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to delete product: $e')),
      );
    }
  }

  Future<void> _handleOrderAction(String orderId, String action,
      {Map<String, dynamic>? extraBody}) async {
    try {
      final client = ref.read(apiClientProvider);
      if (action == 'accept') {
        await client.postMap(
          '/vendor/orders/$orderId/accept',
          {},
          idempotencyKey:
              'accept-$orderId-${DateTime.now().millisecondsSinceEpoch}',
        );
      } else if (action == 'reject') {
        await client.postMap(
          '/vendor/orders/$orderId/reject',
          extraBody ?? {'reason': 'Item unavailable'},
          idempotencyKey:
              'reject-$orderId-${DateTime.now().millisecondsSinceEpoch}',
        );
      } else if (action == 'preparing') {
        await client.postMap('/vendor/orders/$orderId/preparing', {});
      } else if (action == 'ready') {
        await client.postMap('/vendor/orders/$orderId/ready', {});
      }
      ref.invalidate(vendorOrdersProvider);
      ref.invalidate(vendorDashboardProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Order updated successfully')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Action failed: $e')),
      );
    }
  }

  void _showRejectDialog(String orderId) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject Order'),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(labelText: 'Reason for rejection'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _handleOrderAction(orderId, 'reject',
                  extraBody: {'reason': reasonController.text});
            },
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  void _showProductForm({Map<String, dynamic>? product}) {
    final nameController = TextEditingController(text: product?['name']);
    final unitController =
        TextEditingController(text: product?['unit'] ?? 'kg');
    final priceController = TextEditingController(
        text: product?['prices'] != null &&
                (product!['prices'] as List).isNotEmpty
            ? product['prices'][0]['price'].toString()
            : '100');
    final mrpController =
        TextEditingController(text: product?['mrp']?.toString() ?? '100');
    final descController = TextEditingController(text: product?['description']);
    final catIdController =
        TextEditingController(text: product?['categoryId'] ?? 'cat-1');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 16,
          left: 16,
          right: 16,
        ),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(
              product == null ? 'Create Product' : 'Edit Product',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Name')),
            TextField(
                controller: unitController,
                decoration:
                    const InputDecoration(labelText: 'Unit (e.g. kg, g, pcs)')),
            TextField(
                controller: priceController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Price')),
            TextField(
                controller: mrpController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'MRP')),
            TextField(
                controller: descController,
                decoration: const InputDecoration(labelText: 'Description')),
            if (product == null)
              TextField(
                  controller: catIdController,
                  decoration:
                      const InputDecoration(labelText: 'Category Code or ID')),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(this.context);
                final price = double.tryParse(priceController.text) ?? 0.0;
                final mrp = double.tryParse(mrpController.text) ?? price;
                if (price > mrp) {
                  messenger.showSnackBar(const SnackBar(
                      content: Text('Price cannot be greater than MRP')));
                  return;
                }
                Navigator.pop(context);
                try {
                  final client = ref.read(apiClientProvider);
                  if (product == null) {
                    // Try listing categories first to grab an ID or use catIdController
                    var catId = catIdController.text;
                    try {
                      final categories =
                          await client.getList('/catalog/categories');
                      if (categories.isNotEmpty) {
                        catId = categories[0]['id'];
                      }
                    } catch (_) {}

                    await client.postMap('/vendor/products', {
                      'category_id': catId,
                      'name': nameController.text,
                      'unit': unitController.text,
                      'price': price,
                      'mrp': mrp,
                      'description': descController.text,
                    });
                  } else {
                    await client.patchMap('/vendor/products/${product['id']}', {
                      'name': nameController.text,
                      'unit': unitController.text,
                      'price': price,
                      'mrp': mrp,
                      'description': descController.text,
                    });
                  }
                  ref.invalidate(vendorProductsProvider);
                } catch (e) {
                  messenger.showSnackBar(
                    SnackBar(content: Text('Failed to save product: $e')),
                  );
                }
              },
              child: const Text('Save Product'),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(vendorDashboardProvider);
    final ordersAsync = ref.watch(vendorOrdersProvider);
    final productsAsync = ref.watch(vendorProductsProvider);
    final profileAsync = ref.watch(vendorProfileProvider);
    final complianceAsync = ref.watch(vendorComplianceProvider);

    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: TabBar(
          controller: _tabController,
          labelColor: quickGoGreen,
          unselectedLabelColor: Colors.grey,
          indicatorColor: quickGoGreen,
          tabs: const [
            Tab(icon: Icon(Icons.dashboard), text: 'Dashboard'),
            Tab(icon: Icon(Icons.shopping_bag), text: 'Orders'),
            Tab(icon: Icon(Icons.inventory_2), text: 'Catalog'),
            Tab(icon: Icon(Icons.person), text: 'Profile'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Dashboard Tab
          RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(vendorDashboardProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                dashboardAsync.when(
                  data: (data) {
                    final isOpen = data['shop_open'] as bool? ?? false;
                    final pending = data['new_orders'] ?? 0;
                    final preparing = data['preparing_or_packing'] ?? 0;
                    final ready = data['ready_for_pickup'] ?? 0;
                    final today = data['today_orders'] ?? 0;
                    final earnings = double.tryParse(
                            data['today_earning_estimate']?.toString() ??
                                '0') ??
                        0.0;

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Card(
                          child: SwitchListTile(
                            title: Text(
                              isOpen ? 'Store is Open' : 'Store is Closed',
                              style:
                                  const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            value: isOpen,
                            onChanged: _submitting ? null : _toggleShopStatus,
                            activeThumbColor: quickGoGreen,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text('Daily Aggregates',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        GridView.count(
                          shrinkWrap: true,
                          crossAxisCount: 2,
                          childAspectRatio: 1.5,
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 8,
                          physics: const NeverScrollableScrollPhysics(),
                          children: [
                            _buildStatCard(
                                'Pending Orders', '$pending', Colors.orange),
                            _buildStatCard(
                                'Preparing', '$preparing', Colors.blue),
                            _buildStatCard(
                                'Ready for Pickup', '$ready', Colors.green),
                            _buildStatCard(
                                'Total Today', '$today', Colors.purple),
                          ],
                        ),
                        const SizedBox(height: 20),
                        const Text('Earnings Summary (Read-Only)',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Card(
                          color: Colors.green.shade50,
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Today\'s Payout Est:',
                                    style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600)),
                                Text('₹${earnings.toStringAsFixed(2)}',
                                    style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.green)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, _) =>
                      Center(child: Text('Error loading stats: $err')),
                ),
              ],
            ),
          ),

          // Orders Tab
          RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(vendorOrdersProvider);
            },
            child: ordersAsync.when(
              data: (orders) {
                if (orders.isEmpty) {
                  return const Center(
                      child: Text('No orders assigned to you yet.'));
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: orders.length,
                  itemBuilder: (context, idx) {
                    final order = orders[idx] as Map<String, dynamic>;
                    final status = order['status'] as String? ?? 'PLACED';
                    final num = order['orderNumber'] as String? ?? '';
                    final total = double.tryParse(
                            order['totalAmount']?.toString() ?? '0') ??
                        0.0;
                    final items = order['items'] as List<dynamic>? ?? const [];

                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Order #$num',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15)),
                                Chip(
                                    label: Text(status,
                                        style: const TextStyle(fontSize: 11))),
                              ],
                            ),
                            const Divider(),
                            ...items.map<Widget>((i) {
                              final prodName =
                                  i['product']?['name'] as String? ?? 'Product';
                              final qty = i['quantity'] ?? 0;
                              return Text('$prodName x $qty');
                            }),
                            const SizedBox(height: 8),
                            Text('Total Amount: ₹${total.toStringAsFixed(2)}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                            const SizedBox(height: 12),
                            if (status == 'PLACED') ...[
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: () =>
                                          _showRejectDialog(order['id']),
                                      child: const Text('Reject'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: () => _handleOrderAction(
                                          order['id'], 'accept'),
                                      child: const Text('Accept'),
                                    ),
                                  ),
                                ],
                              ),
                            ] else if (status == 'VENDOR_ACCEPTED') ...[
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton(
                                  onPressed: () => _handleOrderAction(
                                      order['id'], 'preparing'),
                                  child: const Text('Mark Preparing/Packing'),
                                ),
                              ),
                            ] else if (status == 'PREPARING_OR_PACKING') ...[
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton(
                                  onPressed: () =>
                                      _handleOrderAction(order['id'], 'ready'),
                                  child: const Text('Ready for Pickup'),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Center(child: Text('Error: $err')),
            ),
          ),

          // Catalog Management Tab
          Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _showProductForm(),
                    icon: const Icon(Icons.add),
                    label: const Text('Create New Product'),
                  ),
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(vendorProductsProvider);
                  },
                  child: productsAsync.when(
                    data: (products) {
                      if (products.isEmpty) {
                        return const Center(
                            child: Text(
                                'No products found. Add products to get started.'));
                      }
                      return ListView.builder(
                        itemCount: products.length,
                        itemBuilder: (context, idx) {
                          final product = products[idx] as Map<String, dynamic>;
                          final name = product['name'] as String? ?? '';
                          final isAvailable =
                              product['isAvailable'] as bool? ?? true;
                          final prices =
                              product['prices'] as List<dynamic>? ?? const [];
                          final activePrice =
                              prices.isNotEmpty ? prices[0] : null;
                          final priceVal = activePrice != null
                              ? double.tryParse(
                                      activePrice['price'].toString()) ??
                                  0.0
                              : 0.0;
                          final mrpVal = product['mrp'] != null
                              ? double.tryParse(product['mrp'].toString()) ??
                                  priceVal
                              : priceVal;

                          return ListTile(
                            leading: const Icon(Icons.shopping_bag_outlined),
                            title: Text(name),
                            subtitle: Text(
                                '₹${priceVal.toStringAsFixed(2)} / ₹${mrpVal.toStringAsFixed(2)} - ${product['unit']}'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Switch(
                                  value: isAvailable,
                                  onChanged: (val) =>
                                      _updateAvailability(product['id'], val),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit,
                                      color: Colors.blue),
                                  onPressed: () =>
                                      _showProductForm(product: product),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete,
                                      color: Colors.red),
                                  onPressed: () =>
                                      _deleteProduct(product['id']),
                                ),
                              ],
                            ),
                          );
                        },
                      );
                    },
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (err, _) => Center(child: Text('Error: $err')),
                  ),
                ),
              ),
            ],
          ),

          // Profile & Compliance Tab
          RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(vendorProfileProvider);
              ref.invalidate(vendorComplianceProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                profileAsync.when(
                  data: (profile) {
                    final shopName = profile['shopName'] as String? ?? '';
                    final ownerName = profile['ownerName'] as String? ?? '';
                    final addressLine = profile['addressLine'] as String? ?? '';
                    final city = profile['city'] as String? ?? '';
                    final state = profile['state'] as String? ?? '';
                    final isVerified = profile['isVerified'] as bool? ?? false;

                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Store Info',
                                    style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold)),
                                Chip(
                                  label: Text(isVerified
                                      ? 'Verified'
                                      : 'Pending Verification'),
                                  backgroundColor: isVerified
                                      ? Colors.green.shade100
                                      : Colors.orange.shade100,
                                ),
                              ],
                            ),
                            const Divider(height: 24),
                            Text('Shop Name: $shopName',
                                style: const TextStyle(
                                    fontSize: 15, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 6),
                            Text('Owner Name: $ownerName'),
                            const SizedBox(height: 6),
                            Text('Address: $addressLine, $city, $state'),
                          ],
                        ),
                      ),
                    );
                  },
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, _) =>
                      Center(child: Text('Error loading profile: $err')),
                ),
                const SizedBox(height: 16),
                const Text('Compliance Documents Status',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                complianceAsync.when(
                  data: (docs) {
                    if (docs.isEmpty) {
                      return const Card(
                        child: Padding(
                          padding: EdgeInsets.all(16.0),
                          child: Text('No compliance documents uploaded yet.'),
                        ),
                      );
                    }
                    return Column(
                      children: docs.map<Widget>((d) {
                        final type = d['type'] as String? ?? 'DOCUMENT';
                        final status = d['status'] as String? ?? 'PENDING';
                        return Card(
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          child: ListTile(
                            leading: const Icon(Icons.description_outlined),
                            title: Text(type),
                            trailing: Chip(
                              label: Text(status,
                                  style: const TextStyle(fontSize: 11)),
                              backgroundColor: status == 'APPROVED'
                                  ? Colors.green.shade100
                                  : Colors.orange.shade100,
                            ),
                          ),
                        );
                      }).toList(),
                    );
                  },
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(child: Text('Error: $err')),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {
                    ref.read(sessionProvider.notifier).logout();
                    Navigator.of(context).popUntil((route) => route.isFirst);
                  },
                  icon: const Icon(Icons.logout),
                  label: const Text('Logout'),
                  style: ElevatedButton.styleFrom(foregroundColor: Colors.red),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String val, Color color) {
    return Card(
      elevation: 2,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border(left: BorderSide(color: color, width: 4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(title,
                style: const TextStyle(color: Colors.grey, fontSize: 12)),
            const SizedBox(height: 4),
            Text(val,
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
          ],
        ),
      ),
    );
  }
}
