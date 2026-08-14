import 'package:flutter/material.dart';

class PartnerGoBuddyWidget extends StatelessWidget {
  const PartnerGoBuddyWidget({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/go_buddy/character/go_buddy_scooter_rider_3d_master.png',
      width: width,
      height: height,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      errorBuilder: (context, error, stackTrace) {
        return SizedBox(
          width: width ?? 200,
          height: height ?? 200,
          child: const Center(
            child: Icon(Icons.two_wheeler, size: 64, color: Colors.orange),
          ),
        );
      },
    );
  }
}
