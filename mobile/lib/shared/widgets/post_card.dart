import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../models/post.dart';
import 'post_media.dart';

class PostCard extends StatelessWidget {
  const PostCard({super.key, required this.post, required this.onLike, required this.onDelete, required this.onComments, required this.onBookmark, this.onEdit, this.onUserTap});

  final Post post;
  final VoidCallback onLike;
  final Future<void> Function() onDelete;
  final VoidCallback onComments;
  final VoidCallback onBookmark;
  final VoidCallback? onEdit;
  final VoidCallback? onUserTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                GestureDetector(
                  onTap: onUserTap,
                  child: CircleAvatar(
                    radius: 22,
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    foregroundImage: post.authorPhoto == null ? null : CachedNetworkImageProvider(post.authorPhoto!),
                    child: Text(post.author.isEmpty ? 'U' : post.author.substring(0, 1).toUpperCase()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      InkWell(onTap: onUserTap, child: Text(post.author, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700))),
                      Text(_date(post.createdAt), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    ],
                  ),
                ),
                if (post.isOwner)
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'edit') {
                        onEdit?.call();
                      } else if (value == 'delete') {
                        onDelete();
                      }
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'edit', child: Text('Edit post')),
                      PopupMenuItem(value: 'delete', child: Text('Delete post')),
                    ],
                  ),
              ],
            ),
            if (post.content?.isNotEmpty == true)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(post.content!),
              ),
            if (post.mediaUrl != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: PostMedia(url: post.mediaUrl!, type: post.mediaType),
                ),
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  onPressed: onLike,
                  icon: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 180),
                    child: Icon(
                      post.liked ? Icons.favorite : Icons.favorite_border,
                      key: ValueKey(post.liked),
                      color: post.liked ? Colors.red : null,
                    ),
                  ),
                  tooltip: post.liked ? 'Unlike' : 'Like',
                ),
                Text('${post.likes}'),
                const Spacer(),
                IconButton(onPressed: onComments, icon: const Icon(Icons.mode_comment_outlined), tooltip: 'Comment'),
                IconButton(
                  onPressed: onBookmark,
                  icon: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 180),
                    child: Icon(
                      post.bookmarked ? Icons.bookmark : Icons.bookmark_border,
                      key: ValueKey(post.bookmarked),
                      color: post.bookmarked ? Colors.red : null,
                    ),
                  ),
                  tooltip: post.bookmarked ? 'Remove bookmark' : 'Bookmark',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _date(DateTime value) {
    final local = value.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }
}
