import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../feeds/presentation/feed_controller.dart';
import '../../../shared/utils/profile_image.dart';
import '../../../shared/widgets/top_menu.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  List<Map<String, dynamic>> _chats = [];
  List<Map<String, dynamic>> _friends = [];
  final _search = TextEditingController();
  String _query = '';
  String _filter = 'All';
  bool _loading = true;
  bool _refreshing = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (_refreshing) return;
    _refreshing = true;
    try {
      final result = await ref.read(apiProvider).get('/api/chats');
      final raw = result['data'] is List
          ? result['data']
          : (result is List ? result : (result['items'] is List ? result['items'] : const []));
      final list = (raw as List?) ?? const [];
      if (mounted) setState(() => _chats = list.cast<Map<String, dynamic>>());
    } catch (_) {
      if (mounted && _chats.isEmpty) setState(() => _chats = const []);
      if (mounted && _chats.isNotEmpty) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Couldn't refresh messages. Check your connection and try again.")));
    } finally {
      _refreshing = false;
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
                              backgroundImage: resolveProfileImageUrl(photo) == null ? null : CachedNetworkImageProvider(resolveProfileImageUrl(photo)!),
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
    final pinned = chat['pinned'] == true;
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
                onTap: () async {
                  Navigator.pop(sheetContext);
                  try { await ref.read(apiProvider).patch('/api/chats/$idValue', data: {'pinned': !pinned}); await _load(); } catch (_) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to update this conversation.'))); }
                },
              ),
              ListTile(leading: const Icon(Icons.star_outline), title: Text(chat['favourite'] == true ? 'Remove favourite' : 'Add favourite'), onTap: () async { Navigator.pop(sheetContext); try { await ref.read(apiProvider).patch('/api/chats/$idValue', data: {'favourite': chat['favourite'] != true}); await _load(); } catch (_) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to update this conversation.'))); } }),
              ListTile(
                leading: const Icon(Icons.delete_outline),
                title: const Text('Delete conversation'),
                onTap: () async {
                  Navigator.pop(sheetContext);
                  final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(title: const Text('Delete conversation?'), content: const Text('Your conversation history will be removed from your messages list.'), actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete'))]));
                  if (confirmed != true) return;
                  try { await ref.read(apiProvider).delete('/api/chats/$idValue'); if (mounted) setState(() => _chats.removeWhere((item) => item['id'] == chat['id'])); } catch (_) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to delete this conversation.'))); }
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
    final orderedChats = _chats.where((chat) {
      final matchesQuery = _query.isEmpty || '${chat['name']} ${chat['last_message']}'.toLowerCase().contains(_query.toLowerCase());
      final matchesFilter = _filter == 'All' || (_filter == 'Unread' && (chat['unread_count'] as int? ?? 0) > 0) || (_filter == 'Favourites' && chat['favourite'] == true);
      return matchesQuery && matchesFilter;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh), tooltip: 'Refresh messages'),
          IconButton(onPressed: _toggleFriendsSheet, icon: const Icon(Icons.people_alt_outlined), tooltip: 'Friends list'),
          const TopMenuButton(),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : orderedChats.isEmpty
              ? RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                      TextField(controller: _search, onChanged: (value) => setState(() => _query = value), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search conversations')),
                      const SizedBox(height: 10),
                      SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [for (final filter in ['All', 'Unread', 'Favourites']) Padding(padding: const EdgeInsets.only(right: 8), child: FilterChip(label: Text(filter), selected: _filter == filter, onSelected: (_) => setState(() => _filter = filter)))])),
                      const SizedBox(height: 72),
                      Icon(_filter == 'Unread' ? Icons.mark_chat_read_outlined : Icons.chat_bubble_outline, size: 52, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(height: 16),
                      Text(_query.isNotEmpty ? 'No conversations match your search.' : _filter == 'All' ? 'No conversations yet' : 'No ${_filter.toLowerCase()} conversations', textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      const Text('Start chatting with your friends or pull down to refresh.', textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      FilledButton.icon(onPressed: _toggleFriendsSheet, icon: const Icon(Icons.add_comment_outlined), label: const Text('Start a conversation')),
                    ],
                  ),
                )
              : RefreshIndicator(onRefresh: _load, child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: orderedChats.length + 1,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    if (index == 0) return Column(children: [TextField(controller: _search, onChanged: (value) => setState(() => _query = value), decoration: InputDecoration(prefixIcon: const Icon(Icons.search), suffixIcon: _query.isEmpty ? null : IconButton(onPressed: () { _search.clear(); setState(() => _query = ''); }, icon: const Icon(Icons.clear)), hintText: 'Search conversations')), const SizedBox(height: 10), SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [for (final filter in ['All', 'Unread', 'Favourites']) Padding(padding: const EdgeInsets.only(right: 8), child: FilterChip(label: Text(filter), selected: _filter == filter, onSelected: (_) => setState(() => _filter = filter)))]))]);
                    final chat = orderedChats[index - 1];
                    final pinned = chat['pinned'] == true;
                    return Card(
                      child: ListTile(
                        leading: GestureDetector(
                          onTap: () => context.push('/profile/${chat['id']}'),
                          child: CircleAvatar(backgroundImage: resolveProfileImageUrl(chat['profile_pic'] as String?) == null ? null : CachedNetworkImageProvider(resolveProfileImageUrl(chat['profile_pic'] as String?)!), child: chat['profile_pic'] == null ? Text((chat['name'] as String? ?? 'U').substring(0, 1).toUpperCase()) : null),
                        ),
                        title: Row(
                          children: [
                            Expanded(child: Text(chat['name'] as String? ?? 'Conversation')),
                            if (pinned) const Icon(Icons.push_pin, size: 16),
                            if (chat['favourite'] == true) const Icon(Icons.star, size: 16),
                          ],
                        ),
                        subtitle: Text(chat['last_message'] as String? ?? 'Start a conversation'),
                        trailing: chat['unread_count'] != null && (chat['unread_count'] as int) > 0 ? Chip(label: Text('${chat['unread_count']}')) : null,
                        onTap: () => context.push('/messages/${chat['id']}', extra: chat['name'] as String? ?? 'Conversation'),
                        onLongPress: () => _showConversationActions(chat),
                      ),
                    );
                  },
                )),
    );
  }
}
