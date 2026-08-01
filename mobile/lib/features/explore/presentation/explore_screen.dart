import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../feeds/presentation/feed_controller.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await ref.read(apiProvider).get('/api/explore');
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
      appBar: AppBar(title: const Text('Explore')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('Nothing to explore right now. Try again soon.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final item = _items[index];
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(child: Text((item['user_name'] as String? ?? 'U').substring(0, 1).toUpperCase())),
                        title: Text(item['content'] as String? ?? 'Post'),
                        subtitle: Text(item['user_name'] as String? ?? 'Mbogi Link'),
                      ),
                    );
                  },
                ),
    );
  }
}
