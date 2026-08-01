import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../feeds/presentation/feed_controller.dart';

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
      final data = result['items'] as List<dynamic>? ?? const [];
      setState(() => _items = data.cast<Map<String, dynamic>>());
    } catch (_) {
      setState(() => _items = const []);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
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
                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.notifications_active_outlined),
                        title: Text(item['message'] as String? ?? 'Update'),
                        subtitle: Text((item['created_at'] as String? ?? '').isNotEmpty ? item['created_at'] as String : 'Recently received'),
                      ),
                    );
                  },
                ),
    );
  }
}
