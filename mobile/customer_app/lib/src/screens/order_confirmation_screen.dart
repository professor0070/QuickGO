import 'package:flutter/material.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../widgets/go_buddy/go_buddy.dart';

class OrderConfirmationScreen extends StatelessWidget {
  const OrderConfirmationScreen({
    super.key,
    required this.orderNumber,
    required this.totalAmount,
  });

  final String orderNumber;
  final String? paymentMethod = 'COD';
  final double totalAmount;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Confirmed'),
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Center(
                child: GoBuddyWidget(
                  state: GoBuddyState.orderConfirmed,
                  width: 140,
                  height: 140,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Order Placed Successfully!',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: quickGoTextDark,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              const Text(
                'Your order has been sent to the vendor. Your unique reference order number is:',
                style: TextStyle(color: quickGoTextLight, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                decoration: BoxDecoration(
                  color: quickGoGreen.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: quickGoGreen.withOpacity(0.2)),
                ),
                child: SelectableText(
                  orderNumber,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: quickGoGreen,
                    letterSpacing: 1.0,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              QuickGoCard(
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Amount Due:',
                          style: TextStyle(color: quickGoTextLight, fontSize: 14),
                        ),
                        Text(
                          '₹${totalAmount.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: quickGoTextDark),
                        ),
                      ],
                    ),
                    const Divider(height: 24, color: quickGoLine),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Payment Mode:',
                          style: TextStyle(color: quickGoTextLight, fontSize: 14),
                        ),
                        Text(
                          'COD / UPI on Delivery',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: quickGoTextDark),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              QuickGoButton(
                onPressed: () {
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
                label: 'Back to Home Screen',
                icon: Icons.home,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
