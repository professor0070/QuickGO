/// Locked Go Buddy Character Expressions
enum GoBuddyExpression {
  happy,
  wink,
  thumbsUp,
  allGood,
  surprise,
  thinking,
  excited,
  sad,
  confident,
}

/// Locked Go Buddy Character Poses
enum GoBuddyPose {
  onTheWay,
  pickup,
  outForDelivery,
  delivered,
  celebration,
  pointing,
  holdingPhone,
  welcome,
}

/// App Use Cases / Customer App States for Go Buddy
enum GoBuddyState {
  splash,
  loading,
  emptyCart,
  orderConfirmed,
  outForDelivery,
  orderDelivered,
  error,
  noInternet,
}

/// Extension helper to resolve asset paths and accessibility labels for Go Buddy
extension GoBuddyExpressionX on GoBuddyExpression {
  String get assetPath {
    switch (this) {
      case GoBuddyExpression.happy:
        return 'assets/go_buddy/expressions/happy.png';
      case GoBuddyExpression.wink:
        return 'assets/go_buddy/expressions/wink.png';
      case GoBuddyExpression.thumbsUp:
        return 'assets/go_buddy/expressions/thumbs_up.png';
      case GoBuddyExpression.allGood:
        return 'assets/go_buddy/expressions/all_good.png';
      case GoBuddyExpression.surprise:
        return 'assets/go_buddy/expressions/surprise.png';
      case GoBuddyExpression.thinking:
        return 'assets/go_buddy/expressions/thinking.png';
      case GoBuddyExpression.excited:
        return 'assets/go_buddy/expressions/excited.png';
      case GoBuddyExpression.sad:
        return 'assets/go_buddy/expressions/sad.png';
      case GoBuddyExpression.confident:
        return 'assets/go_buddy/expressions/confident.png';
    }
  }

  String get semanticLabel {
    switch (this) {
      case GoBuddyExpression.happy:
        return 'Go Buddy happy mascot';
      case GoBuddyExpression.wink:
        return 'Go Buddy winking mascot';
      case GoBuddyExpression.thumbsUp:
        return 'Go Buddy giving thumbs up';
      case GoBuddyExpression.allGood:
        return 'Go Buddy showing all good gesture';
      case GoBuddyExpression.surprise:
        return 'Go Buddy surprised mascot';
      case GoBuddyExpression.thinking:
        return 'Go Buddy thinking mascot';
      case GoBuddyExpression.excited:
        return 'Go Buddy excited mascot';
      case GoBuddyExpression.sad:
        return 'Go Buddy sad mascot';
      case GoBuddyExpression.confident:
        return 'Go Buddy confident mascot';
    }
  }
}

extension GoBuddyPoseX on GoBuddyPose {
  String get assetPath {
    switch (this) {
      case GoBuddyPose.onTheWay:
        return 'assets/go_buddy/poses/on_the_way.png';
      case GoBuddyPose.pickup:
        return 'assets/go_buddy/poses/pickup.png';
      case GoBuddyPose.outForDelivery:
        return 'assets/go_buddy/poses/out_for_delivery.png';
      case GoBuddyPose.delivered:
        return 'assets/go_buddy/poses/delivered.png';
      case GoBuddyPose.celebration:
        return 'assets/go_buddy/poses/celebration.png';
      case GoBuddyPose.pointing:
        return 'assets/go_buddy/poses/pointing.png';
      case GoBuddyPose.holdingPhone:
        return 'assets/go_buddy/poses/holding_phone.png';
      case GoBuddyPose.welcome:
        return 'assets/go_buddy/poses/welcome.png';
    }
  }

  String get semanticLabel {
    switch (this) {
      case GoBuddyPose.onTheWay:
        return 'Go Buddy on the way delivering';
      case GoBuddyPose.pickup:
        return 'Go Buddy picking up order';
      case GoBuddyPose.outForDelivery:
        return 'Go Buddy out for delivery';
      case GoBuddyPose.delivered:
        return 'Go Buddy order delivered';
      case GoBuddyPose.celebration:
        return 'Go Buddy celebrating successful order';
      case GoBuddyPose.pointing:
        return 'Go Buddy pointing mascot';
      case GoBuddyPose.holdingPhone:
        return 'Go Buddy checking connectivity';
      case GoBuddyPose.welcome:
        return 'Go Buddy welcoming mascot';
    }
  }
}

extension GoBuddyStateX on GoBuddyState {
  String get assetPath {
    switch (this) {
      case GoBuddyState.splash:
        return 'assets/go_buddy/character/scooter_rider_master.png';
      case GoBuddyState.loading:
        return 'assets/go_buddy/poses/on_the_way.png';
      case GoBuddyState.emptyCart:
        return 'assets/go_buddy/expressions/wink.png';
      case GoBuddyState.orderConfirmed:
        return 'assets/go_buddy/poses/celebration.png';
      case GoBuddyState.outForDelivery:
        return 'assets/go_buddy/poses/out_for_delivery.png';
      case GoBuddyState.orderDelivered:
        return 'assets/go_buddy/poses/delivered.png';
      case GoBuddyState.error:
        return 'assets/go_buddy/expressions/surprise.png';
      case GoBuddyState.noInternet:
        return 'assets/go_buddy/poses/holding_phone.png';
    }
  }

  String get defaultMessage {
    switch (this) {
      case GoBuddyState.splash:
        return 'We Deliver Happiness!';
      case GoBuddyState.loading:
        return 'Getting things ready for you...';
      case GoBuddyState.emptyCart:
        return "Let's add something tasty!";
      case GoBuddyState.orderConfirmed:
        return "We've received your order and it's on the way!";
      case GoBuddyState.outForDelivery:
        return 'Go Buddy is on the way!';
      case GoBuddyState.orderDelivered:
        return 'Delivered! Enjoy your meal!';
      case GoBuddyState.error:
        return 'Oops! Something went wrong.';
      case GoBuddyState.noInternet:
        return 'Please check your connection and try again.';
    }
  }
}

/// Helper mapping standard QuickGO backend order statuses to Go Buddy poses/expressions
GoBuddyPose mapOrderStatusToGoBuddyPose(String status) {
  switch (status.toUpperCase()) {
    case 'RIDER_ASSIGNED':
    case 'READY_FOR_PICKUP':
      return GoBuddyPose.pickup;
    case 'PICKED_UP':
    case 'OUT_FOR_DELIVERY':
    case 'ON_THE_WAY':
      return GoBuddyPose.outForDelivery;
    case 'DELIVERED':
    case 'COMPLETED':
      return GoBuddyPose.delivered;
    default:
      return GoBuddyPose.onTheWay;
  }
}
