import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../feeds/presentation/feed_controller.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  Map<String, dynamic>? _user;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = ref.read(apiProvider);
      final data = await api.get('/api/current_user');
      if (mounted) setState(() => _user = data as Map<String, dynamic>? ?? {});
    } catch (_) {
      if (mounted) setState(() => _user = {});
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = _user ?? {};
    return Scaffold(
      appBar: AppBar(title: const Text('Profile'), actions: [IconButton(onPressed: () => context.push('/settings'), icon: const Icon(Icons.settings_outlined))]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          CircleAvatar(radius: 40, child: Text((user['name'] as String? ?? 'U').substring(0, 1).toUpperCase())),
                          const SizedBox(height: 12),
                          Text(user['name'] as String? ?? 'Your profile', style: Theme.of(context).textTheme.titleLarge),
                          const SizedBox(height: 4),
                          Text(user['email'] as String? ?? '', style: Theme.of(context).textTheme.bodyMedium),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    leading: const Icon(Icons.person_outline),
                    title: const Text('Edit profile'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                  ListTile(
                    leading: const Icon(Icons.group_outlined),
                    title: const Text('Friends'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/friends'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.logout),
                    title: const Text('Logout'),
                    onTap: () async {
                      await ref.read(tokenStorageProvider).clear();
                      if (mounted && context.mounted) {
                        context.go('/');
                      }
                    },
                  ),
                ],
              ),
            ),
    );
  }
}
