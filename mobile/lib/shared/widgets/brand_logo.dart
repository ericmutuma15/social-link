import 'package:flutter/material.dart';

class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.size = 88, this.showLabel = true});

  final double size;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Container(
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.4),
            child: Image.asset(
              'assets/Designer.png',
              width: size,
              height: size,
              fit: BoxFit.contain,
            ),
          ),
        ),
        if (showLabel) ...[
          const SizedBox(height: 16),
          Text(
            'Mbogi Link',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ],
    );
  }
}
