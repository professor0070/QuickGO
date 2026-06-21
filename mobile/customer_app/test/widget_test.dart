import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_customer_app/src/customer_app.dart';

void main() {
  testWidgets('renders customer login screen', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: CustomerApp()));

    expect(find.text('QuickGO Login'), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);
  });
}
