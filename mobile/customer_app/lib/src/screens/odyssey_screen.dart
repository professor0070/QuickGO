import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';
import '../widgets/go_buddy/go_buddy_widget.dart';
import '../widgets/go_buddy/go_buddy_enums.dart';

class OdysseyScreen extends ConsumerStatefulWidget {
  const OdysseyScreen({super.key});

  @override
  ConsumerState<OdysseyScreen> createState() => _OdysseyScreenState();
}

class _OdysseyScreenState extends ConsumerState<OdysseyScreen> with TickerProviderStateMixin {
  late AnimationController _rideController;
  late Animation<double> _rideAnimation;
  int _prevOrders = 0;
  bool _initialized = false;
  final Map<String, bool> _scratchRevealed = {};
  final Map<String, bool> _claimingReward = {};

  // Journey Map Node positions (normalized 0.0 to 1.0)
  final List<Map<String, dynamic>> _nodes = [
    {'label': 'START', 'orders': 0, 'x': 0.15, 'y': 0.85},
    {'label': '1', 'orders': 1, 'x': 0.25, 'y': 0.75},
    {'label': '2', 'orders': 2, 'x': 0.35, 'y': 0.70},
    {'label': '3', 'orders': 3, 'x': 0.45, 'y': 0.65},
    {'label': '5', 'orders': 5, 'x': 0.55, 'y': 0.55, 'reward': true},
    {'label': '10', 'orders': 10, 'x': 0.65, 'y': 0.40, 'reward': true},
    {'label': '15', 'orders': 15, 'x': 0.50, 'y': 0.25, 'reward': true},
    {'label': '20', 'orders': 20, 'x': 0.65, 'y': 0.12, 'reward': true},
  ];

