import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_exception.dart';
import '../../../shared/widgets/brand_logo.dart';
import '../../feeds/presentation/feed_controller.dart';

final authControllerProvider = Provider((ref) => _AuthController(ref));

class _AuthController {
  _AuthController(this._ref);
  final Ref _ref;

  Future<void> login(String email, String password) async {
    final api = _ref.read(apiProvider);
    final result = await api.post('/api/login', data: {'email': email, 'password': password, 'mobile_client': true});
    final data = result['data'] as Map<String, dynamic>? ?? {};
    await _ref.read(tokenStorageProvider).save(accessToken: data['access_token'] as String? ?? '', refreshToken: data['refresh_token'] as String? ?? '');
  }

  Future<void> register(String name, String email, String password) async {
    final api = _ref.read(apiProvider);
    final result = await api.post('/api/register', data: {'name': name, 'email': email, 'password': password, 'mobile_client': true});
    final data = result['data'] as Map<String, dynamic>? ?? const {};
    final access = data['access_token'] as String?;
    final refresh = data['refresh_token'] as String?;
    if ((access ?? '').isNotEmpty || (refresh ?? '').isNotEmpty) {
      await _ref.read(tokenStorageProvider).save(accessToken: access ?? '', refreshToken: refresh ?? '');
    }
    if ((access ?? '').isEmpty && (refresh ?? '').isEmpty && (result['message'] as String? ?? '').contains('Please verify your email')) {
      return;
    }
    if ((access ?? '').isEmpty || (refresh ?? '').isEmpty) {
      throw const ApiException('Your account was created, but we could not start a session. Please sign in.');
    }
  }
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmation = TextEditingController();
  var _loading = false;
  bool _requiresVerification = false;
  String _verificationMessage = '';

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _resendVerification() async {
    final email = _email.text.trim();
    if (email.isEmpty) return;
    try {
      final result = await ref.read(apiProvider).post('/api/resend-verification', data: {'email': email});
      final data = result['data'] as Map<String, dynamic>? ?? {};
      final link = data['link'] as String?;
      if (mounted) {
        if (link != null && link.isNotEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Verification link: $link')));
        } else {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('A fresh verification email has been sent.')));
        }
      }
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const BrandLogo(size: 80),
                  const SizedBox(height: 16),
                  Text('Join the circle', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700), textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  if (_requiresVerification)
                    Card(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Verify your email', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            Text(_verificationMessage.isNotEmpty ? _verificationMessage : 'Check your inbox to finish sign-up.'),
                            const SizedBox(height: 8),
                            TextButton.icon(onPressed: _resendVerification, icon: const Icon(Icons.refresh), label: const Text('Resend email')),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 12),
                  TextFormField(controller: _name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Your name', prefixIcon: Icon(Icons.person_outline)), validator: (value) {
                    final name = value?.trim() ?? '';
                    return name.length >= 2 && name.length <= 100 ? null : 'Enter a name between 2 and 100 characters';
                  }),
                  TextFormField(controller: _email, keyboardType: TextInputType.emailAddress, autocorrect: false, decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.email_outlined)), validator: (value) => RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value?.trim() ?? '') ? null : 'Enter a valid email address'),
                  const SizedBox(height: 14),
                  TextFormField(controller: _password, obscureText: true, enableSuggestions: false, autocorrect: false, decoration: const InputDecoration(labelText: 'Password', helperText: '12+ characters with upper, lower, number and symbol', prefixIcon: Icon(Icons.lock_outline)), validator: _passwordError),
                  const SizedBox(height: 14),
                  TextFormField(controller: _confirmation, obscureText: true, enableSuggestions: false, autocorrect: false, decoration: const InputDecoration(labelText: 'Confirm password', prefixIcon: Icon(Icons.lock_outline)), validator: (value) => value == _password.text ? null : 'Passwords do not match'),
                  const SizedBox(height: 20),
                  FilledButton(onPressed: _loading ? null : _submit, child: _loading ? const Row(mainAxisSize: MainAxisSize.min, children: [SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)), SizedBox(width: 10), Text('Creating account...')]) : const Text('Create account')),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ref.read(tokenStorageProvider).clear();
      final result = await ref.read(apiProvider).post('/api/register', data: {'name': _name.text.trim(), 'email': _email.text.trim(), 'password': _password.text, 'mobile_client': true});
      final payload = (result['data'] as Map<String, dynamic>? ?? const {});
      final requiresVerification = (payload['requires_verification'] as bool?) ?? false;
      final verificationSent = (payload['verification_sent'] as bool?) ?? false;
      final message = (result['message'] as String?) ?? 'Account created.';
      if (!mounted) return;
      if (requiresVerification || verificationSent) {
        setState(() {
          _requiresVerification = true;
          _verificationMessage = message;
        });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
        return;
      }
      final accessToken = payload['access_token'] as String?;
      final refreshToken = payload['refresh_token'] as String?;
      if ((accessToken ?? '').isEmpty || (refreshToken ?? '').isEmpty) {
        throw const ApiException('Your account was created, but we could not start a session. Please sign in.');
      }
      await ref.read(tokenStorageProvider).save(
        accessToken: accessToken!,
        refreshToken: refreshToken!,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      context.go('/home');
    } on ApiException catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _passwordError(String? value) {
    final password = value ?? '';
    if (password.length < 12) return 'Use at least 12 characters';
    if (!RegExp(r'[A-Z]').hasMatch(password) || !RegExp(r'[a-z]').hasMatch(password) || !RegExp(r'\d').hasMatch(password) || !RegExp(r'[^\w\s]').hasMatch(password)) {
      return 'Include upper and lower case letters, a number and a symbol';
    }
    return null;
  }
}
