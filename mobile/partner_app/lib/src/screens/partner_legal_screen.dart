import 'package:flutter/material.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart'; // To access PartnerMode

class PartnerLegalScreen extends StatelessWidget {
  const PartnerLegalScreen({super.key, required this.mode});

  final PartnerMode mode;

  @override
  Widget build(BuildContext context) {
    final isVendor = mode == PartnerMode.vendor;

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Partner Policies'),
          bottom: TabBar(
            isScrollable: false,
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              const Tab(text: 'Terms'),
              const Tab(text: 'Privacy'),
              Tab(text: isVendor ? 'Vendor' : 'Rider'),
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
            Expanded(
              child: TabBarView(
                children: [
                  const _LegalDocView(
                    title: 'Partner Terms & Conditions',
                    content: _termsContent,
                  ),
                  const _LegalDocView(
                    title: 'Partner Privacy Policy',
                    content: _privacyContent,
                  ),
                  if (isVendor)
                    const _LegalDocView(
                      title: 'Merchant & Vendor Policy',
                      content: _vendorPolicyContent,
                    )
                  else
                    const _LegalDocView(
                      title: 'Rider Agreement & Policy',
                      content: _riderPolicyContent,
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
Welcome to the QuickGO Partner Platform. By registering as a Rider or Vendor Partner on the QuickGO Partner Application, you agree to comply with and be bound by the following Partner Terms & Conditions.

1. Partnership Status
By using this platform, you acknowledge that you are an independent contractor and not an employee, agent, joint venturer, or partner of QuickGO. You retain sole discretion to choose when, where, and how long you operate.

2. Services Provided
- Vendor Partners agree to provide listed products/meals in accordance with high standards of food safety, hygiene, and accurate descriptions.
- Rider Partners agree to perform logistics, delivery, and transportation services using serviceable vehicles conforming to local laws.

3. Account Verification
Partners must upload genuine proof of identity, business licenses, vehicle registrations, and bank details. Falsification of documents will lead to permanent blacklisting and legal action.

4. Revenue Sharing & Payments
Service fees, commission splits, and settlement schedules are governed by the specific Vendor/Rider policies. Digital payments processed via Razorpay will be reconciled and distributed according to the settlement rules.
''';

const String _privacyContent = '''
QuickGO values the privacy of its business partners. This Partner Privacy Policy describes how we process your personal and telemetry information.

1. Information We Collect
- Identity & KYC: Full name, phone number, PAN card, GST number, driving license, and bank account details.
- Location Tracking: Persistent background location tracking is required for Rider Partners during active shifts to compute dispatch availability, match order routes, and calculate payouts.
- Transaction Logs: Records of orders accepted, completed, payouts received, and user feedback.

2. Use of Information
- Dispatch optimization and delivery route tracking.
- Automated payout calculations and Razorpay vendor transfers.
- Communication regarding dispute resolution and platform updates.

3. Security & Access
KYC files are stored securely and accessed only by verified operations staff. Bank details are passed directly to our banking partner APIs for payout processing.
''';

const String _vendorPolicyContent = '''
Merchant & Vendor Partner Policy (QuickGO Hyperlocal Services)

1. Product Catalog & Listings
- Vendors must maintain accurate inventories, pricing, and tax structures.
- Perishable goods, hot food items, or medicines must meet local municipal health standards.

2. Commission & Settlement
- QuickGO charges a flat platform commission fee on all completed customer orders.
- Daily vendor payouts are calculated based on: Completed Order Amount - Commission Fee + Eligible Subsidies/Promotions.
- Settled amounts will be processed to the registered bank account via Razorpay payouts.

3. Dispute Resolution & Cancellations
- If a vendor packs an incorrect or damaged item, they are liable for the customer refund.
- High rejection rates of incoming customer orders may lead to temporary listing suspension.
''';

const String _riderPolicyContent = '''
Rider Partner Agreement & Policy (QuickGO Logistics Network)

1. Driving & Logistics Requirements
- Riders must possess a valid commercial/non-commercial driving license and active vehicle insurance.
- Riders must wear safety gear (helmets, vests) and carry insulated delivery boxes when transporting food or groceries.

2. Payout Structure & Distance Computation
- Payouts are calculated per trip based on base fare, per-kilometer rates, wait times, and high-demand surge pricing.
- Detailed payout logs and historical trip ledger balances are accessible in the Rider dashboard.

3. Service Level Agreements (SLAs)
- Orders must be picked up and delivered within the estimated time window.
- Unprofessional behavior, food tampering, or route manipulation will trigger a security audit and potential partner contract termination.
''';