  @override
  void initState() {
    super.initState();
    _rideController = AnimationController(
      duration: const Duration(milliseconds: 2500),
      vsync: this,
    );
    _rideAnimation = CurvedAnimation(parent: _rideController, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _rideController.dispose();
    super.dispose();
  }

  Point<double> _getPositionForOrders(int orders, double progress) {
    if (orders <= 0) return Point(_nodes[0]['x'] as double, _nodes[0]['y'] as double);

    int activeSegmentIdx = 0;
    for (int i = 0; i < _nodes.length - 1; i++) {
      if (orders >= (_nodes[i]['orders'] as int) && orders < (_nodes[i + 1]['orders'] as int)) {
        activeSegmentIdx = i;
        break;
      }
    }
    if (orders >= 20) activeSegmentIdx = _nodes.length - 2;

    final startNode = _nodes[activeSegmentIdx];
    final endNode = _nodes[activeSegmentIdx + 1];

    final startOrders = startNode['orders'] as int;
    final endOrders = endNode['orders'] as int;
    final segmentProgress = (orders - startOrders) / (endOrders - startOrders);

    // Apply animation interpolation
    final double finalProgress = progress * segmentProgress;

    final x = (startNode['x'] as double) + ((endNode['x'] as double) - (startNode['x'] as double)) * finalProgress;
    final y = (startNode['y'] as double) + ((endNode['y'] as double) - (startNode['y'] as double)) * finalProgress;

    return Point(x, y);
  }

  Future<void> _revealScratchCard(String rewardId) async {
    setState(() => _scratchRevealed[rewardId] = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.postMap('/odyssey/rewards/$rewardId/reveal', {});
      ref.invalidate(odysseyProvider);
    } catch (_) {}
  }

  Future<void> _claimReward(String rewardId) async {
    setState(() => _claimingReward[rewardId] = true);
    try {
      final client = ref.read(apiClientProvider);
      final response = await client.postMap('/odyssey/rewards/$rewardId/claim', {});
      ref.invalidate(odysseyProvider);
      ref.invalidate(walletProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response['message'] as String? ?? 'Reward claimed!'),
          backgroundColor: quickGoAccent,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to claim: $e'),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) setState(() => _claimingReward[rewardId] = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final odysseyAsync = ref.watch(odysseyProvider);
    final walletAsync = ref.watch(walletProvider);

    final coinsBalance = walletAsync.maybeWhen(
      data: (w) => (w['coinsBalance'] as num?)?.toInt() ?? 0,
      orElse: () => 0,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Odyssey Journey'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black26,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.stars, color: Colors.orange, size: 16),
                const SizedBox(width: 4),
                Text(
                  '$coinsBalance GO (₹${(coinsBalance * 0.1).toStringAsFixed(2)})',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ],
            ),
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(odysseyProvider);
          ref.invalidate(walletProvider);
        },
        child: odysseyAsync.when(
          data: (odysseyData) {
            final summary = odysseyData;
            final profile = summary['profile'] as Map<String, dynamic>;
            final points = (profile['points'] as num?)?.toInt() ?? 0;
            final level = (profile['level'] as num?)?.toInt() ?? 1;
            final streak = (profile['streak'] as num?)?.toInt() ?? 0;
            final cycleCount = (profile['cycleCount'] as num?)?.toInt() ?? 0;
            final totalOrders = (summary['totalOrders'] as num?)?.toInt() ?? 0;
            final rewardsList = summary['rewards'] as List<dynamic>? ?? const [];
            final levelName = summary['levelInfo']?['name'] as String? ?? 'STARTER';

            if (!_initialized) {
              _prevOrders = totalOrders;
              _initialized = true;
              _rideController.forward(from: 0.0);
            } else if (totalOrders != _prevOrders) {
              _prevOrders = totalOrders;
              _rideController.forward(from: 0.0);
            }

            final nextMilestoneTarget = totalOrders < 5
                ? 5
                : totalOrders < 10
                    ? 10
                    : totalOrders < 15
                        ? 15
                        : 20;
            final ordersToNextMilestone = nextMilestoneTarget - totalOrders;

            return ListView(
              children: [
                // Header section
                Container(
                  color: quickGoTextDark,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'MY JOURNEY ODYSSEY',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: quickGoPrimary,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Every order. Every step. Every milestone brings a reward.',
                        style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'LEVEL $level: $levelName',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: quickGoAccent, fontSize: 14),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$points Points',
                                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.white10,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.local_fire_department, color: Colors.orange, size: 24),
                                const SizedBox(width: 6),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('CURRENT STREAK', style: TextStyle(color: Colors.white70, fontSize: 10)),
                                    Text('$streak Completed Orders', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                  ],
                                )
                              ],
                            ),
                          )
                        ],
                      )
                    ],
                  ),
                ),

                // Journey Map Visualizer Card
                Card(
                  margin: const EdgeInsets.all(16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                    side: const BorderSide(color: quickGoBorder),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('JOURNEY MAP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: quickGoTextDark)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: quickGoAccent.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '$cycleCount / 10 Completed',
                                style: const TextStyle(color: quickGoAccent, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            )
                          ],
                        ),
                        const SizedBox(height: 16),
                        // Visual Canvas path
                        AspectRatio(
                          aspectRatio: 1.3,
                          child: Stack(
                            children: [
                              // Path painter
                              Positioned.fill(
                                child: CustomPaint(
                                  painter: JourneyPathPainter(nodes: _nodes, totalOrders: totalOrders),
                                ),
                              ),
                              // Node indicators
                              ..._nodes.map((node) {
                                final isCompleted = totalOrders >= (node['orders'] as int);
                                final isRewardNode = node['reward'] as bool? ?? false;
                                return Positioned(
                                  left: (node['x'] as double) * 300,
                                  top: (node['y'] as double) * 230,
                                  child: Tooltip(
                                    message: '${node['label']} Orders',
                                    child: Container(
                                      alignment: Alignment.center,
                                      width: 24,
                                      height: 24,
                                      decoration: BoxDecoration(
                                        color: isCompleted
                                            ? (isRewardNode ? Colors.orange : quickGoAccent)
                                            : Colors.grey.shade300,
                                        shape: BoxShape.circle,
                                        border: Border.all(color: Colors.white, width: 2),
                                        boxShadow: const [
                                          BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
                                        ],
                                      ),
                                      child: Text(
                                        node['label'] == 'START' ? 'S' : node['label'],
                                        style: TextStyle(
                                          color: isCompleted ? Colors.white : quickGoTextLight,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }),
                              // Mascot animated widget
                              AnimatedBuilder(
                                animation: _rideAnimation,
                                builder: (context, child) {
                                  final pos = _getPositionForOrders(totalOrders, _rideAnimation.value);
                                  return Positioned(
                                    left: pos.x * 300 - 24,
                                    top: pos.y * 230 - 32,
                                    child: const GoBuddyWidget(
                                      pose: GoBuddyPose.onTheWay,
                                      width: 50,
                                      height: 50,
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          ordersToNextMilestone > 0
                              ? '$ordersToNextMilestone more order${ordersToNextMilestone > 1 ? 's' : ''} to reach next milestone!'
                              : 'Milestone reached! Check unlocked rewards below.',
                          style: const TextStyle(fontSize: 13, color: quickGoTextLight, fontStyle: FontStyle.italic),
                        ),
                      ],
                    ),
                  ),
                ),

                // Streak & Rules ("BOOST YOUR JOURNEY")
                QuickGoSection(
                  title: 'BOOST YOUR JOURNEY',
                  children: [
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.local_fire_department, color: Colors.orange, size: 28),
                      title: const Text('3 Orders Streak (2X XP)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: Text(
                        streak > 0 && streak % 3 == 0
                            ? 'Streak active! Current order gives 2X points.'
                            : 'Complete 3 consecutive orders to activate 2X Points multiplier.',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                    const Divider(height: 1, color: quickGoLine),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.check_circle, color: quickGoAccent),
                      title: const Text('Order Completed', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: const Text('+10 points earned for each completed order.', style: TextStyle(fontSize: 12)),
                    ),
                    const Divider(height: 1, color: quickGoLine),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.cancel, color: Colors.redAccent),
                      title: const Text('Order Cancelled', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: const Text('Cancelling orders deducts -10 points and breaks your streak.', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),

                // Level Progress Table
                QuickGoSection(
                  title: 'JOURNEY LEVELS',
                  children: [
                    Table(
                      columnWidths: const {
                        0: FlexColumnWidth(1.2),
                        1: FlexColumnWidth(1.0),
                        2: FlexColumnWidth(1.2),
                        3: FlexColumnWidth(1.6),
                      },
                      border: const TableBorder(
                        horizontalInside: BorderSide(color: quickGoLine, width: 0.5),
                      ),
                      children: [
                        TableRow(
                          children: ['LEVEL', 'ORDERS', 'POINTS', 'REWARDS'].map((h) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8.0),
                              child: Text(
                                h,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: quickGoTextLight),
                              ),
                            );
                          }).toList(),
                        ),
                        _buildLevelRow('Starter', '0-4', '0-39', 'Coins, Discounts', level == 1),
                        _buildLevelRow('Explorer', '5-9', '40-89', 'Cashback, Coupons', level == 2),
                        _buildLevelRow('Achiever', '10-19', '90-199', '₹20 Cashback, Coupons', level == 3),
                        _buildLevelRow('Regular', '20-29', '200-349', 'Discounts, GO Coins', level == 4),
                        _buildLevelRow('Loyal', '30-49', '350-599', 'Cashback, Offers', level == 5),
                        _buildLevelRow('VIP', '50+', '600+', 'Exclusive Perks', level == 6),
                      ],
                    ),
                  ],
                ),

                // Unlocked Rewards list with Scratch to Reveal interaction
                QuickGoSection(
                  title: 'UNLOCKED REWARDS',
                  children: [
                    if (rewardsList.isEmpty)
                      const QuickGoEmptyState(
                        title: 'No Rewards Available',
                        message: 'Complete orders to unlock milestones!',
                        icon: Icons.redeem,
                      )
                    else
                      ...rewardsList.map((reward) {
                        final r = reward as Map<String, dynamic>;
                        final rewardId = r['id'].toString();
                        final status = r['status'].toString();
                        final type = r['rewardType'].toString();
                        final val = double.tryParse(r['rewardValue'].toString()) ?? 0.0;
                        final isCoins = type == 'COINS';

                        if (status == 'AVAILABLE') {
                          // Scratch to reveal card
                          final isScratched = _scratchRevealed[rewardId] ?? false;

                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8.0),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.orange.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.orange, width: 1.5),
                              ),
                              child: Column(
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.stars, color: Colors.orange),
                                      const SizedBox(width: 12),
                                      const Expanded(
                                        child: Text(
                                          'Milestone Reached! Claim your reward now.',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  if (!isScratched)
                                    GestureDetector(
                                      onTap: () => _revealScratchCard(rewardId),
                                      child: Container(
                                        height: 100,
                                        width: double.infinity,
                                        decoration: BoxDecoration(
                                          color: Colors.grey.shade400,
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Center(
                                          child: Column(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Icon(Icons.swipe, color: Colors.white),
                                              SizedBox(height: 4),
                                              Text(
                                                'TAP TO SCRATCH & REVEAL',
                                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                              )
                                            ],
                                          ),
                                        ),
                                      ),
                                    )
                                  else
                                    Container(
                                      height: 100,
                                      width: double.infinity,
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: quickGoLine),
                                      ),
                                      child: Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              isCoins ? '$val GO Coins' : '₹${val.toStringAsFixed(0)} Cashback',
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: quickGoGreen),
                                            ),
                                            const SizedBox(height: 8),
                                            _claimingReward[rewardId] == true
                                                ? const CircularProgressIndicator()
                                                : ElevatedButton(
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor: quickGoAccent,
                                                      foregroundColor: Colors.white,
                                                      shape: RoundedRectangleBorder(
                                                        borderRadius: BorderRadius.circular(8),
                                                      ),
                                                    ),
                                                    onPressed: () => _claimReward(rewardId),
                                                    child: const Text('CLAIM REWARD'),
                                                  ),
                                          ],
                                        ),
                                      ),
                                    )
                                ],
                              ),
                            ),
                          );
                        }

                        final dateClaimed = r['claimedAt'] != null
                            ? DateTime.parse(r['claimedAt'].toString()).toLocal().toString().substring(0, 10)
                            : '';

                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Icon(
                            status == 'CLAIMED' ? Icons.check_circle : Icons.lock_outline,
                            color: status == 'CLAIMED' ? quickGoAccent : quickGoTextLight,
                          ),
                          title: Text(
                            isCoins ? '${val.toStringAsFixed(0)} GO Coins' : '₹${val.toStringAsFixed(0)} Cashback',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: status == 'CLAIMED' ? quickGoTextDark : quickGoTextLight,
                            ),
                          ),
                          subtitle: Text(
                            status == 'CLAIMED' ? 'Claimed on $dateClaimed' : 'Locked milestone reward',
                            style: const TextStyle(fontSize: 12),
                          ),
                        );
                      }),
                  ],
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => QuickGoErrorState(
            title: 'Error loading Odyssey stats',
            message: err.toString(),
            onRetry: () {
              ref.invalidate(odysseyProvider);
              ref.invalidate(walletProvider);
            },
          ),
        ),
      ),
    );
  }

  TableRow _buildLevelRow(String name, String orders, String points, String rewards, bool active) {
    final style = TextStyle(
      fontSize: 12,
      fontWeight: active ? FontWeight.bold : FontWeight.normal,
      color: active ? quickGoPrimary : quickGoTextDark,
    );

    return TableRow(
      decoration: BoxDecoration(
        color: active ? quickGoPrimary.withOpacity(0.08) : null,
      ),
      children: [
        Padding(padding: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 4), child: Text(name, style: style)),
        Padding(padding: const EdgeInsets.symmetric(vertical: 10.0), child: Text(orders, style: style)),
        Padding(padding: const EdgeInsets.symmetric(vertical: 10.0), child: Text(points, style: style)),
        Padding(padding: const EdgeInsets.symmetric(vertical: 10.0), child: Text(rewards, style: style)),
      ],
    );
  }
}

