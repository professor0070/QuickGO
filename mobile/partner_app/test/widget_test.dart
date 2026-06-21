import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_partner_app/src/partner_app.dart';

void main() {
  testWidgets('renders partner login screen', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PartnerApp()));

    expect(find.text('Partner Login'), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);
  });
}
