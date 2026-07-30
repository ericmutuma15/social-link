import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_exception.dart';
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
    await api.post('/api/register', data: {'name': name, 'email': email, 'password': password});
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
  var _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
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
                  Text('Join Mbogi', style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 24),
                  TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Name'), validator: (value) => (value?.trim().isNotEmpty ?? false) ? null : 'Please enter your name'),
                  const SizedBox(height: 14),
                  TextFormField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email'), validator: (value) => value != null && value.contains('@') ? null : 'Enter a valid email'),
                  const SizedBox(height: 14),
                  TextFormField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password'), validator: (value) => (value?.length ?? 0) >= 6 ? null : 'Use at least 6 characters'),
                  const SizedBox(height: 20),
                  FilledButton(onPressed: _loading ? null : _submit, child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Sign up')),
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
      await ref.read(authControllerProvider).register(_name.text.trim(), _email.text.trim(), _password.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account created. Please check your email if verification is required.')));
      context.pop();
    } on ApiException catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
