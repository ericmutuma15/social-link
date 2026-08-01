import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../feeds/presentation/feed_controller.dart';

class FriendsScreen extends ConsumerStatefulWidget {
  const FriendsScreen({super.key});

  @override
  ConsumerState<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends ConsumerState<FriendsScreen> {
  List<Map<String, dynamic>> _friends = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await ref.read(apiProvider).get('/api/friends');
      setState(() => _friends = (result as List<dynamic>? ?? []).cast<Map<String, dynamic>>());
    } catch (_) {
      setState(() => _friends = const []);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Friends')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _friends.isEmpty
              ? const Center(child: Text('No friends yet. Start by exploring new people.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _friends.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final friend = _friends[index];
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(child: Text((friend['name'] as String? ?? 'U').substring(0, 1).toUpperCase())),
                        title: Text(friend['name'] as String? ?? 'Friend'),
                        subtitle: const Text('Connected on Mbogi Link'),
                      ),
                    );
                  },
                ),
    );
  }
}
