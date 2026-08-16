import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../feeds/presentation/comments_sheet.dart';
import '../../feeds/presentation/feed_controller.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  bool _loading = false;
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _posts = [];
  final ScrollController _scrollController = ScrollController();
  bool _scrollListenerAttached = false;
  int _page = 1;
  bool _hasMore = true;
  bool _loadingMore = false;
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    _debounce?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(value.trim()));
  }

  Future<void> _search(String q) async {
    _query = q;
    _page = 1;
    _hasMore = true;
    if (q.isEmpty) {
      if (mounted) {
        setState(() {
          _users = [];
          _posts = [];
          _loading = false;
        });
      }
      return;
    }
    if (mounted) {
      setState(() {
        _loading = true;
      });
    }
    try {
      final res = await ref.read(apiProvider).get('/api/search', query: {'q': q, 'page': _page});
      final data = res['data'];
      List<Map<String, dynamic>> users = [];
      List<Map<String, dynamic>> posts = [];
      if (data is Map) {
        users = (data['users'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
        posts = (data['posts'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
      } else if (data is List) {
        // fallback: split by type field
        for (final item in data) {
          if (item is Map<String, dynamic> && (item['type'] == 'user' || (item['user_id'] != null && item['content'] == null))) {
            users.add(item);
          } else if (item is Map<String, dynamic>) {
            posts.add(item);
          }
        }
      }
      if (mounted) {
        setState(() {
          _users = users;
          _posts = posts;
        });
        // attach scroll listener once
        if (!_scrollListenerAttached) {
          _scrollController.addListener(() {
            if (_scrollController.position.pixels > _scrollController.position.maxScrollExtent - 200) {
              _loadMore();
            }
          });
          _scrollListenerAttached = true;
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _users = [];
          _posts = [];
        });
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadMore() async {
    if (!_hasMore || _loadingMore || _loading || _query.isEmpty) return;
    _loadingMore = true;
    _page++;
    try {
      final res = await ref.read(apiProvider).get('/api/search', query: {'q': _query, 'page': _page});
      final data = res['data'];
      List<Map<String, dynamic>> users = [];
      List<Map<String, dynamic>> posts = [];
      if (data is Map) {
        users = (data['users'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
        posts = (data['posts'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
      } else if (data is List) {
        for (final item in data) {
          if (item is Map<String, dynamic> && (item['type'] == 'user' || (item['user_id'] != null && item['content'] == null))) {
            users.add(item);
          } else if (item is Map<String, dynamic>) {
            posts.add(item);
          }
        }
      }
      if (mounted) {
        setState(() {
          _users = [..._users, ...users];
          _posts = [..._posts, ...posts];
          if (users.isEmpty && posts.isEmpty) _hasMore = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _hasMore = false);
    } finally {
      _loadingMore = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * .85,
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Theme.of(context).colorScheme.outlineVariant, borderRadius: BorderRadius.circular(8))),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: TextField(controller: _controller, onChanged: _onChanged, decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search people and posts', border: OutlineInputBorder())),
              ),
              if (_loading) const Padding(padding: EdgeInsets.all(12), child: LinearProgressIndicator()),
              Expanded(
                child: _controller.text.isEmpty
                    ? const Center(child: Text('Search for people or posts'))
                    : ListView(controller: _scrollController, padding: const EdgeInsets.all(12), children: [
                        if (_users.isNotEmpty) ...[
                          Text('People', style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 8),
                          ..._users.map((u) => ListTile(
                                leading: CircleAvatar(backgroundImage: (u['photo'] as String?) == null ? null : CachedNetworkImageProvider(u['photo'] as String)),
                                title: Text(u['name'] as String? ?? u['username'] as String? ?? 'User'),
                                subtitle: Text(u['username'] as String? ?? ''),
                                onTap: () => Navigator.of(context).pushNamed('/profile', arguments: {'id': u['id']}),
                              ))
                        ],
                        if (_posts.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text('Posts', style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 8),
                          ..._posts.map((p) => ListTile(
                                title: Text((p['content'] as String?) ?? ''),
                                subtitle: Text((p['author'] as String?) ?? ''),
                                onTap: () => showModalBottomSheet(context: context, isScrollControlled: true, builder: (_) => CommentsSheet(postId: p['id'] as int)),
                              ))
                        ]
                        , if (_loadingMore) const Padding(padding: EdgeInsets.all(12), child: Center(child: CircularProgressIndicator()))
                      ]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
