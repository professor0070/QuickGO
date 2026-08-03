import 'package:flutter/material.dart';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import 'package:image_picker/image_picker.dart';
import 'package:quickgo_shared_api/quickgo_api_client.dart';
import '../providers.dart';
import '../widgets/partner_profile_card.dart';
import 'partner_navigation.dart';

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
    final initialTab = ref.read(vendorTabIndexProvider);
    _tabController = TabController(length: 4, vsync: this, initialIndex: initialTab);
    _tabController.addListener(() {
      if (!mounted) return;
      final currentProviderVal = ref.read(vendorTabIndexProvider);
      if (currentProviderVal != _tabController.index) {
        ref.read(vendorTabIndexProvider.notifier).state = _tabController.index;
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _submitComplianceDocument() async {
    final typeController = TextEditingController(text: 'FSSAI');
    final docNumberController = TextEditingController();
    String? selectedImagePath;

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Submit Compliance Document'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: typeController,
                  decoration: const InputDecoration(
                    labelText: 'Document type',
                    hintText: 'FSSAI, GST, PAN, AADHAAR, SHOP_LICENSE',
                  ),
                ),
                TextField(
                  controller: docNumberController,
                  decoration: const InputDecoration(labelText: 'Document Number (Optional)'),
                ),
                const SizedBox(height: 16),
                if (selectedImagePath != null) ...[
                  Text('Selected File: ${selectedImagePath!.split('/').last}', style: const TextStyle(fontSize: 12, color: Colors.green)),
                  const SizedBox(height: 8),
                ],
                ElevatedButton.icon(
                  icon: const Icon(Icons.photo_library),
                  onPressed: () async {
                    final picker = ImagePicker();
                    final file = await picker.pickImage(source: ImageSource.gallery);
                    if (file != null) {
                      setDialogState(() {
                        selectedImagePath = file.path;
                      });
                    }
                  },
                  label: const Text('Choose Document Image'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: selectedImagePath == null
                  ? null
                  : () => Navigator.pop(context, true),
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );

    if (result != true || selectedImagePath == null) return;

    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.uploadFile(
        '/partner/documents/upload',
        selectedImagePath!,
        'file',
        {
          'type': typeController.text.trim(),
          'reason': 'Vendor Compliance Upload',
          if (docNumberController.text.trim().isNotEmpty) 'document_number': docNumberController.text.trim(),
        },
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Compliance document submitted successfully!')),
      );
      ref.invalidate(vendorComplianceProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _submitting = false);
    }
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
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ProductFormDialog(
        client: ref.read(apiClientProvider),
        ref: ref,
        product: product,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int>(vendorTabIndexProvider, (previous, next) {
      if (_tabController.index != next) {
        _tabController.animateTo(next);
      }
    });

    final dashboardAsync = ref.watch(vendorDashboardProvider);
    final ordersAsync = ref.watch(vendorOrdersProvider);
    final productsAsync = ref.watch(vendorProductsProvider);
    final profileAsync = ref.watch(vendorProfileProvider);
    final complianceAsync = ref.watch(vendorComplianceProvider);

    return Scaffold(
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
                    final userMap = profile['user'] as Map<String, dynamic>?;
                    final avatarUrl = userMap?['avatarUrl'] as String?;

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        PartnerProfileCard(
                          name: ownerName.isNotEmpty ? ownerName : 'Vendor Owner',
                          phone: userMap?['phone'] as String? ?? profile['ownerPhone'] as String? ?? '',
                          roleLabel: 'Vendor',
                          avatarUrl: avatarUrl,
                          isVerified: isVerified,
                          onUploadSuccess: () {
                            ref.invalidate(vendorProfileProvider);
                          },
                        ),
                        const SizedBox(height: 16),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Wrap(
                                  alignment: WrapAlignment.spaceBetween,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  spacing: 8,
                                  runSpacing: 4,
                                  children: [
                                    const Text('Store Info',
                                        style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold)),
                                    Chip(
                                      label: Text(
                                        isVerified
                                            ? 'Verified'
                                            : 'Pending Verification',
                                        style: const TextStyle(fontSize: 12),
                                      ),
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
                        ),
                      ],
                    );
                  },
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, _) =>
                      Center(child: Text('Error loading profile: $err')),
                ),
                const SizedBox(height: 16),
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    const Text('Compliance Documents Status',
                        style:
                            TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    TextButton.icon(
                      icon: const Icon(Icons.upload_file),
                      onPressed: _submitting ? null : _submitComplianceDocument,
                      label: const Text('Upload Document'),
                    ),
                  ],
                ),
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
      bottomNavigationBar: QuickGoPartnerAnimatedBottomNav(
        selectedIndex: ref.watch(vendorTabIndexProvider),
        onTap: (index) {
          _tabController.animateTo(index);
          ref.read(vendorTabIndexProvider.notifier).state = index;
        },
        items: const [
          NavTabItem(
            label: 'Dashboard',
            activeIcon: Icons.dashboard_rounded,
            inactiveIcon: Icons.dashboard_outlined,
          ),
          NavTabItem(
            label: 'Orders',
            activeIcon: Icons.receipt_long_rounded,
            inactiveIcon: Icons.receipt_long_outlined,
          ),
          NavTabItem(
            label: 'Catalog',
            activeIcon: Icons.storefront_rounded,
            inactiveIcon: Icons.storefront_outlined,
          ),
          NavTabItem(
            label: 'Profile',
            activeIcon: Icons.person_rounded,
            inactiveIcon: Icons.person_outlined,
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

class _ProductFormDialog extends StatefulWidget {
  const _ProductFormDialog({
    required this.client,
    required this.ref,
    this.product,
  });

  final QuickGoApiClient client;
  final WidgetRef ref;
  final Map<String, dynamic>? product;

  @override
  State<_ProductFormDialog> createState() => _ProductFormDialogState();
}

class _ProductFormDialogState extends State<_ProductFormDialog> {
  late TextEditingController _nameController;
  late TextEditingController _unitController;
  late TextEditingController _priceController;
  late TextEditingController _mrpController;
  late TextEditingController _descController;

  String? _selectedCategoryId;
  List<dynamic> _categories = [];
  bool _loadingCategories = true;

  String? _pickedLocalImagePath;
  String? _uploadedImageUrl;
  bool _uploadingImage = false;
  bool _savingProduct = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.product?['name']);
    _unitController = TextEditingController(text: widget.product?['unit'] ?? 'pcs');
    _priceController = TextEditingController(
      text: widget.product?['prices'] != null && (widget.product!['prices'] as List).isNotEmpty
          ? widget.product!['prices'][0]['price'].toString()
          : '100',
    );
    _mrpController = TextEditingController(
      text: widget.product?['mrp']?.toString() ?? '100',
    );
    _descController = TextEditingController(text: widget.product?['description']);
    _selectedCategoryId = widget.product?['categoryId'];
    _uploadedImageUrl = widget.product?['imageUrl'];

    _fetchCategories();
  }

  Future<void> _fetchCategories() async {
    try {
      final list = await widget.client.getList('/catalog/categories');
      if (mounted) {
        setState(() {
          _categories = list;
          _loadingCategories = false;
          if (_selectedCategoryId == null && _categories.isNotEmpty) {
            _selectedCategoryId = _categories[0]['id'];
          }
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadingCategories = false;
        });
      }
    }
  }

  String _resolveUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    final base = widget.client.baseUrl.replaceAll('/api/v1', '');
    return '$base${path.startsWith('/') ? '' : '/'}$path';
  }

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    try {
      final file = await picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );
      if (file == null) return;

      final size = await file.length();
      if (size > 5 * 1024 * 1024) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Image file too large (max 5MB)')),
        );
        return;
      }

      if (widget.product != null) {
        // Edit mode: upload immediately
        setState(() {
          _uploadingImage = true;
        });
        try {
          final res = await widget.client.uploadFile(
            '/vendor/products/${widget.product!['id']}/image',
            file.path,
            'file',
            {'reason': 'Product image update'},
          );
          if (mounted) {
            setState(() {
              _uploadedImageUrl = res['imageUrl'];
              _uploadingImage = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Image uploaded successfully')),
            );
          }
        } catch (e) {
          if (mounted) {
            setState(() {
              _uploadingImage = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Image upload failed: $e')),
            );
          }
        }
      } else {
        // Create mode: store path for upload during submission
        setState(() {
          _pickedLocalImagePath = file.path;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking image: $e')),
        );
      }
    }
  }

  Future<void> _clearImage() async {
    if (widget.product != null) {
      setState(() {
        _uploadingImage = true;
      });
      try {
        await widget.client.patchMap('/vendor/products/${widget.product!['id']}', {
          'image_url': '',
        });
        if (mounted) {
          setState(() {
            _uploadedImageUrl = null;
            _uploadingImage = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Image removed')),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() {
            _uploadingImage = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to remove image: $e')),
          );
        }
      }
    } else {
      setState(() {
        _pickedLocalImagePath = null;
      });
    }
  }

  Future<void> _save() async {
    final price = double.tryParse(_priceController.text) ?? 0.0;
    final mrp = double.tryParse(_mrpController.text) ?? price;

    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Product name is required')),
      );
      return;
    }

    if (price <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Price must be greater than zero')),
      );
      return;
    }

    if (price > mrp) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Price cannot be greater than MRP')),
      );
      return;
    }

    if (_selectedCategoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a category')),
      );
      return;
    }

    setState(() {
      _savingProduct = true;
    });

    try {
      if (widget.product == null) {
        // Create Mode
        final res = await widget.client.postMap('/vendor/products', {
          'category_id': _selectedCategoryId,
          'name': _nameController.text.trim(),
          'unit': _unitController.text.trim(),
          'price': price,
          'mrp': mrp,
          'description': _descController.text.trim(),
        });

        final createdProductId = res['id'];

        if (_pickedLocalImagePath != null && createdProductId != null) {
          await widget.client.uploadFile(
            '/vendor/products/$createdProductId/image',
            _pickedLocalImagePath!,
            'file',
            {'reason': 'Product creation image upload'},
          );
        }
      } else {
        // Edit Mode
        await widget.client.patchMap('/vendor/products/${widget.product!['id']}', {
          'name': _nameController.text.trim(),
          'unit': _unitController.text.trim(),
          'price': price,
          'mrp': mrp,
          'description': _descController.text.trim(),
          'image_url': _uploadedImageUrl ?? '',
        });
      }

      if (mounted) {
        widget.ref.invalidate(vendorProductsProvider);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _savingProduct = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save product: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool hasImage = _pickedLocalImagePath != null || (_uploadedImageUrl != null && _uploadedImageUrl!.isNotEmpty);

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        top: 24,
        left: 20,
        right: 20,
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.product == null ? 'Create Product' : 'Edit Product',
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

              Center(
                child: Container(
                  height: 140,
                  width: 140,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: quickGoLine),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        if (_pickedLocalImagePath != null)
                          Image.file(
                            File(_pickedLocalImagePath!),
                            fit: BoxFit.cover,
                            height: 140,
                            width: 140,
                          )
                        else if (_uploadedImageUrl != null && _uploadedImageUrl!.isNotEmpty)
                          Image.network(
                            _resolveUrl(_uploadedImageUrl),
                            fit: BoxFit.cover,
                            height: 140,
                            width: 140,
                            errorBuilder: (context, error, stackTrace) => const Icon(
                              Icons.broken_image_outlined,
                              size: 40,
                              color: Colors.redAccent,
                            ),
                          )
                        else
                          const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.add_a_photo_outlined,
                                size: 36,
                                color: quickGoTextLight,
                              ),
                              SizedBox(height: 8),
                              Text(
                                'Add Photo',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: quickGoTextLight,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        if (_uploadingImage)
                          Container(
                            color: Colors.black38,
                            child: const CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton.icon(
                    icon: const Icon(Icons.camera_alt_outlined, size: 16),
                    label: const Text('Camera'),
                    onPressed: _uploadingImage ? null : () => _pickImage(ImageSource.camera),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.photo_library_outlined, size: 16),
                    label: const Text('Gallery'),
                    onPressed: _uploadingImage ? null : () => _pickImage(ImageSource.gallery),
                  ),
                  if (hasImage) ...[
                    const SizedBox(width: 12),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.delete_outline, size: 16, color: Colors.redAccent),
                      label: const Text('Remove', style: TextStyle(color: Colors.redAccent)),
                      onPressed: _uploadingImage ? null : _clearImage,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.redAccent),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 20),

              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Product Name',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              if (widget.product == null) ...[
                _loadingCategories
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: CircularProgressIndicator(),
                        ),
                      )
                    : DropdownButtonFormField<String>(
                        value: _selectedCategoryId,
                        decoration: const InputDecoration(
                          labelText: 'Product Category',
                          border: OutlineInputBorder(),
                        ),
                        items: _categories.map<DropdownMenuItem<String>>((c) {
                          return DropdownMenuItem<String>(
                            value: c['id'],
                            child: Text(c['name'] ?? 'Category'),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedCategoryId = val;
                          });
                        },
                      ),
                const SizedBox(height: 16),
              ],

              TextField(
                controller: _unitController,
                decoration: const InputDecoration(
                  labelText: 'Unit (e.g. kg, g, pcs)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _priceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Price (INR)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextField(
                      controller: _mrpController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'MRP (INR)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              TextField(
                controller: _descController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),

              if (_savingProduct)
                const Padding(
                  padding: EdgeInsets.only(bottom: 16),
                  child: LinearProgressIndicator(color: quickGoPrimary),
                ),

              FilledButton(
                onPressed: _savingProduct || _uploadingImage ? null : _save,
                style: FilledButton.styleFrom(
                  backgroundColor: quickGoPrimary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(
                  widget.product == null ? 'Create Product' : 'Save Product',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
