import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers.dart';

class RiderModeScreen extends ConsumerStatefulWidget {
  const RiderModeScreen({super.key});

  @override
  ConsumerState<RiderModeScreen> createState() => _RiderModeScreenState();
}

class _RiderModeScreenState extends ConsumerState<RiderModeScreen> {
  var _submitting = false;

  Future<void> _toggleOnlineStatus(bool val) async {
    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.patchMap('/rider/online-status', {'is_online': val});
      ref.invalidate(riderDashboardProvider);
      ref.invalidate(riderProfileProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(val ? 'You are online' : 'You are offline')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update online status: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _editProfile(Map<String, dynamic> profile) async {
    final nameController =
        TextEditingController(text: profile['name']?.toString() ?? '');
    final vehicleTypeController =
        TextEditingController(text: profile['vehicleType']?.toString() ?? '');
    final vehicleNumberController =
        TextEditingController(text: profile['vehicleNumber']?.toString() ?? '');

    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rider Profile'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Name'),
              ),
              TextField(
                controller: vehicleTypeController,
                decoration: const InputDecoration(labelText: 'Vehicle type'),
              ),
              TextField(
                controller: vehicleNumberController,
                decoration:
                    const InputDecoration(labelText: 'Vehicle number'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, {
              'name': nameController.text.trim(),
              'vehicle_type': vehicleTypeController.text.trim(),
              'vehicle_number': vehicleNumberController.text.trim(),
            }),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (result == null) return;

    await _runAction(
      () => ref.read(apiClientProvider).patchMap('/rider/profile', result),
      successMessage: 'Profile updated',
      refresh: () {
        ref.invalidate(riderProfileProvider);
        ref.invalidate(riderDashboardProvider);
      },
    );
  }

  Future<void> _submitKycDocument() async {
    final typeController = TextEditingController(text: 'ID_PROOF');
    final urlController = TextEditingController();
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Submit KYC Document'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: typeController,
                decoration:
                    const InputDecoration(labelText: 'Document type'),
              ),
              TextField(
                controller: urlController,
                decoration:
                    const InputDecoration(labelText: 'Document URL/reference'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, {
              'type': typeController.text.trim(),
              'document_url': urlController.text.trim(),
            }),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    if (result == null ||
        result['type']!.isEmpty ||
        result['document_url']!.isEmpty) {
      return;
    }

    await _runAction(
      () => ref.read(apiClientProvider).postMap('/rider/kyc-documents', result),
      successMessage: 'KYC document submitted',
      refresh: () => ref.invalidate(riderKycDocumentsProvider),
    );
  }

  Future<void> _acceptOrder(String orderId) async {
    await _runOrderAction(
      () => ref.read(apiClientProvider).postMap(
            '/rider/orders/$orderId/accept',
            {},
            idempotencyKey:
                'rider-accept-$orderId-${DateTime.now().millisecondsSinceEpoch}',
          ),
    );
  }

  Future<void> _rejectOrder(String orderId) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject Assigned Order'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Reason'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
    if (reason == null || reason.isEmpty) return;

    await _runOrderAction(
      () => ref.read(apiClientProvider).postMap(
            '/rider/orders/$orderId/reject',
            {'reason': reason},
            idempotencyKey:
                'rider-reject-$orderId-${DateTime.now().millisecondsSinceEpoch}',
          ),
    );
  }

  Future<void> _markPickedUp(String orderId) async {
    await _runOrderAction(
      () => ref
          .read(apiClientProvider)
          .postMap('/rider/orders/$orderId/picked-up', {}),
    );
  }

  Future<void> _markDelivered(String orderId) async {
    await _runOrderAction(
      () => ref.read(apiClientProvider).postMap(
            '/rider/orders/$orderId/delivered',
            {},
            idempotencyKey:
                'delivered-$orderId-${DateTime.now().millisecondsSinceEpoch}',
          ),
    );
  }

