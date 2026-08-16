import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../explore/presentation/explore_screen.dart';
import '../../feeds/presentation/feed_screen.dart';
import '../../messages/presentation/messages_screen.dart';
import '../../notifications/presentation/notifications_screen.dart';
import '../../profile/presentation/profile_screen.dart';
import '../../feeds/presentation/feed_controller.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> with WidgetsBindingObserver {
  var _index = 0;
  var _messageUnread = 0;
  var _notificationUnread = 0;
  Timer? _badgeTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refreshBadges();
    _badgeTimer = Timer.periodic(const Duration(seconds: 30), (_) => _refreshBadges());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _badgeTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshBadges();
    }
  }

  Future<void> _refreshBadges() async {
    try {
      final api = ref.read(apiProvider);
      final messages = await api.get('/api/messages/unread-count');
      final notifications = await api.get('/api/notifications/unread-count');
      if (!mounted) return;
      setState(() {
        _messageUnread = _readCount(messages);
        _notificationUnread = _readCount(notifications);
      });
    } catch (_) {
      // A badge must never prevent the shell from being usable offline.
    }
  }

  int _readCount(Map<String, dynamic> response) {
    final data = response['data'];
    final value = data is Map ? data['unread_count'] : response['unread_count'];
    return value is num ? value.toInt() : int.tryParse('$value') ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      const FeedScreen(),
      const ExploreScreen(),
      const MessagesScreen(),
      const NotificationsScreen(),
      const ProfileScreen(),
      // Story camera route placeholder
      // When selected, we'll push the camera route instead of embedding it.
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index < 2 ? _index : _index + 1,
        onDestinationSelected: (value) {
          if (value == 2) {
            context.push('/posts/create');
            return;
          }
          // The last destination opens the story camera instead of a page
          if (value == 6) {
            context.push('/stories/camera');
            return;
          }
          setState(() => _index = value > 2 ? value - 1 : value);
          _refreshBadges();
        },
        labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
        destinations: [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Explore'),
          const NavigationDestination(icon: Icon(Icons.add_circle_outline), selectedIcon: Icon(Icons.add_circle), label: 'Create'),
          NavigationDestination(icon: _BadgeIcon(icon: Icons.chat_bubble_outline, count: _messageUnread), selectedIcon: _BadgeIcon(icon: Icons.chat_bubble, count: _messageUnread), label: 'Messages'),
          NavigationDestination(icon: _BadgeIcon(icon: Icons.notifications_outlined, count: _notificationUnread), selectedIcon: _BadgeIcon(icon: Icons.notifications, count: _notificationUnread), label: 'Alerts'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
          // Quick access to story camera for prototyping
          NavigationDestination(icon: Icon(Icons.camera_alt_outlined), selectedIcon: Icon(Icons.camera_alt), label: 'Story'),
        ],
      ),
    );
  }
}

class _BadgeIcon extends StatelessWidget {
  const _BadgeIcon({required this.icon, required this.count});
  final IconData icon;
  final int count;

  @override
  Widget build(BuildContext context) => Badge(
        isLabelVisible: count > 0,
        label: Text(count > 99 ? '99+' : count > 9 ? '9+' : '$count'),
        child: Icon(icon),
      );
}
