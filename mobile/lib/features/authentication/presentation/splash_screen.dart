import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../feeds/presentation/feed_controller.dart';
import '../../../shared/widgets/brand_logo.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _boot());
  }

  Future<void> _boot() async {
    final tokens = ref.read(tokenStorageProvider);
    final access = await tokens.accessToken();
    final refresh = await tokens.refreshToken();
    if ((access ?? '').isEmpty && (refresh ?? '').isEmpty) {
      if (mounted) context.go('/login');
      return;
    }

    try {
      final api = ref.read(apiProvider);
      final result = await api.get('/api/session');
      final authenticated = (result['data'] as Map<String, dynamic>?)?['authenticated'] as bool? ?? false;
      if (mounted) context.go(authenticated ? '/home' : '/login');
    } catch (_) {
      if (mounted) context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.secondary],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const BrandLogo(size: 124, showLabel: false),
              const SizedBox(height: 24),
              const CircularProgressIndicator(color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}