  Future<void> _submitDeliveryProof(String orderId) async {
    final proofController = TextEditingController();
    final noteController = TextEditingController();
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Proof of Delivery'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: proofController,
                decoration:
                    const InputDecoration(labelText: 'Proof URL/reference'),
              ),
              TextField(
                controller: noteController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Note'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, {
              'proof_url': proofController.text.trim(),
              'note': noteController.text.trim(),
            }),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    if (result == null ||
        (result['proof_url']!.isEmpty && result['note']!.isEmpty)) {
      return;
    }

    await _runOrderAction(
      () => ref.read(apiClientProvider).postMap(
            '/rider/orders/$orderId/delivery-proof',
            result,
            idempotencyKey:
                'delivery-proof-$orderId-${DateTime.now().millisecondsSinceEpoch}',
          ),
    );
  }

  Future<void> _markPaymentCollected(Map<String, dynamic> order) async {
    final amountController =
        TextEditingController(text: order['totalAmount']?.toString() ?? '0');
    final amount = await showDialog<double>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Payment Collected'),
        content: TextField(
          controller: amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Amount collected'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(
              context,
              double.tryParse(amountController.text.trim()),
            ),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    if (amount == null || amount <= 0) return;

    final orderId = order['id'] as String;
    await _runOrderAction(
      () => ref.read(apiClientProvider).postMap(
            '/rider/orders/$orderId/payment-collected',
            {'amount': amount, 'note': 'Collected by rider'},
            idempotencyKey:
                'rider-payment-$orderId-${DateTime.now().millisecondsSinceEpoch}',
          ),
    );
  }

  Future<void> _reportIssue(Map<String, dynamic> order) async {
    final controller = TextEditingController();
    final description = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Report Delivery Issue'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Issue details'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Report'),
          ),
        ],
      ),
    );
    if (description == null || description.isEmpty) return;

    await _runOrderAction(
      () => ref.read(apiClientProvider).postMap('/rider/issues', {
        'order_id': order['id'],
        'subject': 'Rider delivery issue',
        'description': description,
        'priority': 'HIGH',
      }),
    );
  }

  Future<void> _openCall(String? phone) async {
    final sanitized = phone?.replaceAll(RegExp(r'[^0-9+]'), '') ?? '';
    if (sanitized.isEmpty) return;
    await _launch(Uri(scheme: 'tel', path: sanitized));
  }

  Future<void> _openMaps(String label, String address) async {
    final query = '$label $address'.trim();
    if (query.isEmpty) return;
    await _launch(Uri.https('www.google.com', '/maps/search/', {
      'api': '1',
      'query': query,
    }));
  }

  Future<void> _launch(Uri uri) async {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open ${uri.toString()}')),
      );
    }
  }

  Future<void> _runOrderAction(Future<dynamic> Function() action) {
    return _runAction(
      action,
      successMessage: 'Order updated',
      refresh: () {
        ref.invalidate(riderOrdersProvider);
        ref.invalidate(riderOrderHistoryProvider);
        ref.invalidate(riderDashboardProvider);
      },
    );
  }

  Future<void> _runAction(
    Future<dynamic> Function() action, {
    required String successMessage,
    required VoidCallback refresh,
  }) async {
    setState(() => _submitting = true);
    try {
      await action();
      refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(successMessage)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Action failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(riderDashboardProvider);
    final profileAsync = ref.watch(riderProfileProvider);
    final kycAsync = ref.watch(riderKycDocumentsProvider);
    final ordersAsync = ref.watch(riderOrdersProvider);
    final historyAsync = ref.watch(riderOrderHistoryProvider);

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        QuickGoSection(
          title: 'Rider Home',
          children: [
            if (_submitting) const LinearProgressIndicator(),
            dashboardAsync.when(
              data: (data) => SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: data['online'] == true,
                onChanged: _submitting ? null : _toggleOnlineStatus,
                title: const Text('Online'),
                subtitle: const Text('Accept assignments only when available'),
              ),
              loading: () => const ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Loading rider status...'),
              ),
              error: (err, _) => Text('Dashboard error: $err'),
            ),
            dashboardAsync.when(
              data: _buildDashboardChips,
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
        QuickGoSection(
          title: 'Profile & KYC',
          children: [
            profileAsync.when(
              data: (profile) => _buildProfile(profile),
              loading: () => const ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Loading profile...'),
              ),
              error: (err, _) => Text('Profile error: $err'),
            ),
            const SizedBox(height: 8),
            kycAsync.when(
              data: _buildKycList,
              loading: () => const Text('Loading KYC documents...'),
              error: (err, _) => Text('KYC error: $err'),
            ),
          ],
        ),
        QuickGoSection(
          title: 'Assigned Orders',
          children: [
            ordersAsync.when(
              data: (orders) {
                if (orders.isEmpty) {
                  return const ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('No assigned orders'),
                    subtitle: Text('Pickup and drop details appear here.'),
                  );
                }
                return Column(
                  children: orders
                      .map<Widget>((raw) =>
                          _buildOrderCard(raw as Map<String, dynamic>))
                      .toList(),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Text('Orders error: $err'),
            ),
          ],
        ),
        QuickGoSection(
          title: 'Order History',
          children: [
            historyAsync.when(
              data: _buildHistory,
              loading: () => const Text('Loading history...'),
              error: (err, _) => Text('History error: $err'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDashboardChips(Map<String, dynamic> data) {
    final assigned = data['assigned_orders'] ?? 0;
    final picked = data['picked_up'] ?? 0;
    final delivered = data['delivered_today'] ?? 0;

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        Chip(label: Text('Assigned: $assigned')),
        Chip(label: Text('Picked Up: $picked')),
        Chip(label: Text('Delivered Today: $delivered')),
      ],
    );
  }

  Widget _buildProfile(Map<String, dynamic> profile) {
    if (profile.isEmpty) {
      return const ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text('Rider profile unavailable'),
      );
    }
    final zone = profile['serviceZone'] as Map<String, dynamic>?;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(profile['name']?.toString() ?? 'Rider'),
      subtitle: Text(
        [
          'Phone: ${profile['phone'] ?? '-'}',
          'Vehicle: ${profile['vehicleType'] ?? '-'} ${profile['vehicleNumber'] ?? ''}',
          'Zone: ${zone?['name'] ?? '-'}',
          'Status: ${profile['onboardingStatus'] ?? profile['status'] ?? '-'}',
        ].join('\n'),
      ),
      isThreeLine: true,
      trailing: OutlinedButton(
        onPressed: _submitting ? null : () => _editProfile(profile),
        child: const Text('Edit'),
      ),
    );
  }

  Widget _buildKycList(List<dynamic> documents) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            FilledButton(
              onPressed: _submitting ? null : _submitKycDocument,
              child: const Text('Submit KYC'),
            ),
            if (documents.isEmpty) const Chip(label: Text('No KYC documents')),
            ...documents.take(3).map((raw) {
              final document = raw as Map<String, dynamic>;
              return Chip(
                label: Text(
                  '${document['type'] ?? 'Document'}: ${document['status'] ?? 'PENDING'}',
                ),
              );
            }),
          ],
        ),
      ],
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order) {
    final status = order['status'] as String? ?? '';
    final vendor = order['vendor'] as Map<String, dynamic>?;
    final vendorSnapshot = order['vendorSnapshot'] as Map?;
    final customerSnapshot = order['customerSnapshot'] as Map?;
    final drop = order['deliveryAddressSnapshot'] as Map?;
    final assignment = _activeAssignment(order);
    final acceptedAt = assignment?['acceptedAt'];
    final proofs = (order['deliveryProofs'] as List?) ?? const [];
    final orderId = order['id'] as String;
    final pickupLabel =
        vendor?['shopName'] ?? vendorSnapshot?['shopName'] ?? 'Vendor';
    final pickupAddress =
        vendor?['addressLine'] ?? vendorSnapshot?['addressLine'] ?? '';
    final dropAddress = [
      drop?['line1'],
      drop?['line2'],
      drop?['city'],
      drop?['state'],
      drop?['pincode'],
    ].where((part) => part != null && part.toString().isNotEmpty).join(', ');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order #${order['orderNumber']}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text('Status: $status'),
            if (acceptedAt != null) Text('Accepted: $acceptedAt'),
            Text('Pickup: $pickupLabel - $pickupAddress'),
            Text('Drop: ${dropAddress.isEmpty ? 'Customer address' : dropAddress}'),
            Text('Delivery proof: ${proofs.isEmpty ? 'Pending' : '${proofs.length} submitted'}'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton(
                  onPressed: () => _openCall(
                    vendor?['ownerPhone']?.toString() ??
                        vendorSnapshot?['ownerPhone']?.toString(),
                  ),
                  child: const Text('Call Vendor'),
                ),
                OutlinedButton(
                  onPressed: () => _openCall(
                    drop?['receiverPhone']?.toString() ??
                        customerSnapshot?['phone']?.toString(),
                  ),
                  child: const Text('Call Customer'),
                ),
                OutlinedButton(
                  onPressed: () => _openMaps(pickupLabel.toString(), pickupAddress.toString()),
                  child: const Text('Pickup Map'),
                ),
                OutlinedButton(
                  onPressed: () => _openMaps('Customer drop', dropAddress),
                  child: const Text('Drop Map'),
                ),
                if (status == 'RIDER_ASSIGNED' && acceptedAt == null) ...[
                  FilledButton(
                    onPressed: _submitting ? null : () => _acceptOrder(orderId),
                    child: const Text('Accept'),
                  ),
                  OutlinedButton(
                    onPressed: _submitting ? null : () => _rejectOrder(orderId),
                    child: const Text('Reject'),
                  ),
                ],
                if (status == 'RIDER_ASSIGNED')
                  FilledButton(
                    onPressed: _submitting ? null : () => _markPickedUp(orderId),
                    child: const Text('Picked Up'),
                  ),
                if (status == 'PICKED_UP') ...[
                  FilledButton(
                    onPressed:
                        _submitting ? null : () => _markDelivered(orderId),
                    child: const Text('Delivered'),
                  ),
                  OutlinedButton(
                    onPressed: _submitting
                        ? null
                        : () => _submitDeliveryProof(orderId),
                    child: const Text('Proof'),
                  ),
                ],
                if (status == 'DELIVERED' || status == 'PAYMENT_PENDING')
                  OutlinedButton(
                    onPressed:
                        _submitting ? null : () => _markPaymentCollected(order),
                    child: const Text('Payment Collected'),
                  ),
                OutlinedButton(
                  onPressed: _submitting ? null : () => _reportIssue(order),
                  child: const Text('Report Issue'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistory(List<dynamic> orders) {
    if (orders.isEmpty) {
      return const ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text('No rider order history yet'),
      );
    }
    return Column(
      children: orders.take(5).map((raw) {
        final order = raw as Map<String, dynamic>;
        final assignment = order['rider_assignment'] as Map?;
        return ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text('Order #${order['orderNumber']}'),
          subtitle: Text(
            'Status: ${order['status']}'
            '${assignment?['rejectionReason'] != null ? '\nRejected: ${assignment?['rejectionReason']}' : ''}',
          ),
        );
      }).toList(),
    );
  }

  Map<String, dynamic>? _activeAssignment(Map<String, dynamic> order) {
    final assignments = order['deliveryAssignments'] as List?;
    if (assignments == null || assignments.isEmpty) return null;
    return assignments
        .cast<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .firstWhere(
          (item) => item['isActive'] == true,
          orElse: () => Map<String, dynamic>.from(assignments.last as Map),
        );
  }
}
