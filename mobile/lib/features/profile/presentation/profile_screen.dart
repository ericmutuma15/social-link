import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/utils/profile_image.dart';
import '../../feeds/presentation/feed_controller.dart';
import '../../../shared/widgets/top_menu.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key, this.userId});
  final int? userId;

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  Map<String, dynamic>? _user;
  List<Map<String, dynamic>> _posts = const [];
  List<Map<String, dynamic>> _friends = const [];
  bool _loading = true;
  bool _sendingRequest = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = ref.read(apiProvider);
      final endpoint = widget.userId == null ? '/api/current_user' : '/api/user/${widget.userId}';
      final userData = await api.get(endpoint);
      final user = userData['data'] is Map ? Map<String, dynamic>.from(userData['data'] as Map) : Map<String, dynamic>.from(userData);
      final postsEndpoint = widget.userId == null ? '/api/user_posts' : '/api/user_posts/${widget.userId}';
      final postsData = await api.get(postsEndpoint);
      final rawPosts = (postsData['posts'] as List<dynamic>? ?? (postsData['data'] as List<dynamic>? ?? const []));
      final friendsData = widget.userId == null ? await api.get('/api/friends') : const {};
      final rawFriends = widget.userId == null
          ? ((friendsData['data'] is List ? friendsData['data'] : const []) as List<dynamic>? ?? const [])
          : const <dynamic>[];
      if (mounted) {
        setState(() {
          _user = user;
          _posts = rawPosts.cast<Map<String, dynamic>>();
          _friends = rawFriends.cast<Map<String, dynamic>>();
        });
      }
    } catch (_) {
      if (mounted) setState(() { _user = {}; _posts = const []; _friends = const []; });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendFriendRequest() async {
    if (widget.userId == null || _sendingRequest) return;
    setState(() => _sendingRequest = true);
    try {
      await ref.read(apiProvider).post('/api/send-friend-request', data: {'userId': widget.userId});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Friend request sent.')));
        await _load();
      }
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) setState(() => _sendingRequest = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = _user ?? {};
    final picture = resolveProfileImageUrl((user['avatar'] as String?) ?? (user['picture'] as String?));
    final viewingOwnProfile = widget.userId == null;
    return Scaffold(
      appBar: AppBar(title: Text(viewingOwnProfile ? 'Profile' : (user['name'] as String? ?? 'Profile')), actions: viewingOwnProfile ? [IconButton(onPressed: () => context.push('/profile/edit'), icon: const Icon(Icons.edit_outlined), tooltip: 'Edit profile'), IconButton(onPressed: () => context.push('/settings'), icon: const Icon(Icons.settings_outlined)), const TopMenuButton()] : [const TopMenuButton()]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          CircleAvatar(radius: 48, backgroundImage: picture != null ? CachedNetworkImageProvider(picture) : null, child: picture == null ? Text((user['name'] as String? ?? 'U').substring(0, 1).toUpperCase()) : null),
                          const SizedBox(height: 12),
                          Text(user['name'] as String? ?? 'Your profile', style: Theme.of(context).textTheme.titleLarge),
                          const SizedBox(height: 4),
                          Text(user['email'] as String? ?? '', style: Theme.of(context).textTheme.bodyMedium),
                          if ((user['description'] as String?).isNotNullAndNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(user['description'] as String, textAlign: TextAlign.center),
                          ],
                          if ((user['location'] as String?).isNotNullAndNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text('📍 ${user['location']}', style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (viewingOwnProfile) ...[
                    FilledButton.icon(onPressed: () => context.push('/profile/edit'), icon: const Icon(Icons.edit_outlined), label: const Text('Edit profile')),
                    const SizedBox(height: 8),
                  ] else if (user['is_friend'] == true) ...[
                    FilledButton.icon(onPressed: null, icon: const Icon(Icons.check_circle_outline), label: const Text('Already friends')),
                    const SizedBox(height: 8),
                  ] else ...[
                    FilledButton.icon(onPressed: _sendingRequest ? null : _sendFriendRequest, icon: const Icon(Icons.person_add_alt_1_outlined), label: Text(_sendingRequest ? 'Sending...' : 'Add friend')),
                    const SizedBox(height: 8),
                  ],
                  _StatTile(Icons.group_outlined, 'Friends', '${user['friend_count'] ?? 0}', () => context.push('/friends')),
                  _StatTile(Icons.forum_outlined, 'Messages', 'Open chat', () => context.push('/messages')),
                  if (viewingOwnProfile && _friends.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text('Your friends', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    ..._friends.take(5).map((friend) {
                      final photo = resolveProfileImageUrl((friend['profile_pic'] as String?) ?? (friend['picture'] as String?) ?? (friend['avatar'] as String?));
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundImage: photo == null ? null : CachedNetworkImageProvider(photo),
                            child: photo == null ? Text((friend['name'] as String? ?? 'U').substring(0, 1).toUpperCase()) : null,
                          ),
                          title: Text(friend['name'] as String? ?? 'Friend'),
                          onTap: () => context.push('/profile/${friend['id']}'),
                        ),
                      );
                    }),
                  ],
                  const SizedBox(height: 16),
                  Text('Posts', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  if (_posts.isEmpty)
                    Card(child: Padding(padding: const EdgeInsets.all(20), child: Text(viewingOwnProfile ? 'You have not posted anything yet.' : 'This user has not shared any posts yet.', textAlign: TextAlign.center)))
                  else ..._posts.map((post) {
                    final mediaUrl = post['media_url'] as String?;
                    final resolvedMedia = resolveProfileImageUrl(mediaUrl);
                    final content = post['content'] as String? ?? '';
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (content.isNotEmpty) ...[
                              Text(content),
                              const SizedBox(height: 12),
                            ],
                            if (resolvedMedia != null && resolvedMedia.isNotEmpty)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: CachedNetworkImage(
                                  imageUrl: resolvedMedia,
                                  fit: BoxFit.cover,
                                  placeholder: (_, _) => const SizedBox(height: 180, child: Center(child: CircularProgressIndicator())),
                                  errorWidget: (_, _, _) => const SizedBox(height: 180, child: Center(child: Icon(Icons.broken_image_outlined))),
                                ),
                              ),
                            const SizedBox(height: 8),
                            Text('${post['like_count'] ?? 0} likes', style: Theme.of(context).textTheme.labelMedium),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile(this.icon, this.title, this.value, this.onTap);
  final IconData icon;
  final String title;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(value),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

extension on String? {
  bool get isNotNullAndNotEmpty => this != null && this!.isNotEmpty;
}
