import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../models/post.dart';

class PostCard extends StatelessWidget {
  const PostCard({super.key, required this.post, required this.onLike, required this.onDelete});

  final Post post;
  final VoidCallback onLike;
  final Future<void> Function() onDelete;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(child: Text(post.author.isEmpty ? 'U' : post.author.substring(0, 1).toUpperCase())),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(post.author, style: Theme.of(context).textTheme.titleSmall),
                      Text(_date(post.createdAt), style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                if (post.isOwner)
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'delete') {
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
                  child: CachedNetworkImage(
                    imageUrl: post.mediaUrl!,
                    fit: BoxFit.cover,
                    errorWidget: (_, _, _) => const AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Center(child: Icon(Icons.broken_image_outlined)),
                    ),
                  ),
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
                IconButton(onPressed: () {}, icon: const Icon(Icons.mode_comment_outlined), tooltip: 'Comment'),
                IconButton(onPressed: () {}, icon: Icon(post.bookmarked ? Icons.bookmark : Icons.bookmark_border), tooltip: 'Bookmark'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _date(DateTime value) => '${value.day}/${value.month}/${value.year}';
}