class JourneyPathPainter extends CustomPainter {
  JourneyPathPainter({required this.nodes, required this.totalOrders});

  final List<Map<String, dynamic>> nodes;
  final int totalOrders;

  @override
  void paint(Canvas canvas, Size size) {
    final pathPaint = Paint()
      ..color = Colors.grey.shade300
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    final progressPaint = Paint()
      ..color = quickGoAccent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;

    final path = Path();
    if (nodes.isNotEmpty) {
      path.moveTo((nodes[0]['x'] as double) * size.width, (nodes[0]['y'] as double) * size.height);
      for (int i = 1; i < nodes.length; i++) {
        path.lineTo((nodes[i]['x'] as double) * size.width, (nodes[i]['y'] as double) * size.height);
      }
    }

    canvas.drawPath(path, pathPaint);

    // Draw completed progress segment
    final progressPath = Path();
    if (nodes.isNotEmpty) {
      progressPath.moveTo((nodes[0]['x'] as double) * size.width, (nodes[0]['y'] as double) * size.height);
      for (int i = 1; i < nodes.length; i++) {
        final nodeOrders = nodes[i]['orders'] as int;
        if (totalOrders >= nodeOrders) {
          progressPath.lineTo((nodes[i]['x'] as double) * size.width, (nodes[i]['y'] as double) * size.height);
        } else {
          // Draw partial line towards next node
          final prevOrders = nodes[i - 1]['orders'] as int;
          if (totalOrders > prevOrders) {
            final t = (totalOrders - prevOrders) / (nodeOrders - prevOrders);
            final startX = (nodes[i - 1]['x'] as double) * size.width;
            final startY = (nodes[i - 1]['y'] as double) * size.height;
            final endX = (nodes[i]['x'] as double) * size.width;
            final endY = (nodes[i]['y'] as double) * size.height;
            final interX = startX + (endX - startX) * t;
            final interY = startY + (endY - startY) * t;
            progressPath.lineTo(interX, interY);
          }
          break;
        }
      }
      canvas.drawPath(progressPath, progressPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
