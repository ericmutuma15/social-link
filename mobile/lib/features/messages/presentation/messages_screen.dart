import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../feeds/presentation/feed_controller.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  List<Map<String, dynamic>> _chats = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await ref.read(apiProvider).get('/api/chats');
      setState(() => _chats = (result as List<dynamic>? ?? []).cast<Map<String, dynamic>>());
    } catch (_) {
      setState(() => _chats = const []);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _chats.isEmpty
              ? const Center(child: Text('No conversations yet. Start a conversation from your network.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _chats.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final chat = _chats[index];
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(child: Text((chat['name'] as String? ?? 'U').substring(0, 1).toUpperCase())),
                        title: Text(chat['name'] as String? ?? 'Conversation'),
                        subtitle: Text(chat['last_message'] as String? ?? 'Start a conversation'),
                        trailing: chat['unread_count'] != null && (chat['unread_count'] as int) > 0 ? Chip(label: Text('${chat['unread_count']}')) : null,
                      ),
                    );
                  },
                ),
    );
  }
}
