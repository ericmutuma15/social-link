import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/post.dart';
import '../../../shared/widgets/app_async.dart';
import '../../../shared/widgets/post_card.dart';
import 'feed_controller.dart';
import 'comments_sheet.dart';

class FeedScreen extends ConsumerWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(feedProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(children: [Image.asset('assets/Designer.png', width: 30, height: 30), const SizedBox(width: 8), const Text('Mbogi Link')]),
        actions: [
          IconButton(onPressed: () => context.push('/posts/create'), icon: const Icon(Icons.add_circle_outline), tooltip: 'Create post'),
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
            onRefresh: () => ref.read(feedProvider.notifier).refresh(),
            child: posts.isEmpty
                ? ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      const SizedBox(height: 80),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            children: [
                              Icon(Icons.auto_awesome_outlined, size: 44, color: Theme.of(context).colorScheme.primary),
                              const SizedBox(height: 12),
                              Text('Your feed is ready', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                              const SizedBox(height: 8),
                              Text('Follow more people and the latest posts will appear here.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
                            ],
                          ),
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: posts.length,
                    itemBuilder: (context, index) {
                      final post = posts[index];
                      return AnimatedSize(
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
                          onComments: () => showModalBottomSheet(context: context, isScrollControlled: true, showDragHandle: false, builder: (_) => CommentsSheet(postId: post.id)),
                        ),
                      );
                    },
                  ),
          );
        },
      ),
    );
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
