import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../feeds/presentation/feed_controller.dart';
import '../../../shared/widgets/top_menu.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  List<Map<String, dynamic>> _chats = [];
  List<Map<String, dynamic>> _friends = [];
  final Set<int> _pinned = <int>{};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await ref.read(apiProvider).get('/api/chats');
      final raw = result['data'] is List
          ? result['data']
          : (result is List ? result : (result['items'] is List ? result['items'] : const []));
      final list = (raw as List?) ?? const [];
      if (mounted) setState(() => _chats = list.cast<Map<String, dynamic>>());
    } catch (_) {
      if (mounted) setState(() => _chats = const []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadFriends() async {
    try {
      final result = await ref.read(apiProvider).get('/api/friends');
      final raw = result['data'] is List
          ? result['data']
          : (result is List ? result : const []);
      final friends = (raw as List?) ?? const [];
      if (mounted) {
        setState(() => _friends = friends.cast<Map<String, dynamic>>());
      }
    } catch (_) {
      if (mounted) setState(() => _friends = const []);
    }
  }

  void _toggleFriendsSheet() {
    _loadFriends();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.65,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          builder: (_, scrollController) => Column(
            children: [
              const SizedBox(height: 12),
              Container(width: 36, height: 4, decoration: BoxDecoration(color: Theme.of(context).colorScheme.outline, borderRadius: BorderRadius.circular(99))),
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Start a chat', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ),
              Expanded(
                child: _friends.isEmpty
                    ? const Center(child: Text('No friends yet. Add someone in Explore or Friends.'))
                    : ListView.separated(
                        controller: scrollController,
                        itemCount: _friends.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final friend = _friends[index];
                          final photo = (friend['profile_pic'] as String?) ?? (friend['picture'] as String?);
                          final name = friend['name'] as String? ?? 'Friend';
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundImage: photo == null || photo.isEmpty ? null : CachedNetworkImageProvider(photo),
                              child: (photo == null || photo.isEmpty) ? Text(name.substring(0, 1).toUpperCase()) : null,
                            ),
                            title: Text(name),
                            trailing: const Icon(Icons.chat_bubble_outline),
                            onTap: () async {
                              final friendId = int.tryParse(friend['id']?.toString() ?? '');
                              if (friendId == null) return;
                              if (mounted) Navigator.of(sheetContext).pop();
                              if (!mounted) return;
                              context.push('/messages/$friendId', extra: name);
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showConversationActions(Map<String, dynamic> chat) {
    final id = chat['id'];
    final idValue = int.tryParse(id.toString()) ?? -1;
    final pinned = _pinned.contains(idValue);
    showModalBottomSheet(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.push_pin_outlined),
                title: Text(pinned ? 'Unpin conversation' : 'Pin to top'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  setState(() {
                    final idValue = int.tryParse(id?.toString() ?? '') ?? -1;
                    if (pinned) {
                      _pinned.remove(idValue);
                    } else {
                      _pinned.add(idValue);
                    }
                    _chats.sort((a, b) {
                      final aId = int.tryParse(a['id'].toString()) ?? -1;
                      final bId = int.tryParse(b['id'].toString()) ?? -1;
                      final aP = _pinned.contains(aId) ? 1 : 0;
                      final bP = _pinned.contains(bId) ? 1 : 0;
                      if (aP != bP) return bP.compareTo(aP);
                      return (b['last_message_at'] as String? ?? '').compareTo(a['last_message_at'] as String? ?? '');
                    });
                  });
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline),
                title: const Text('Delete conversation'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  setState(() => _chats.removeWhere((item) => item['id'] == chat['id']));
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final orderedChats = [..._chats]..sort((a, b) {
      final aId = int.tryParse(a['id'].toString()) ?? -1;
      final bId = int.tryParse(b['id'].toString()) ?? -1;
      final aPinned = _pinned.contains(aId) ? 1 : 0;
      final bPinned = _pinned.contains(bId) ? 1 : 0;
      if (aPinned != bPinned) return bPinned.compareTo(aPinned);
      return (b['last_message_at'] as String? ?? '').compareTo(a['last_message_at'] as String? ?? '');
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          IconButton(onPressed: _toggleFriendsSheet, icon: const Icon(Icons.people_alt_outlined), tooltip: 'Friends list'),
          const TopMenuButton(),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : orderedChats.isEmpty
              ? const Center(child: Text('No conversations yet. Start a conversation from your network.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: orderedChats.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final chat = orderedChats[index];
                    final id = chat['id'];
                    final pinned = _pinned.contains(int.tryParse(id.toString()) ?? -1);
                    return Card(
                      child: ListTile(
                        leading: GestureDetector(
                          onTap: () => context.push('/profile/${chat['id']}'),
                          child: CircleAvatar(backgroundImage: chat['profile_pic'] == null ? null : CachedNetworkImageProvider(chat['profile_pic'] as String), child: chat['profile_pic'] == null ? Text((chat['name'] as String? ?? 'U').substring(0, 1).toUpperCase()) : null),
                        ),
                        title: Row(
                          children: [
                            Expanded(child: Text(chat['name'] as String? ?? 'Conversation')),
                            if (pinned) const Icon(Icons.push_pin, size: 16),
                          ],
                        ),
                        subtitle: Text(chat['last_message'] as String? ?? 'Start a conversation'),
                        trailing: chat['unread_count'] != null && (chat['unread_count'] as int) > 0 ? Chip(label: Text('${chat['unread_count']}')) : null,
                        onTap: () => context.push('/messages/${chat['id']}', extra: chat['name'] as String? ?? 'Conversation'),
                        onLongPress: () => _showConversationActions(chat),
                      ),
                    );
                  },
                ),
    );
  }
}
