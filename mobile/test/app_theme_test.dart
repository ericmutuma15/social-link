import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mbogi_link_mobile/core/theme/app_theme.dart';

void main() {
  test('light theme uses the web brand primary color', () {
    final theme = AppTheme.light();

    expect(theme.colorScheme.primary, const Color(0xFF0AA6B5));
  });
}
