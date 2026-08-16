import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/utils/profile_image.dart';
import '../../../shared/widgets/top_menu.dart';
import '../../feeds/presentation/feed_controller.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  List<Map<String, dynamic>> _people = const [];
  List<Map<String, dynamic>> _posts = const [];
  bool _loading = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final peopleResult = await ref.read(apiProvider).get('/api/users/discover');
      final postResult = await ref.read(apiProvider).get('/api/explore');
      final people = peopleResult is List ? peopleResult : (peopleResult['data'] is List ? peopleResult['data'] : const []);
      final posts = postResult['items'] as List<dynamic>? ?? const [];
      if (mounted) {
        setState(() {
          _people = people.cast<Map<String, dynamic>>();
          _posts = posts.cast<Map<String, dynamic>>();
        });
      }
    } catch (_) {
      if (mounted) setState(() { _people = const []; _posts = const []; });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendRequest(Map<String, dynamic> user) async {
    final userId = user['id'];
    if (userId == null || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiProvider).post('/api/send-friend-request', data: {'userId': userId});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Friend request sent.')));
        await _load();
      }
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Explore'), actions: const [TopMenuButton()]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_people.isNotEmpty) ...[
                  Text('People to meet', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  ..._people.map((user) {
                    final photo = resolveProfileImageUrl((user['picture'] as String?) ?? (user['avatar'] as String?) ?? (user['profile_pic'] as String?));
                    final userId = user['id'];
                    return Card(
                      child: ListTile(
                        leading: GestureDetector(
                          onTap: () => context.push('/profile/$userId'),
                          child: CircleAvatar(backgroundImage: photo == null ? null : CachedNetworkImageProvider(photo), child: photo == null ? Text((user['name'] as String? ?? 'U').substring(0, 1).toUpperCase()) : null),
                        ),
                        title: Text(user['name'] as String? ?? 'New connection'),
                        subtitle: Text((user['description'] as String?) ?? (user['location'] as String?) ?? 'Open profile to learn more'),
                        trailing: FilledButton(onPressed: _busy ? null : () => _sendRequest(user), child: const Text('Add')),
                      ),
                    );
                  }),
                  const SizedBox(height: 16),
                ],
                if (_posts.isEmpty && _people.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text('Nothing to explore right now. Try again soon.', textAlign: TextAlign.center),
                    ),
                  )
                else ...[
                  Text('Fresh posts', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  ..._posts.map((item) {
                    final userId = item['user_id'];
                    final photo = resolveProfileImageUrl((item['user_photo'] as String?) ?? (item['avatar'] as String?) ?? (item['picture'] as String?));
                    return Card(
                      child: InkWell(
                        onTap: userId == null ? null : () => context.push('/profile/$userId'),
                        child: ListTile(
                          leading: GestureDetector(
                            onTap: userId == null ? null : () => context.push('/profile/$userId'),
                            child: CircleAvatar(backgroundImage: photo == null ? null : CachedNetworkImageProvider(photo), child: photo == null ? Text((item['user_name'] as String? ?? 'U').substring(0, 1).toUpperCase()) : null),
                          ),
                          title: Text(item['content'] as String? ?? 'Post'),
                          subtitle: Text(item['user_name'] as String? ?? 'Community member'),
                        ),
                      ),
                    );
                  }),
                ],
              ],
            ),
    );
  }
}
