import 'dart:ui';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/post.dart';
import '../../../shared/widgets/app_async.dart';
import '../../../shared/widgets/post_card.dart';
import '../../../core/theme/app_theme.dart';
import 'feed_controller.dart';
import 'comments_sheet.dart';
import '../../search/presentation/search_screen.dart';

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  List<Map<String, dynamic>> _stories = const [];
  bool _storiesLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStories();
  }

  Future<void> _loadStories() async {
    try {
      final result = await ref.read(apiProvider).get('/api/stories');
      final items = result is List ? result : (result['data'] is List ? result['data'] : const <dynamic>[]);
      if (mounted) {
        setState(() => _stories = (items as List<dynamic>).cast<Map<String, dynamic>>());
      }
    } catch (_) {
      if (mounted) setState(() => _stories = const []);
    } finally {
      if (mounted) setState(() => _storiesLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final feed = ref.watch(feedProvider);
    void openMenu() {
      showModalBottomSheet(
        context: context,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
        builder: (ctx) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            ListTile(leading: const Icon(Icons.chat_bubble_outline), title: const Text('Messages'), onTap: () { Navigator.pop(ctx); context.push('/messages'); }),
            ListTile(leading: const Icon(Icons.notifications_outlined), title: const Text('Notifications'), onTap: () { Navigator.pop(ctx); context.push('/notifications'); }),
            ListTile(leading: const Icon(Icons.bookmark_outline), title: const Text('Bookmarks'), onTap: () { Navigator.pop(ctx); context.push('/bookmarks'); }),
            ListTile(leading: const Icon(Icons.person_outline), title: const Text('Profile'), onTap: () { Navigator.pop(ctx); context.push('/profile'); }),
            ListTile(leading: const Icon(Icons.settings_outlined), title: const Text('Settings'), onTap: () { Navigator.pop(ctx); context.push('/settings'); }),
            const SizedBox(height: 8),
          ]),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Image.asset('assets/Designer.png', width: 30, height: 30),
        actions: [
          IconButton(
            onPressed: () => ref.read(themeModeProvider.notifier).toggle(Theme.of(context).brightness),
            icon: Icon(Theme.of(context).brightness == Brightness.dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
            tooltip: 'Toggle theme',
          ),
          IconButton(onPressed: () => showModalBottomSheet(context: context, isScrollControlled: true, builder: (_) => const SearchScreen()), icon: const Icon(Icons.search), tooltip: 'Search'),
          IconButton(onPressed: () => context.push('/posts/create'), icon: const Icon(Icons.add_circle_outline), tooltip: 'Create post'),
          const SizedBox(width: 4),
          IconButton(icon: const Icon(Icons.menu), onPressed: openMenu),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.4)),
        ),
      ),
      body: feed.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => AppAsync(message: 'Unable to load posts.', onRetry: () => ref.read(feedProvider.notifier).refresh()),
        data: (posts) {
          return RefreshIndicator(
            onRefresh: () async {
              await ref.read(feedProvider.notifier).refresh();
              await _loadStories();
            },
            child: ListView(
              padding: const EdgeInsets.only(bottom: 12),
              children: [
                if (!_storiesLoading || _stories.isNotEmpty)
                  SizedBox(
                    height: 112,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                      itemCount: _stories.isEmpty ? 1 : _stories.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 12),
                      itemBuilder: (context, index) {
                        if (_stories.isEmpty) {
                          return _EmptyStoryTile(onTap: () => context.push('/explore'));
                        }
                        final story = _stories[index];
                        final photo = story['picture'] as String? ?? story['user_photo'] as String?;
                        return _StoryTile(
                          name: story['name'] as String? ?? 'Story',
                          photo: photo,
                          onTap: () => _showStory(story),
                        );
                      },
                    ),
                  ),
                if (posts.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            Icon(Icons.auto_awesome_outlined, size: 44, color: Theme.of(context).colorScheme.primary),
                            const SizedBox(height: 12),
                            Text('Your feed is ready', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 8),
                            Text('You have no friends yet, so start by exploring posts and people to connect with.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
                            const SizedBox(height: 16),
                            FilledButton.icon(onPressed: () => context.push('/explore'), icon: const Icon(Icons.explore_outlined), label: const Text('Explore community')),
                          ],
                        ),
                      ),
                    ),
                  )
                else ...[
                  const SizedBox(height: 8),
                  for (final post in posts)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      child: AnimatedSize(
                        duration: const Duration(milliseconds: 220),
                        child: PostCard(
                          post: post,
                          onUserTap: post.userId == null ? null : () => context.push('/profile/${post.userId}'),
                          onLike: () async {
                            try {
                              await ref.read(feedProvider.notifier).toggleLike(post);
                            } catch (_) {
                              if (context.mounted) _notice(context, 'Unable to update your reaction.');
                            }
                          },
                          onDelete: () => _confirmDelete(context, ref, post),
                          onEdit: () => _editPost(context, ref, post),
                          onComments: () => showModalBottomSheet(context: context, isScrollControlled: true, showDragHandle: false, builder: (_) => CommentsSheet(postId: post.id)),
                          onBookmark: () async {
                            try {
                              await ref.read(feedProvider.notifier).toggleBookmark(post);
                            } catch (_) {
                              if (context.mounted) _notice(context, 'Unable to update your bookmark.');
                            }
                          },
                        ),
                      ),
                    ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  void _showStory(Map<String, dynamic> story) {
    final content = story['content'] as String?;
    final mediaUrl = story['media_url'] as String?;
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(story['name'] as String? ?? 'Story'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (mediaUrl != null && mediaUrl.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CachedNetworkImage(imageUrl: mediaUrl, fit: BoxFit.cover),
                ),
              const SizedBox(height: 12),
              if ((content ?? '').isNotEmpty) Text(content!),
            ],
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close'))],
      ),
    );
  }

  Future<void> _editPost(BuildContext context, WidgetRef ref, Post post) async {
    final controller = TextEditingController(text: post.content ?? '');
    final content = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Edit post'),
        content: TextField(controller: controller, minLines: 3, maxLines: 8, maxLength: 5000, autofocus: true, textCapitalization: TextCapitalization.sentences),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(dialogContext, controller.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    controller.dispose();
    if (content == null || content == (post.content ?? '')) return;
    try {
      await ref.read(feedProvider.notifier).updatePost(post, content);
      if (context.mounted) _notice(context, 'Post updated');
    } catch (_) {
      if (context.mounted) _notice(context, 'Your post could not be updated. Please try again.');
    }
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref, Post post) async {
    final confirmed = await showGeneralDialog<bool>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss',
      pageBuilder: (dialogContext, _, _) => AlertDialog(
        icon: const Icon(Icons.delete_forever_rounded, color: Colors.red, size: 40),
        title: const Text('Delete this post?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
      transitionBuilder: (_, animation, _, child) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 2, sigmaY: 2),
        child: ScaleTransition(
          scale: CurvedAnimation(parent: animation, curve: Curves.easeOutBack),
          child: child,
        ),
      ),
    );

    if (confirmed != true || !context.mounted) return;
    try {
      await ref.read(feedProvider.notifier).delete(post);
      if (context.mounted) _notice(context, 'Post deleted successfully');
    } catch (_) {
      if (context.mounted) _notice(context, 'Unable to delete this post. Please try again.');
    }
  }

  void _notice(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _StoryTile extends StatelessWidget {
  const _StoryTile({required this.name, required this.photo, required this.onTap});
  final String name;
  final String? photo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final initials = name.trim().isNotEmpty ? name.trim().substring(0, 1).toUpperCase() : 'S';
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 78,
        child: Column(
          children: [
            CircleAvatar(
              radius: 32,
              backgroundImage: photo == null ? null : CachedNetworkImageProvider(photo!),
              child: photo == null ? Text(initials) : null,
            ),
            const SizedBox(height: 6),
            Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

class _EmptyStoryTile extends StatelessWidget {
  const _EmptyStoryTile({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 78,
        child: Column(
          children: [
            CircleAvatar(radius: 32, child: const Icon(Icons.explore_outlined)),
            const SizedBox(height: 6),
            Text('Explore', textAlign: TextAlign.center, style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}
