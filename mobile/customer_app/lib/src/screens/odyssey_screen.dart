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
    {'label': 'START', 'orders': 0, 'x': 0.10, 'y': 0.70},
    {'label': '1', 'orders': 1, 'x': 0.22, 'y': 0.68},
    {'label': '2', 'orders': 2, 'x': 0.34, 'y': 0.61},
    {'label': '3', 'orders': 3, 'x': 0.49, 'y': 0.54},
    {'label': '5', 'orders': 5, 'x': 0.61, 'y': 0.47, 'reward': true},
    {'label': '10', 'orders': 10, 'x': 0.71, 'y': 0.36, 'reward': true},
    {'label': '15', 'orders': 15, 'x': 0.67, 'y': 0.24, 'reward': true},
    {'label': '20', 'orders': 20, 'x': 0.66, 'y': 0.15, 'reward': true},
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

  Widget _buildSection(String title, List<Widget> children) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: Colors.white38,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  Widget _buildQuestCard(IconData icon, Color color, String title, String subtitle) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12, color: Colors.white60),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildLevelCard(String name, String orders, String points, String rewards, bool active) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: active ? const Color(0xFFFF6A00).withOpacity(0.08) : Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: active ? const Color(0xFFFF6A00).withOpacity(0.4) : Colors.white.withOpacity(0.05),
          width: active ? 1.5 : 1.0,
        ),
        boxShadow: active ? [
          BoxShadow(
            color: const Color(0xFFFF6A00).withOpacity(0.15),
            blurRadius: 8,
            spreadRadius: 1,
          )
        ] : null,
      ),
      child: Row(
        children: [
          Icon(
            active ? Icons.emoji_events : Icons.lock,
            color: active ? Colors.orangeAccent : Colors.white24,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name.toUpperCase(),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: active ? Colors.orangeAccent : Colors.white,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Unlock: $orders Orders ($points pts)',
                  style: const TextStyle(color: Colors.white60, fontSize: 11),
                ),
              ],
            ),
          ),
          Text(
            rewards,
            style: TextStyle(
              color: active ? Colors.orangeAccent : Colors.white38,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
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
      backgroundColor: const Color(0xFF0F101A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF131524),
        elevation: 0,
        title: const Text(
          'My Odyssey Journey',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Row(
              children: [
                const Icon(Icons.stars, color: Colors.orange, size: 16),
                const SizedBox(width: 6),
                Text(
                  '$coinsBalance GO (₹${(coinsBalance * 0.1).toStringAsFixed(2)})',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
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

            int nextLevelThreshold = 40;
            int prevLevelThreshold = 0;
            if (level == 2) {
              nextLevelThreshold = 90;
              prevLevelThreshold = 40;
            } else if (level == 3) {
              nextLevelThreshold = 200;
              prevLevelThreshold = 90;
            } else if (level == 4) {
              nextLevelThreshold = 350;
              prevLevelThreshold = 200;
            } else if (level == 5) {
              nextLevelThreshold = 600;
              prevLevelThreshold = 350;
            } else if (level >= 6) {
              nextLevelThreshold = 1000;
              prevLevelThreshold = 600;
            }

            double xpProgress = (points - prevLevelThreshold) / (nextLevelThreshold - prevLevelThreshold);
            xpProgress = xpProgress.clamp(0.0, 1.0);

            return Column(
              children: [
                // Header section: Premium Game profile HUD (Sticky at top)
                Container(
                  decoration: const BoxDecoration(
                    color: Color(0xFF131524),
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(28),
                      bottomRight: Radius.circular(28),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black26,
                        blurRadius: 12,
                        offset: Offset(0, 4),
                      )
                    ]
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          // circular Rank Badge
                          Container(
                            width: 54,
                            height: 54,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const LinearGradient(
                                colors: [Colors.orange, Colors.redAccent],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.orange.withOpacity(0.4),
                                  blurRadius: 8,
                                  spreadRadius: 1,
                                )
                              ]
                            ),
                            child: Center(
                              child: Text(
                                '$level',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  levelName.toUpperCase(),
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$points XP / $nextLevelThreshold XP',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Streak badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.06),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.white10),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.local_fire_department, color: Colors.orange, size: 20),
                                const SizedBox(width: 4),
                                Text(
                                  'STREAK: $streak',
                                  style: const TextStyle(
                                    color: Colors.orangeAccent,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 18),
                      // XP Progress Bar
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('XP PROGRESS', style: TextStyle(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                              Text('LEVEL UP', style: TextStyle(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 8,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: FractionallySizedBox(
                              alignment: Alignment.centerLeft,
                              widthFactor: xpProgress,
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF00F2FE), Color(0xFF4FACFE)],
                                  ),
                                  borderRadius: BorderRadius.circular(4),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF00F2FE).withOpacity(0.5),
                                      blurRadius: 6,
                                      spreadRadius: 1,
                                    )
                                  ]
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: EdgeInsets.zero,
                    children: [
                      // Journey Map Visualizer Card (RPG glassmorphic frame)
                      Container(
                        margin: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E213A).withOpacity(0.6),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.white.withOpacity(0.08), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.map, color: Colors.orangeAccent, size: 20),
                                const SizedBox(width: 8),
                                const Expanded(
                                  child: Text(
                                    'JOURNEY ROADMAP',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: Colors.white,
                                      letterSpacing: 0.5,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.orange.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.orange.withOpacity(0.3)),
                            ),
                            child: Text(
                              '$cycleCount / 10 Completed',
                              style: const TextStyle(color: Colors.orangeAccent, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Visual Canvas path with dynamic scaling and background image
                      AspectRatio(
                        aspectRatio: 0.8,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: LayoutBuilder(
                            builder: (context, constraints) {
                              final w = constraints.maxWidth;
                              final h = constraints.maxHeight;

                              return Stack(
                                children: [
                                  // Beautiful background image representing the journey map
                                  Positioned.fill(
                                    child: Image.asset(
                                      'assets/branding/journey_map.jpg',
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  // Path painter (draws completion line over the background)
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
                                      left: (node['x'] as double) * w - 12,
                                      top: (node['y'] as double) * h - 12,
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
                                  // Mascot animated widget (Go Buddy)
                                  AnimatedBuilder(
                                    animation: _rideAnimation,
                                    builder: (context, child) {
                                      final pos = _getPositionForOrders(totalOrders, _rideAnimation.value);
                                      return Positioned(
                                        left: pos.x * w - 35,
                                        top: pos.y * h - 35,
                                        child: const GoBuddyWidget(
                                          state: GoBuddyState.splash,
                                          width: 70,
                                          height: 70,
                                          animate: true,
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        ordersToNextMilestone > 0
                            ? '$ordersToNextMilestone more order${ordersToNextMilestone > 1 ? 's' : ''} to reach next milestone!'
                            : 'Milestone reached! Check unlocked rewards below.',
                        style: const TextStyle(fontSize: 13, color: Colors.white60, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),

                // Streak & Rules ("ACTIVE QUESTS & BONUSES")
                _buildSection(
                  'ACTIVE QUESTS & BONUSES',
                  [
                    _buildQuestCard(
                      Icons.local_fire_department,
                      Colors.orange,
                      '3 Orders Streak (2X XP)',
                      streak > 0 && streak % 3 == 0
                          ? 'Multiplier ACTIVE! Extra +10 XP granted on completed order.'
                          : 'Complete 3 consecutive orders to activate 2X Points multiplier.',
                    ),
                    _buildQuestCard(
                      Icons.check_circle,
                      Colors.greenAccent,
                      'Order Completed',
                      '+10 points earned for each completed order.',
                    ),
                    _buildQuestCard(
                      Icons.cancel,
                      Colors.redAccent,
                      'Order Cancelled',
                      'Warning: Cancelling orders breaks streaks and penalizes -10 XP.',
                    ),
                  ],
                ),

                // Level Progress checklist ("JOURNEY LEVELS")
                _buildSection(
                  'AVATAR TIERS & ROADMAP',
                  [
                    _buildLevelCard('Starter', '0-4', '0-39', 'Coins, Discounts', level == 1),
                    _buildLevelCard('Explorer', '5-9', '40-89', 'Cashback, Coupons', level == 2),
                    _buildLevelCard('Achiever', '10-19', '90-199', '₹20 Cashback, Coupons', level == 3),
                    _buildLevelCard('Regular', '20-29', '200-349', 'Discounts, GO Coins', level == 4),
                    _buildLevelCard('Loyal', '30-49', '350-599', 'Cashback, Offers', level == 5),
                    _buildLevelCard('VIP', '50+', '600+', 'Exclusive Perks', level == 6),
                  ],
                ),

                // Unlocked Rewards list
                _buildSection(
                  'MY LOOT & TREASURES',
                  [
                    if (rewardsList.isEmpty)
                      const QuickGoEmptyState(
                        title: 'No Loot Found',
                        message: 'Complete roadmap quests to unlock loot chests!',
                        icon: Icons.inventory_2,
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
                          final isScratched = _scratchRevealed[rewardId] ?? false;

                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8.0),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF3A1C71), Color(0xFFD76D77), Color(0xFFFFAF7B)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: Colors.white.withOpacity(0.12)),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFD76D77).withOpacity(0.3),
                                    blurRadius: 12,
                                    offset: const Offset(0, 6),
                                  )
                                ]
                              ),
                              child: Column(
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.stars, color: Colors.orangeAccent),
                                      const SizedBox(width: 12),
                                      const Expanded(
                                        child: Text(
                                          'Quest Accomplished! Claim your loot chest.',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
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
                                          color: Colors.black45,
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(color: Colors.white10),
                                        ),
                                        child: const Center(
                                          child: Column(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Icon(Icons.redeem, color: Colors.orangeAccent, size: 28),
                                              SizedBox(height: 6),
                                              Text(
                                                'TAP TO UNLOCK MYSTERY CARD',
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
                                        color: Colors.white.withOpacity(0.08),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.white10),
                                      ),
                                      child: Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              isCoins ? '$val GO Coins' : '₹${val.toStringAsFixed(0)} Cashback',
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.orangeAccent),
                                            ),
                                            const SizedBox(height: 8),
                                            _claimingReward[rewardId] == true
                                                ? const CircularProgressIndicator()
                                                : ElevatedButton(
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor: Colors.white,
                                                      foregroundColor: Colors.black,
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

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.02),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: status == 'CLAIMED'
                                  ? Colors.white.withOpacity(0.08)
                                  : Colors.white.withOpacity(0.04),
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: status == 'CLAIMED' ? Colors.green.withOpacity(0.1) : Colors.white10,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  status == 'CLAIMED' ? Icons.check_circle : Icons.lock_outline,
                                  color: status == 'CLAIMED' ? Colors.greenAccent : Colors.white24,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      isCoins ? '${val.toStringAsFixed(0)} GO Coins' : '₹${val.toStringAsFixed(0)} Cashback',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: status == 'CLAIMED' ? Colors.white : Colors.white38,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      status == 'CLAIMED' ? 'Claimed on $dateClaimed' : 'Locked milestone reward',
                                      style: const TextStyle(fontSize: 12, color: Colors.white60),
                                    ),
                                  ],
                                ),
                              )
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ],
              ),
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
}

class JourneyPathPainter extends CustomPainter {
  JourneyPathPainter({required this.nodes, required this.totalOrders});

  final List<Map<String, dynamic>> nodes;
  final int totalOrders;

  @override
  void paint(Canvas canvas, Size size) {
    final pathPaint = Paint()
      ..color = Colors.white.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    final progressPaint = Paint()
      ..color = Colors.orangeAccent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
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
