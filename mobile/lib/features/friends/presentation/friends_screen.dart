import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/utils/profile_image.dart';
import '../../feeds/presentation/feed_controller.dart';

class FriendsScreen extends ConsumerStatefulWidget {
  const FriendsScreen({super.key});

  @override
  ConsumerState<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends ConsumerState<FriendsScreen> {
  List<Map<String, dynamic>> _friends = [];
  List<Map<String, dynamic>> _discover = [];
  List<Map<String, dynamic>> _incoming = [];
  List<Map<String, dynamic>> _outgoing = [];
  bool _loading = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = ref.read(apiProvider);
      final friendsResult = await api.get('/api/friends');
      final discoverResult = await api.get('/api/users/discover');
      final requestsResult = await api.get('/api/friend-requests');
      if (mounted) {
        setState(() {
          _friends = (friendsResult['data'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
          _discover = (discoverResult['data'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
          _incoming = (requestsResult['incoming'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
          _outgoing = (requestsResult['outgoing'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
        });
      }
    } catch (_) {
      if (mounted) setState(() { _friends = const []; _discover = const []; _incoming = const []; _outgoing = const []; });
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

  Future<void> _acceptRequest(Map<String, dynamic> request) async {
    final requestId = request['id'];
    if (requestId == null || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiProvider).post('/api/accept-friend-request', data: {'requestId': requestId});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Friend request accepted.')));
        await _load();
      }
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _declineRequest(Map<String, dynamic> request) async {
    final requestId = request['id'];
    if (requestId == null || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiProvider).delete('/api/friend-requests/$requestId');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Friend request declined.')));
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
      appBar: AppBar(title: const Text('Friends')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_incoming.isNotEmpty) ...[
                    Text('Incoming requests', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    ..._incoming.map((request) {
                      final user = request['user'] as Map<String, dynamic>? ?? {};
                      final photo = resolveProfileImageUrl((user['picture'] as String?) ?? (user['avatar'] as String?) ?? (user['profile_pic'] as String?));
                      return Card(
                        child: ListTile(
                          leading: GestureDetector(
                            onTap: () => context.push('/profile/${user['id']}'),
                            child: CircleAvatar(
                              backgroundImage: photo == null ? null : CachedNetworkImageProvider(photo),
                              child: photo == null ? Text((user['name'] as String? ?? 'U').substring(0, 1).toUpperCase()) : null,
                            ),
                          ),
                          title: Text(user['name'] as String? ?? 'Friend request'),
                          subtitle: Text(user['description'] as String? ?? 'Wants to connect'),
                          trailing: Row(mainAxisSize: MainAxisSize.min, children: [FilledButton.tonal(onPressed: _busy ? null : () => _acceptRequest(request), child: const Text('Accept')), const SizedBox(width: 8), TextButton(onPressed: _busy ? null : () => _declineRequest(request), child: const Text('Decline'))]),
                        ),
                      );
                    }),
                    const SizedBox(height: 16),
                  ],
                  if (_outgoing.isNotEmpty) ...[
                    Text('Pending requests', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    ..._outgoing.map((request) {
                      final user = request['user'] as Map<String, dynamic>? ?? {};
                      final photo = resolveProfileImageUrl((user['picture'] as String?) ?? (user['avatar'] as String?) ?? (user['profile_pic'] as String?));
                      return Card(
                        child: ListTile(
                          leading: GestureDetector(
                            onTap: () => context.push('/profile/${user['id']}'),
                            child: CircleAvatar(
                              backgroundImage: photo == null ? null : CachedNetworkImageProvider(photo),
                              child: photo == null ? Text((user['name'] as String? ?? 'U').substring(0, 1).toUpperCase()) : null,
                            ),
                          ),
                          title: Text(user['name'] as String? ?? 'Pending request'),
                          subtitle: const Text('Waiting for a response'),
                        ),
                      );
                    }),
                    const SizedBox(height: 16),
                  ],
                  Text('Discover people', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  if (_discover.isEmpty)
                    const Card(child: ListTile(title: Text('No new people to discover right now.')))
                  else
                    ..._discover.map((user) {
                      final photo = resolveProfileImageUrl((user['picture'] as String?) ?? (user['avatar'] as String?) ?? (user['profile_pic'] as String?));
                      return Card(
                        child: ListTile(
                          leading: GestureDetector(
                            onTap: () => context.push('/profile/${user['id']}'),
                            child: CircleAvatar(
                              backgroundImage: photo == null ? null : CachedNetworkImageProvider(photo),
                              child: photo == null ? Text((user['name'] as String? ?? 'U').substring(0, 1).toUpperCase()) : null,
                            ),
                          ),
                          title: Text(user['name'] as String? ?? 'New connection'),
                          subtitle: Text(user['description'] as String? ?? 'Open profile to learn more'),
                          trailing: FilledButton(onPressed: _busy ? null : () => _sendRequest(user), child: const Text('Add')),
                        ),
                      );
                    }),
                  const SizedBox(height: 16),
                  Text('Your friends', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  if (_friends.isEmpty)
                    const Card(child: ListTile(title: Text('No friends yet. Start by exploring new people.')))
                  else
                    ..._friends.map((friend) {
                      final photo = resolveProfileImageUrl((friend['profile_pic'] as String?) ?? (friend['picture'] as String?) ?? (friend['avatar'] as String?));
                      return Card(
                        child: ListTile(
                          leading: GestureDetector(
                            onTap: () => context.push('/profile/${friend['id']}'),
                            child: CircleAvatar(
                              backgroundImage: photo == null ? null : CachedNetworkImageProvider(photo),
                              child: photo == null ? Text((friend['name'] as String? ?? 'U').substring(0, 1).toUpperCase()) : null,
                            ),
                          ),
                          title: Text(friend['name'] as String? ?? 'Friend'),
                          subtitle: const Text('Connected on Mbogi Link'),
                          onTap: () => context.push('/profile/${friend['id']}'),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}
