import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:quickgo_customer_app/src/widgets/go_buddy/go_buddy.dart';

void main() {
  group('GoBuddyWidget Audit Tests', () {
    testWidgets('renders all 9 separate Go Buddy expressions correctly', (tester) async {
      const expressions = GoBuddyExpression.values;
      expect(expressions.length, equals(9));

      for (final exp in expressions) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: GoBuddyWidget(
                expression: exp,
                animate: false,
              ),
            ),
          ),
        );
        expect(find.byType(GoBuddyWidget), findsOneWidget);
        expect(exp.assetPath, contains('assets/go_buddy/expressions/'));
      }
    });

    testWidgets('renders all 8 separate Go Buddy poses correctly', (tester) async {
      const poses = GoBuddyPose.values;
      expect(poses.length, equals(8));

      for (final pose in poses) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: GoBuddyWidget(
                pose: pose,
                animate: false,
              ),
            ),
          ),
        );
        expect(find.byType(GoBuddyWidget), findsOneWidget);
        expect(pose.assetPath, contains('assets/go_buddy/poses/'));
      }
    });

    testWidgets('maps order status to Go Buddy pose correctly', (tester) async {
      expect(mapOrderStatusToGoBuddyPose('RIDER_ASSIGNED'), GoBuddyPose.pickup);
      expect(mapOrderStatusToGoBuddyPose('READY_FOR_PICKUP'), GoBuddyPose.pickup);
      expect(mapOrderStatusToGoBuddyPose('PICKED_UP'), GoBuddyPose.outForDelivery);
      expect(mapOrderStatusToGoBuddyPose('OUT_FOR_DELIVERY'), GoBuddyPose.outForDelivery);
      expect(mapOrderStatusToGoBuddyPose('DELIVERED'), GoBuddyPose.delivered);
      expect(mapOrderStatusToGoBuddyPose('COMPLETED'), GoBuddyPose.delivered);
      expect(mapOrderStatusToGoBuddyPose('UNKNOWN'), GoBuddyPose.onTheWay);
    });

    testWidgets('renders gracefully with fallback when asset is missing', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: GoBuddyWidget(
              customAssetPath: 'invalid/path/missing.png',
              animate: false,
            ),
          ),
        ),
      );

      await tester.pump();
      expect(find.byType(GoBuddyWidget), findsOneWidget);
    });
  });
}
