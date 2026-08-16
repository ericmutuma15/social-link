import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../feeds/presentation/feed_controller.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  Map<String, dynamic> _privacy = const {};
  List<Map<String, dynamic>> _blocks = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final privacyResult = await ref.read(apiProvider).get('/api/privacy');
      final blocksResult = await ref.read(apiProvider).get('/api/blocks');
      final privacyData = privacyResult['data'] as Map<String, dynamic>? ?? const {};
      final blocksData = blocksResult['data'] as Map<String, dynamic>? ?? const {};
      final rawPrivacy = privacyData['privacy'] as Map<String, dynamic>? ?? const {};
      final rawBlocks = blocksData['items'] as List<dynamic>? ?? const [];
      setState(() {
        _privacy = rawPrivacy;
        _blocks = rawBlocks.cast<Map<String, dynamic>>();
      });
    } catch (_) {
      setState(() {
        _privacy = const {};
        _blocks = const [];
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _togglePrivacy(String key, bool value) async {
    final next = Map<String, dynamic>.from(_privacy)..[key] = value;
    setState(() => _privacy = next);
    try {
      final result = await ref.read(apiProvider).patch('/api/privacy', data: {key: value});
      final privacy = (result['data'] as Map<String, dynamic>? ?? const {})['privacy'] as Map<String, dynamic>? ?? next;
      if (mounted) setState(() => _privacy = privacy);
    } catch (_) {
      if (mounted) setState(() => _privacy = Map<String, dynamic>.from(_privacy)..remove(key));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to update privacy settings.')),
        );
      }
    }
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('You will need to sign in again to access your account.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Log out')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(apiProvider).post('/api/logout');
    } finally {
      await ref.read(tokenStorageProvider).clear();
      if (context.mounted) context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final privacy = _privacy;
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Privacy', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Card(
                  child: Column(
                    children: [
                      SwitchListTile(
                        value: (privacy['allow_friend_requests'] as bool?) ?? true,
                        onChanged: (value) => _togglePrivacy('allow_friend_requests', value),
                        title: const Text('Friend requests'),
                        subtitle: const Text('Allow people to send friend requests to you.'),
                      ),
                      SwitchListTile(
                        value: (privacy['show_online_status'] as bool?) ?? true,
                        onChanged: (value) => _togglePrivacy('show_online_status', value),
                        title: const Text('Online status'),
                        subtitle: const Text('Show when you are active.'),
                      ),
                      SwitchListTile(
                        value: (privacy['allow_direct_messages'] as bool?) ?? true,
                        onChanged: (value) => _togglePrivacy('allow_direct_messages', value),
                        title: const Text('Direct messages'),
                        subtitle: const Text('Let others message you directly.'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Blocked users', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Card(
                  child: _blocks.isEmpty
                      ? const ListTile(title: Text('No blocked users yet.'))
                      : Column(
                          children: _blocks.map((user) => ListTile(
                            title: Text(user['name'] as String? ?? 'User'),
                            subtitle: Text(user['username'] as String? ?? 'Blocked user'),
                            trailing: IconButton(
                              icon: const Icon(Icons.block_outlined),
                              onPressed: () async {
                                final messenger = ScaffoldMessenger.maybeOf(context);
                                try {
                                  await ref.read(apiProvider).delete('/api/blocks/${user['id']}');
                                  if (!mounted) return;
                                  await _load();
                                } catch (_) {
                                  if (!mounted || messenger == null) return;
                                  messenger.showSnackBar(
                                    const SnackBar(content: Text('Unable to unblock this user.')),
                                  );
                                }
                              },
                            ),
                          )).toList(),
                        ),
                ),
                const SizedBox(height: 16),
                const Text('General', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                ListTile(
                  leading: Icon(brightness == Brightness.dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
                  title: const Text('Appearance'),
                  subtitle: Text(brightness == Brightness.dark ? 'Dark mode' : 'Light mode'),
                  onTap: () => ref.read(themeModeProvider.notifier).toggle(brightness),
                ),
                ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: const Text('About'),
                  onTap: () async {
                    final result = await ref.read(apiProvider).get('/api/about');
                    final data = result['data'] as Map<String, dynamic>? ?? const {};
                    if (!mounted) return;
                    if (!context.mounted) return;
                    showDialog(
                      context: context,
                      builder: (_) => AlertDialog(
                        title: const Text('About'),
                        content: Text(data['summary'] as String? ?? 'Mbogi Link'),
                        actions: [TextButton(onPressed: () => Navigator.of(context, rootNavigator: true).pop(), child: const Text('Close'))],
                      ),
                    );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.gavel_outlined),
                  title: const Text('Legal'),
                  onTap: () async {
                    final result = await ref.read(apiProvider).get('/api/legal');
                    final data = result['data'] as Map<String, dynamic>? ?? const {};
                    if (!mounted) return;
                    if (!context.mounted) return;
                    showDialog(
                      context: context,
                      builder: (_) => AlertDialog(
                        title: const Text('Legal information'),
                        content: Text('${data['terms'] ?? 'Terms'}\n\n${data['privacy_notice'] ?? ''}'),
                        actions: [TextButton(onPressed: () => Navigator.of(context, rootNavigator: true).pop(), child: const Text('Close'))],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 32),
                OutlinedButton.icon(
                  icon: const Icon(Icons.logout),
                  label: const Text('Log out'),
                  onPressed: () => _logout(context, ref),
                ),
              ],
            ),
    );
  }
}
