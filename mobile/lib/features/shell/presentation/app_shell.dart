import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/utils/profile_image.dart';
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
  String? _profilePhoto;
  Timer? _badgeTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadCurrentUser();
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

  Future<void> _loadCurrentUser() async {
    try {
      final user = await ref.read(apiProvider).get('/api/current_user');
      final photo = user['avatar'] as String? ?? user['picture'] as String?;
      if (mounted) setState(() => _profilePhoto = resolveProfileImageUrl(photo));
    } catch (_) {
      if (mounted) setState(() => _profilePhoto = null);
    }
  }

  Future<void> _refreshBadges() async {
    try {
      final api = ref.read(apiProvider);
      final messages = await api.get('/api/messages/unread-count');
      final notifications = await api.get('/api/notifications/unread-count');
      if (!mounted) return;
      final messageCount = _readCount(messages);
      final notificationCount = _readCount(notifications);
      ref.read(messageUnreadProvider.notifier).state = messageCount;
      ref.read(notificationUnreadProvider.notifier).state = notificationCount;
      setState(() {});
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
    ];
    final messageUnread = ref.watch(messageUnreadProvider);
    final notificationUnread = ref.watch(notificationUnreadProvider);
    final profileIcon = _profilePhoto == null || _profilePhoto!.isEmpty
        ? const CircleAvatar(radius: 12, child: Icon(Icons.person, size: 14))
        : CircleAvatar(radius: 12, backgroundImage: CachedNetworkImageProvider(_profilePhoto!));

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) {
          if (value < 0 || value >= pages.length) return;
          setState(() => _index = value);
          _refreshBadges();
        },
        labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
        destinations: [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Explore'),
          NavigationDestination(icon: _BadgeIcon(icon: Icons.chat_bubble_outline, count: messageUnread), selectedIcon: _BadgeIcon(icon: Icons.chat_bubble, count: messageUnread), label: 'Messages'),
          NavigationDestination(icon: _BadgeIcon(icon: Icons.notifications_outlined, count: notificationUnread), selectedIcon: _BadgeIcon(icon: Icons.notifications, count: notificationUnread), label: 'Alerts'),
          NavigationDestination(icon: profileIcon, selectedIcon: profileIcon, label: 'Profile'),
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
