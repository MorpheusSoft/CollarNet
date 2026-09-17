import 'package:flutter_test/flutter_test.dart';
import 'package:movil_ops/main.dart';

void main() {
  testWidgets('CowIA Ops App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const CowIAOpsApp());

    // Verify that the title or header appears.
    expect(find.text('MÓDULOS DE OPERACIÓN & DESPLIEGUE'), findsOneWidget);
  });
}
