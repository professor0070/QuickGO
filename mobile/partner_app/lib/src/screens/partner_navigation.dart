import 'package:flutter/material.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';

class QuickGoPartnerAnimatedBottomNav extends StatelessWidget {
  const QuickGoPartnerAnimatedBottomNav({
    super.key,
    required this.selectedIndex,
    required this.onTap,
    required this.items,
  });

  final int selectedIndex;
  final ValueChanged<int> onTap;
  final List<NavTabItem> items;

  @override
  Widget build(BuildContext context) {
    const double barHeight = 64;
    final double bottomPadding = MediaQuery.of(context).padding.bottom;
    final double totalHeight = barHeight + bottomPadding;

    return Container(
      height: totalHeight,
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 8,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        bottom: true,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double barWidth = constraints.maxWidth;
            final double itemWidth = barWidth / items.length;
            final double pillWidth = itemWidth - 16;
            final double pillHeight = 48;

            return Stack(
              children: [
                // Sliding pill background container
                AnimatedPositioned(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOutBack,
                  left: (selectedIndex * itemWidth) + 8,
                  top: (barHeight - pillHeight) / 2,
                  width: pillWidth,
                  height: pillHeight,
                  child: Container(
                    decoration: BoxDecoration(
                      color: quickGoPrimary.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
                // Icon and labels row
                Row(
                  children: List.generate(items.length, (index) {
                    final item = items[index];
                    final isActive = index == selectedIndex;

                    return Expanded(
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => onTap(index),
                        child: Semantics(
                          label: '${item.label} Tab',
                          selected: isActive,
                          child: SizedBox(
                            height: barHeight,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                TweenAnimationBuilder<double>(
                                  tween: Tween<double>(
                                    begin: 1.0,
                                    end: isActive ? 1.15 : 1.0,
                                  ),
                                  duration: const Duration(milliseconds: 220),
                                  curve: Curves.easeOutBack,
                                  builder: (context, scale, child) {
                                    return Transform.scale(
                                      scale: scale,
                                      child: Icon(
                                        isActive ? item.activeIcon : item.inactiveIcon,
                                        color: isActive ? quickGoPrimary : quickGoTextLight,
                                        size: 24,
                                      ),
                                    );
                                  },
                                ),
                                const SizedBox(height: 2),
                                AnimatedDefaultTextStyle(
                                  duration: const Duration(milliseconds: 200),
                                  style: TextStyle(
                                    color: isActive ? quickGoPrimary : quickGoTextLight,
                                    fontSize: 11,
                                    fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                                  ),
                                  child: Text(item.label),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class NavTabItem {
  const NavTabItem({
    required this.label,
    required this.activeIcon,
    required this.inactiveIcon,
  });

  final String label;
  final IconData activeIcon;
  final IconData inactiveIcon;
}
