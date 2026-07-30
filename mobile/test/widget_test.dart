import 'package:flutter_test/flutter_test.dart';
import 'package:mbogi_link_mobile/main.dart';

void main() {
  testWidgets('app boots without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const MbogiApp());
    await tester.pumpAndSettle();

    expect(find.byType(MbogiApp), findsOneWidget);
  });
}
