import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mbogi_link_mobile/main.dart';

void main() {
  testWidgets('app boots without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MbogiApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.byType(MbogiApp), findsOneWidget);
  });
}
