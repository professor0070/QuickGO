import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';
import 'address_list_screen.dart';
import 'order_confirmation_screen.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String _paymentMethod = 'COD';
  bool _submitting = false;
  String? _orderAttemptKey;

  String? _selectedRewardType = 'NONE'; // 'COINS', 'CASHBACK', or 'NONE'
  int _goCoinsToUse = 0;
  double _cashbackToUse = 0.0;

  Future<void> _placeOrder(
      Map<String, dynamic> cart, Map<String, dynamic> address) async {
    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      _orderAttemptKey ??= 'order-${DateTime.now().millisecondsSinceEpoch}';
      final order = await client.postMap(
          '/orders',
          {
            'address_id': address['id'],
            'payment_method': _paymentMethod,
            if (_selectedRewardType == 'COINS' && _goCoinsToUse > 0)
              'use_go_coins': _goCoinsToUse,
            if (_selectedRewardType == 'CASHBACK' && _cashbackToUse > 0)
              'use_cashback': _cashbackToUse,
          },
          idempotencyKey: _orderAttemptKey);

      ref.invalidate(cartProvider);
      ref.invalidate(ordersProvider);
      _orderAttemptKey = null;

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => OrderConfirmationScreen(
            orderNumber: order['orderNumber'] as String? ?? 'N/A',
            totalAmount:
                double.tryParse(order['totalAmount'].toString()) ?? 0.0,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to place order: $e'), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartAsync = ref.watch(cartProvider);
    final selectedAddress = ref.watch(selectedAddressProvider);
    final addressesAsync = ref.watch(addressesProvider);

    // Try to auto-select default address if none selected yet
    addressesAsync.whenData((addresses) {
      if (selectedAddress == null && addresses.isNotEmpty) {
        final defAddr = addresses.firstWhere(
            (a) => a['isDefault'] as bool? ?? false,
            orElse: () => addresses.first);
        ref.read(selectedAddressProvider.notifier).state = defAddr;
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: cartAsync.when(
        data: (cart) {
          final items = cart['items'] as List<dynamic>? ?? const [];
          double itemsTotal = 0.0;
          for (final item in items) {
            final qty = int.tryParse(item['quantity'].toString()) ?? 0;
            final price = double.tryParse(item['unitPrice'].toString()) ?? 0.0;
            itemsTotal += qty * price;
          }

          final deliveryFee = 30.0; // Mock delivery fee
          final walletAsync = ref.watch(walletProvider);
          final discountReward = _selectedRewardType == 'COINS'
              ? (_goCoinsToUse / 10.0)
              : (_selectedRewardType == 'CASHBACK' ? _cashbackToUse : 0.0);
          final totalAmount = max(0.0, itemsTotal + deliveryFee - discountReward);

          return ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            children: [
              // Delivery Address Section
              QuickGoSection(
                title: 'Delivery Address',
                children: [
                  if (selectedAddress != null) ...[
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: quickGoGreen, size: 24),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${selectedAddress['receiverName']} (${selectedAddress['receiverPhone']})',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: quickGoTextDark),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${selectedAddress['line1']}, ${selectedAddress['city']}',
                                style: const TextStyle(color: quickGoTextLight, fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => AddressListScreen(
                                  onSelected: (addr) {
                                    ref.read(selectedAddressProvider.notifier).state = addr;
                                    Navigator.pop(context);
                                  },
                                ),
                              ),
                            );
                          },
                          child: const Text('Change'),
                        ),
                      ],
                    ),
                  ] else ...[
                    QuickGoOutlineButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const AddressListScreen()),
                        );
                      },
                      label: 'Select Delivery Address',
                      icon: Icons.add_location_alt,
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 8),

              // Order Summary Section
              QuickGoSection(
                title: 'Order Summary',
                children: [
                  ...items.map<Widget>((item) {
                    final product = item['product'] as Map<String, dynamic>?;
                    final name = product?['name'] as String? ?? 'Product';
                    final qty = int.tryParse(item['quantity'].toString()) ?? 0;
                    final price = double.tryParse(item['unitPrice'].toString()) ?? 0.0;

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              '$name x $qty',
                              style: const TextStyle(color: quickGoTextDark, fontSize: 14),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            '₹${(qty * price).toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.w600, color: quickGoTextDark),
                          ),
                        ],
                      ),
                    );
                  }),
                  const Divider(height: 20, color: quickGoLine),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Delivery Fee', style: TextStyle(color: quickGoTextLight)),
                      Text('₹${deliveryFee.toStringAsFixed(2)}', style: const TextStyle(color: quickGoTextDark)),
                    ],
                  ),
                  if (discountReward > 0) ...[
                    const Divider(height: 20, color: quickGoLine),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Reward Discount', style: TextStyle(color: Colors.redAccent)),
                        Text('-₹${discountReward.toStringAsFixed(2)}', style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                  const Divider(height: 20, color: quickGoLine),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Amount:',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: quickGoTextDark),
                      ),
                      Text(
                        '₹${totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: quickGoGreen),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Rewards & Offers Section
              walletAsync.when(
                data: (wallet) {
                  final coinsBalance = (wallet['coinsBalance'] as num?)?.toInt() ?? 0;
                  final double cashbackBalance = double.tryParse((wallet['cashbackBalance'] ?? 0.0).toString()) ?? 0.0;

                  final isCoinsEligible = itemsTotal >= 10;
                  final maxCoinsToUse = min(100, (coinsBalance ~/ 10) * 10);

                  return QuickGoSection(
                    title: 'Rewards & Offers',
                    children: [
                      if (coinsBalance == 0 && cashbackBalance == 0)
                        const Text(
                          'No rewards available in your wallet.',
                          style: TextStyle(fontSize: 13, color: quickGoTextLight),
                        )
                      else ...[
                        const Text(
                          'Select one reward to apply to this order:',
                          style: TextStyle(fontSize: 12, color: quickGoTextLight),
                        ),
                        const SizedBox(height: 8),
                        RadioListTile<String>(
                          contentPadding: EdgeInsets.zero,
                          activeColor: quickGoPrimary,
                          title: Text(
                            'Use GO Coins (Available: $coinsBalance Coins)',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: isCoinsEligible ? quickGoTextDark : quickGoTextLight,
                              fontSize: 14,
                            ),
                          ),
                          subtitle: Text(
                            isCoinsEligible
                                ? 'Use $maxCoinsToUse GO Coins for ₹${(maxCoinsToUse / 10).toStringAsFixed(2)} discount'
                                : 'Order value must be ₹10 or greater to use GO Coins',
                            style: const TextStyle(fontSize: 12),
                          ),
                          value: 'COINS',
                          groupValue: _selectedRewardType,
                          onChanged: isCoinsEligible && maxCoinsToUse > 0
                              ? (val) {
                                  setState(() {
                                    _selectedRewardType = val;
                                    _goCoinsToUse = maxCoinsToUse;
                                    _cashbackToUse = 0.0;
                                  });
                                }
                              : null,
                        ),
                        RadioListTile<String>(
                          contentPadding: EdgeInsets.zero,
                          activeColor: quickGoPrimary,
                          title: Text(
                            'Use Cashback (Available: ₹${cashbackBalance.toStringAsFixed(2)})',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: cashbackBalance > 0 ? quickGoTextDark : quickGoTextLight,
                              fontSize: 14,
                            ),
                          ),
                          subtitle: Text(
                            cashbackBalance > 0
                                ? 'Apply ₹${min(cashbackBalance, itemsTotal).toStringAsFixed(2)} cashback discount'
                                : 'No cashback balance available',
                            style: const TextStyle(fontSize: 12),
                          ),
                          value: 'CASHBACK',
                          groupValue: _selectedRewardType,
                          onChanged: cashbackBalance > 0
                              ? (val) {
                                  setState(() {
                                    _selectedRewardType = val;
                                    _cashbackToUse = min(cashbackBalance, itemsTotal);
                                    _goCoinsToUse = 0;
                                  });
                                }
                              : null,
                        ),
                        RadioListTile<String>(
                          contentPadding: EdgeInsets.zero,
                          activeColor: quickGoPrimary,
                          title: const Text(
                            'Do not use rewards',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: quickGoTextDark),
                          ),
                          value: 'NONE',
                          groupValue: _selectedRewardType,
                          onChanged: (val) {
                            setState(() {
                              _selectedRewardType = val;
                              _goCoinsToUse = 0;
                              _cashbackToUse = 0.0;
                            });
                          },
                        ),
                      ],
                    ],
                  );
                },
                loading: () => const QuickGoSkeleton(width: double.infinity, height: 100),
                error: (e, s) => const SizedBox(),
              ),
              const SizedBox(height: 8),

              // Payment Method Section
              QuickGoSection(
                title: 'Payment Method',
                children: [
                  const Text(
                    'Select how you want to pay upon delivery:',
                    style: TextStyle(fontSize: 12, color: quickGoTextLight),
                  ),
                  const SizedBox(height: 12),
                  SegmentedButton<String>(
                    style: SegmentedButton.styleFrom(
                      selectedBackgroundColor: quickGoGreen.withOpacity(0.1),
                      selectedForegroundColor: quickGoGreen,
                      side: const BorderSide(color: quickGoLine),
                    ),
                    selected: {_paymentMethod},
                    segments: const [
                      ButtonSegment(
                        value: 'COD',
                        label: Text('COD'),
                        icon: Icon(Icons.money),
                      ),
                      ButtonSegment(
                        value: 'UPI_ON_DELIVERY',
                        label: Text('UPI on Delivery'),
                        icon: Icon(Icons.qr_code_scanner),
                      ),
                    ],
                    onSelectionChanged: (selection) => setState(
                      () => _paymentMethod = selection.first,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              QuickGoButton(
                onPressed: selectedAddress != null
                    ? () {
                        if (items.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Your cart is empty.')),
                          );
                          return;
                        }
                        _placeOrder(cart, selectedAddress);
                      }
                    : null,
                isLoading: _submitting,
                label: 'Confirm & Place Order',
                icon: Icons.check_circle_outline,
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: quickGoGreen)),
        error: (err, _) => QuickGoErrorState(
          title: 'Checkout Failed',
          message: err.toString(),
          onRetry: () => ref.invalidate(cartProvider),
        ),
      ),
    );
  }
}
