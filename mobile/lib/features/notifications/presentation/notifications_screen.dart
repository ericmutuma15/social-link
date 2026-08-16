import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../feeds/presentation/feed_controller.dart';
import '../../../shared/widgets/top_menu.dart';

String _localTimeString(String? value) {
  final date = DateTime.tryParse(value ?? '');
  if (date == null) return 'Recently received';
  final local = date.toLocal();
  final diff = DateTime.now().toLocal().difference(local);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inHours < 1) return '${diff.inMinutes}m ago';
  if (diff.inDays < 1) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return '${local.day}/${local.month}/${local.year}';
}

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await ref.read(apiProvider).get('/api/notifications');
      final raw = result['items'] is List
          ? result['items']
          : (result['data'] is Map && result['data']['items'] is List ? result['data']['items'] : const []);
      final data = raw as List<dynamic>? ?? const [];
      setState(() => _items = data.cast<Map<String, dynamic>>());
    } catch (_) {
      setState(() => _items = const []);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _handleTap(Map<String, dynamic> item, int index) async {
    final id = item['id'];
    final type = item['type'] as String? ?? 'general';
    final postId = item['post_id'];
    if (id != null && item['read'] != true) {
      try {
        await ref.read(apiProvider).patch('/api/notifications/$id', data: {'read': true});
        final current = ref.read(notificationUnreadProvider);
        if (current > 0) {
          ref.read(notificationUnreadProvider.notifier).state = current - 1;
        }
      } catch (_) {
        // Keep the UI usable even if the read marker fails.
      }
      if (mounted) {
        setState(() => _items[index]['read'] = true);
      }
    }

    if (type == 'friend_request' || type == 'friend_accept') {
      if (mounted) context.push('/friends');
      return;
    }
    if (postId != null && postId is num) {
      if (mounted) context.push('/posts/${postId.toInt()}');
      return;
    }
    if (mounted) context.push('/notifications');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications'), actions: const [TopMenuButton()]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('No news yet. Likes and requests will appear here.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final item = _items[index];
                    final type = item['type'] as String? ?? 'general';
                    final originator = item['originator_name'] as String? ?? 'Someone';
                    final avatar = item['originator_profile_pic'] as String?;
                    final title = type == 'friend_accept'
                        ? 'You and $originator are now friends.'
                        : type == 'friend_request'
                            ? '$originator sent you a friend request.'
                            : (item['message'] as String? ?? 'Update');

                    return Card(
                      color: item['read'] == true ? null : Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.2),
                      child: ListTile(
                        onTap: () => _handleTap(item, index),
                        leading: avatar == null || avatar.isEmpty
                            ? CircleAvatar(
                                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                                child: Icon(type == 'friend_accept' ? Icons.people_alt_rounded : Icons.notifications_active_outlined),
                              )
                            : CircleAvatar(
                                backgroundImage: CachedNetworkImageProvider(avatar),
                              ),
                        title: Text(title),
                        subtitle: Text(_localTimeString(item['created_at'] as String?)),
                        trailing: type == 'friend_request' || type == 'friend_accept'
                            ? const Icon(Icons.arrow_forward_ios_rounded, size: 16)
                            : item['read'] == true ? const Icon(Icons.done_all_rounded, size: 16) : const Icon(Icons.circle, size: 10),
                      ),
                    );
                  },
                ),
    );
  }
}
