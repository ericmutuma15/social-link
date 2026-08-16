import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class TopMenuButton extends StatelessWidget {
  const TopMenuButton({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.menu),
      tooltip: 'Menu',
      onPressed: () => showModalBottomSheet(
        context: context,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
        builder: (ctx) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            ListTile(leading: const Icon(Icons.chat_bubble_outline), title: const Text('Messages'), onTap: () => _nav(ctx, context, '/messages')),
            ListTile(leading: const Icon(Icons.notifications_outlined), title: const Text('Notifications'), onTap: () => _nav(ctx, context, '/notifications')),
            ListTile(leading: const Icon(Icons.bookmark_outline), title: const Text('Bookmarks'), onTap: () => _nav(ctx, context, '/bookmarks')),
            ListTile(leading: const Icon(Icons.person_outline), title: const Text('Profile'), onTap: () => _nav(ctx, context, '/profile')),
            ListTile(leading: const Icon(Icons.settings_outlined), title: const Text('Settings'), onTap: () => _nav(ctx, context, '/settings')),
            const SizedBox(height: 8),
          ]),
        ),
      ),
    );
  }

  void _nav(BuildContext sheetCtx, BuildContext ctx, String route) {
    Navigator.pop(sheetCtx);
    ctx.push(route);
  }
}
