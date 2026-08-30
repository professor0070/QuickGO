import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  bool _claiming = false;

  Future<void> _claimWelcomeReward() async {
    setState(() => _claiming = true);
    try {
      final client = ref.read(apiClientProvider);
      final response = await client.postMap('/wallet/go-coins/claim', {});
      ref.invalidate(walletProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response['message'] as String? ?? 'Reward claimed successfully!'),
          backgroundColor: quickGoAccent,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to claim reward: $e'),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) setState(() => _claiming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final walletAsync = ref.watch(walletProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Wallet')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(walletProvider);
        },
        child: walletAsync.when(
          data: (walletData) {
            final wallet = walletData;
            final coinsBalance = (wallet['coinsBalance'] as num?)?.toInt() ?? 0;
            final double cashbackBalance = double.tryParse((wallet['cashbackBalance'] ?? 0.0).toString()) ?? 0.0;
            final transactions = wallet['transactions'] as List<dynamic>? ?? const [];

            return FutureBuilder<Map<String, dynamic>>(
              future: ref.read(apiClientProvider).getMap('/wallet/welcome-eligibility'),
              builder: (context, snapshot) {
                final isEligible = snapshot.data?['eligible'] as bool? ?? false;

                return ListView(
                  padding: const EdgeInsets.all(16.0),
                  children: [
                    // Balances Summary Grid
                    Row(
                      children: [
                        // GO Coins Balance Card
                        Expanded(
                          child: Card(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: const BorderSide(color: quickGoLine),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.stars, color: Colors.orange, size: 24),
                                      const SizedBox(width: 8),
                                      Text(
                                        'GO Coins',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: quickGoTextDark.withOpacity(0.6),
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    '$coinsBalance GO',
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                      color: quickGoTextDark,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '≈ ₹${(coinsBalance * 0.1).toStringAsFixed(2)}',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: quickGoTextLight,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Cashback Balance Card
                        Expanded(
                          child: Card(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: const BorderSide(color: quickGoLine),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.account_balance_wallet, color: quickGoAccent, size: 24),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Cashback',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: quickGoTextDark.withOpacity(0.6),
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    '₹${cashbackBalance.toStringAsFixed(2)}',
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                      color: quickGoTextDark,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Monetary Value',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: quickGoTextLight,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Welcome Claim Card
                    if (isEligible) ...[
                      Card(
                        color: quickGoPrimary.withOpacity(0.08),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: const BorderSide(color: quickGoPrimary, width: 1.5),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            children: [
                              const Icon(Icons.celebration, color: quickGoPrimary, size: 40),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Welcome to QuickGO!',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: quickGoTextDark,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Claim 50 GO Coins (₹5 Value) now.',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: quickGoTextDark.withOpacity(0.7),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: quickGoPrimary,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                onPressed: _claiming ? null : _claimWelcomeReward,
                                child: _claiming
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                      )
                                    : const Text('Claim'),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Transaction Ledger
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                      child: Text(
                        'Transaction History',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: quickGoTextDark,
                        ),
                      ),
                    ),
                    if (transactions.isEmpty)
                      const QuickGoEmptyState(
                        title: 'No Transactions Yet',
                        message: 'Earn GO Coins and Cashback by completing orders!',
                        icon: Icons.history,
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: transactions.length,
                        separatorBuilder: (context, index) => const Divider(height: 1, color: quickGoLine),
                        itemBuilder: (context, index) {
                          final tx = transactions[index] as Map<String, dynamic>;
                          final amount = double.tryParse((tx['amount'] ?? 0.0).toString()) ?? 0.0;
                          final isCredit = tx['type'].toString().contains('CREDIT');
                          final desc = tx['description'] as String? ?? 'Wallet transaction';
                          final dateStr = tx['createdAt'] != null
                              ? DateTime.parse(tx['createdAt'].toString()).toLocal().toString().substring(0, 16)
                              : '';
                          final isExpired = tx['type'].toString().contains('EXPIRED');

                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                            leading: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isExpired
                                    ? Colors.grey.shade100
                                    : isCredit
                                        ? quickGoAccent.withOpacity(0.1)
                                        : Colors.redAccent.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                isExpired
                                    ? Icons.history_toggle_off
                                    : isCredit
                                        ? Icons.add_circle_outline
                                        : Icons.remove_circle_outline,
                                color: isExpired
                                    ? Colors.grey
                                    : isCredit
                                        ? quickGoAccent
                                        : Colors.redAccent,
                              ),
                            ),
                            title: Text(
                              desc,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: quickGoTextDark),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4.0),
                              child: Text(
                                dateStr,
                                style: const TextStyle(fontSize: 11, color: quickGoTextLight),
                              ),
                            ),
                            trailing: Text(
                              '${isCredit ? "+" : "-"}${tx['currency'] == 'COINS' ? '' : '₹'}${amount.toStringAsFixed(0)} ${tx['currency'] == 'COINS' ? 'GO' : ''}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: isExpired
                                    ? Colors.grey
                                    : isCredit
                                        ? quickGoAccent
                                        : Colors.redAccent,
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => QuickGoErrorState(
            title: 'Error loading wallet',
            message: err.toString(),
            onRetry: () => ref.invalidate(walletProvider),
          ),
        ),
      ),
    );
  }
}
