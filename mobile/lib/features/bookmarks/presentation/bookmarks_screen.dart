import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/post.dart';
import '../../../shared/widgets/post_card.dart';
import '../../feeds/presentation/comments_sheet.dart';
import '../../feeds/presentation/feed_controller.dart';

class BookmarksScreen extends ConsumerStatefulWidget {
  const BookmarksScreen({super.key});

  @override
  ConsumerState<BookmarksScreen> createState() => _BookmarksScreenState();
}

class _BookmarksScreenState extends ConsumerState<BookmarksScreen> {
  List<Post> _posts = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ref.read(apiProvider).get('/api/bookmarks');
      final items = (data['items'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
      if (mounted) setState(() => _posts = items.map(Post.fromJson).toList());
    } catch (_) {
      if (mounted) setState(() => _posts = const []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bookmarks')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _posts.isEmpty
                  ? const Center(child: Text('No saved posts yet. Bookmark something from your feed.'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: _posts.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final post = _posts[index];
                        return PostCard(
                          post: post,
                          onUserTap: post.userId == null ? null : () => context.push('/profile/${post.userId}'),
                          onLike: () async {
                            try {
                              await ref.read(feedProvider.notifier).toggleLike(post);
                              await _load();
                            } catch (_) {
                              if (context.mounted) _notice(context, 'Unable to update your reaction.');
                            }
                          },
                          onDelete: () => _confirmDelete(context, ref, post),
                          onEdit: () => _editPost(context, ref, post),
                          onComments: () => showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            showDragHandle: false,
                            builder: (_) => CommentsSheet(postId: post.id),
                          ),
                          onBookmark: () async {
                            try {
                              await ref.read(feedProvider.notifier).toggleBookmark(post);
                              await _load();
                            } catch (_) {
                              if (context.mounted) _notice(context, 'Unable to update your bookmark.');
                            }
                          },
                        );
                      },
                    ),
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
      await _load();
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
      await _load();
    } catch (_) {
      if (context.mounted) _notice(context, 'Unable to delete this post. Please try again.');
    }
  }

  void _notice(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}
