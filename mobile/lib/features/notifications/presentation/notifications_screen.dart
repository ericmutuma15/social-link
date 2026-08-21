import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../feeds/presentation/feed_controller.dart';
import '../../../shared/utils/profile_image.dart';
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
  String _filter = 'all';
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (_refreshing) return;
    _refreshing = true;
    try {
      final result = await ref.read(apiProvider).get('/api/notifications', query: {'status': _filter});
      final raw = result['items'] is List
          ? result['items']
          : (result['data'] is Map && result['data']['items'] is List ? result['data']['items'] : const []);
      final data = raw as List<dynamic>? ?? const [];
      if (mounted) setState(() => _items = data.cast<Map<String, dynamic>>());
    } catch (_) {
      if (mounted && _items.isEmpty) setState(() => _items = const []);
      if (mounted && _items.isNotEmpty) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Couldn't refresh notifications. Check your connection and try again.")));
    } finally {
      _refreshing = false;
      if (mounted) setState(() => _loading = false);
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Open the post from your feed.')));
      return;
    }
  }

  Future<void> _acceptFriendRequest(Map<String, dynamic> item, int index) async {
    final id = item['friend_request_id'];
    if (id == null) return;
    try {
      await ref.read(apiProvider).post('/api/accept-friend-request', data: {'requestId': id});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Friend request accepted.')));
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _declineFriendRequest(Map<String, dynamic> item, int index) async {
    final id = item['friend_request_id'];
    if (id == null) return;
    try {
      await ref.read(apiProvider).delete('/api/friend-requests/$id');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Friend request declined.')));
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ref.read(apiProvider).post('/api/mark-all-read');
      if (mounted) {
        setState(() { for (final item in _items) { item['read'] = true; } });
        ref.read(notificationUnreadProvider.notifier).state = 0;
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to mark notifications as read.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications'), actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh), tooltip: 'Refresh'), IconButton(onPressed: _markAllRead, icon: const Icon(Icons.done_all), tooltip: 'Mark all as read'), const TopMenuButton()]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('No news yet. Likes and requests will appear here.'))
              : RefreshIndicator(onRefresh: _load, child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length + 1,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    if (index == 0) return SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [for (final entry in const {'all': 'All', 'unread': 'Unread', 'read': 'Read'}.entries) Padding(padding: const EdgeInsets.only(right: 8), child: FilterChip(label: Text(entry.value), selected: _filter == entry.key, onSelected: (_) { setState(() => _filter = entry.key); _load(); }))]));
                    final item = _items[index - 1];
                    final type = item['type'] as String? ?? 'general';
                    final originator = item['originator_name'] as String? ?? 'Someone';
                    final avatar = resolveProfileImageUrl(item['originator_profile_pic'] as String?);
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
                        trailing: type == 'friend_request' && (item['friend_request_status'] == null || item['friend_request_status'] == 'pending')
                          ? Row(mainAxisSize: MainAxisSize.min, children: [FilledButton(onPressed: () => _acceptFriendRequest(item, index), child: const Text('Accept')), const SizedBox(width: 8), TextButton(onPressed: () => _declineFriendRequest(item, index), child: const Text('Decline'))])
                          : type == 'friend_request' || type == 'friend_accept'
                            ? const Icon(Icons.arrow_forward_ios_rounded, size: 16)
                            : item['read'] == true ? const Icon(Icons.done_all_rounded, size: 16) : const Icon(Icons.circle, size: 10),
                      ),
                    );
                  },
                )),
    );
  }
}
