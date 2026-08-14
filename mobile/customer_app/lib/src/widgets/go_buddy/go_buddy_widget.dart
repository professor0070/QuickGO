import 'package:flutter/material.dart';
import 'go_buddy_enums.dart';

class GoBuddyWidget extends StatefulWidget {
  const GoBuddyWidget({
    super.key,
    this.expression,
    this.pose,
    this.state,
    this.customAssetPath,
    this.width = 120,
    this.height = 120,
    this.animate = true,
    this.isDecorative = false,
    this.semanticLabel,
    this.fit = BoxFit.contain,
  });

  final GoBuddyExpression? expression;
  final GoBuddyPose? pose;
  final GoBuddyState? state;
  final String? customAssetPath;
  final double width;
  final double height;
  final bool animate;
  final bool isDecorative;
  final String? semanticLabel;
  final BoxFit fit;

  @override
  State<GoBuddyWidget> createState() => _GoBuddyWidgetState();
}

class _GoBuddyWidgetState extends State<GoBuddyWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _bobAnimation;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 2200),
      vsync: this,
    );

    _bobAnimation = Tween<double>(begin: 0.0, end: -6.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.03).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );

    if (widget.animate) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant GoBuddyWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.animate != oldWidget.animate) {
      if (widget.animate) {
        _controller.repeat(reverse: true);
      } else {
        _controller.stop();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _resolveAssetPath() {
    if (widget.customAssetPath != null) {
      return widget.customAssetPath!;
    }
    if (widget.expression != null) {
      return widget.expression!.assetPath;
    }
    if (widget.pose != null) {
      return widget.pose!.assetPath;
    }
    if (widget.state != null) {
      return widget.state!.assetPath;
    }
    return 'assets/go_buddy/expressions/happy.png';
  }

  String _resolveSemanticLabel() {
    if (widget.semanticLabel != null) {
      return widget.semanticLabel!;
    }
    if (widget.expression != null) {
      return widget.expression!.semanticLabel;
    }
    if (widget.pose != null) {
      return widget.pose!.semanticLabel;
    }
    if (widget.state != null) {
      return 'Go Buddy ${widget.state!.name} companion';
    }
    return 'Go Buddy QuickGO mascot';
  }

  @override
  Widget build(BuildContext context) {
    final assetPath = _resolveAssetPath();
    final label = _resolveSemanticLabel();

    Widget imageWidget = Image.asset(
      assetPath,
      width: widget.width,
      height: widget.height,
      fit: widget.fit,
      errorBuilder: (context, error, stackTrace) {
        // Safe fallback in case asset path is missing or unbundled
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: const Color(0xFFFF7A00).withOpacity(0.12),
            shape: BoxShape.circle,
            border: Border.all(
              color: const Color(0xFFFF7A00).withOpacity(0.3),
              width: 1.5,
            ),
          ),
          child: Center(
            child: Icon(
              Icons.face,
              color: const Color(0xFFFF7A00),
              size: widget.width * 0.5,
            ),
          ),
        );
      },
    );

    if (widget.animate) {
      imageWidget = AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.translate(
            offset: Offset(0, _bobAnimation.value),
            child: Transform.scale(
              scale: _scaleAnimation.value,
              child: child,
            ),
          );
        },
        child: imageWidget,
      );
    }

    return Semantics(
      excludeSemantics: widget.isDecorative,
      label: widget.isDecorative ? null : label,
      child: imageWidget,
    );
  }
}
