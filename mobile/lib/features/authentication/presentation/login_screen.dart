import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_exception.dart';
import '../../../shared/widgets/brand_logo.dart';
import '../../feeds/presentation/feed_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _form = GlobalKey<FormState>();
  var _loading = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const BrandLogo(size: 96),
                  const SizedBox(height: 24),
                  Text('Welcome back', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700), textAlign: TextAlign.center),
                  const SizedBox(height: 8),
                  Text('Pick up where you left off in Mbogi Link.', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant), textAlign: TextAlign.center),
                  const SizedBox(height: 20),
                  TextFormField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.email_outlined)), validator: (value) => value != null && value.contains('@') ? null : 'Enter a valid email'),
                  const SizedBox(height: 16),
                  TextFormField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outline)), validator: (value) => (value?.isNotEmpty ?? false) ? null : 'Enter your password'),
                  const SizedBox(height: 12),
                  Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () {}, child: const Text('Forgot password?'))),
                  const SizedBox(height: 8),
                  FilledButton(onPressed: _loading ? null : _submit, child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Sign in')),
                  const SizedBox(height: 10),
                  OutlinedButton(onPressed: () => context.push('/register'), child: const Text('Create account')),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final result = await ref.read(apiProvider).post('/api/login', data: {'email': _email.text.trim(), 'password': _password.text, 'mobile_client': true});
      final data = result['data'] as Map<String, dynamic>? ?? {};
      final access = data['access_token'] as String?;
      final refresh = data['refresh_token'] as String?;
      if ((access ?? '').isEmpty || (refresh ?? '').isEmpty) {
        throw const ApiException('The server did not return a valid session.');
      }
      await ref.read(tokenStorageProvider).save(accessToken: access!, refreshToken: refresh!);
      if (mounted) context.go('/home');
    } on ApiException catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
