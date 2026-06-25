import 'package:flutter/material.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';

class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Legal & Policies'),
          bottom: const TabBar(
            isScrollable: false,
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(text: 'Terms'),
              Tab(text: 'Privacy'),
              Tab(text: 'Refunds'),
            ],
          ),
        ),
        body: Column(
          children: [
            // Prominent Draft Disclaimer Banner
            Container(
              width: double.infinity,
              color: Colors.amber.shade900,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: const Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: Colors.white),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'DRAFT FOR TESTING: This document is a placeholder and has not been reviewed by legal counsel. It must be reviewed before public launch.',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Expanded(
              child: TabBarView(
                children: [
                  _LegalDocView(
                    title: 'Terms & Conditions',
                    content: _termsContent,
                  ),
                  _LegalDocView(
                    title: 'Privacy Policy',
                    content: _privacyContent,
                  ),
                  _LegalDocView(
                    title: 'Refund & Cancellation Policy',
                    content: _refundContent,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LegalDocView extends StatelessWidget {
  const _LegalDocView({required this.title, required this.content});

  final String title;
  final String content;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: quickGoGreen,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Last Updated: June 25, 2026',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey,
              fontStyle: FontStyle.italic,
            ),
          ),
          const Divider(height: 24, thickness: 1.2),
          Text(
            content,
            style: const TextStyle(
              fontSize: 14,
              height: 1.6,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

// Policies draft content
const String _termsContent = '''
Welcome to QuickGO. By downloading, accessing, or using the QuickGO mobile application, you agree to comply with and be bound by the following Terms & Conditions.

1. Acceptance of Terms
These Terms represent a legally binding agreement between you ("User" or "Customer") and QuickGO. If you do not agree to these terms, please do not use the application.

2. Description of Services
QuickGO provides a hyperlocal ride-hailing and delivery platform connecting independent taxi/auto drivers and retail vendors with end users. QuickGO acts solely as an aggregator and platform facilitator.

3. Account Registration & Security
- You must be at least 18 years of age to register an account.
- You agree to provide accurate, current, and complete information during registration.
- You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.

4. Acceptable Use
You agree not to use the application for any illegal, unauthorized, or disruptive activities. Any tampering with application servers, reverse-engineering, or harassment of service partners will result in immediate account termination.

5. Limitation of Liability
QuickGO shall not be liable for any indirect, incidental, special, consequential, or exemplary damages arising out of your use of the platform, including but not limited to rides, deliveries, or payments processed through Razorpay.
''';

const String _privacyContent = '''
QuickGO is committed to protecting your privacy. This Privacy Policy details how we collect, use, store, and share your personal data when you interact with our platform.

1. Information We Collect
- Contact Information: Your mobile number, profile name, and account details.
- Location Data: Real-time GPS location tracking is required to facilitate dispatch, route matching, and package delivery. Location tracking is active when the app is open or running in the background depending on permissions.
- Payment Information: Payment transactions are processed directly by our secure third-party gateway provider, Razorpay. We do not store full credit card details or bank passwords on our servers.
- Usage Data: Device model, IP address, OS version, and page/screen navigation patterns.

2. How We Use Information
- To route ride and delivery requests to nearby partners.
- To process digital and UPI transactions.
- To detect and prevent fraudulent activities.
- To offer support and resolve service tickets.

3. Data Retention & Sharing
Your personal information is shared with drivers/vendors strictly to complete active requests. We do not sell your personal data to advertisers.
''';

const String _refundContent = '''
QuickGO aims to maintain high satisfaction rates across all transactions. The following outlines our Refund and Cancellation Policy for customers.

1. Trip Cancellation
- If a customer cancels a ride request after the driver has accepted and travelled towards the pickup point, a nominal cancellation fee may be charged to compensate the partner.
- If a driver cancels a ride, no fee is charged to the customer.

2. Delivery Order Cancellation
- Grocery/Product orders cannot be cancelled once the partner store has commenced preparing or packing the order.
- In case of vendor stockouts or system errors, the customer will receive a full refund.

3. Refund Processing
- Approved refunds for UPI or card payments are processed immediately and will reflect in the user's source bank account within 5-7 business days, depending on Razorpay processing timelines.
- Cash-on-delivery transactions are not subject to digital refunds, but may be credited via platform balance or resolving coupons in case of verified disputes.
''';
