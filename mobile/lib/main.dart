import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'features/authentication/presentation/login_screen.dart';
import 'features/authentication/presentation/register_screen.dart';
import 'features/authentication/presentation/splash_screen.dart';
import 'features/explore/presentation/explore_screen.dart';
import 'features/friends/presentation/friends_screen.dart';
import 'features/messages/presentation/messages_screen.dart';
import 'features/notifications/presentation/notifications_screen.dart';
import 'features/profile/presentation/profile_screen.dart';
import 'features/settings/presentation/settings_screen.dart';
import 'features/posts/presentation/create_post_screen.dart';
import 'features/messages/presentation/chat_screen.dart';
import 'features/profile/presentation/edit_profile_screen.dart';
import 'features/shell/presentation/app_shell.dart';
import 'features/stories/presentation/story_camera_explorer.dart';

void main() => runApp(const ProviderScope(child: MbogiApp()));

final _router = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (_, _) => const SplashScreen()),
    GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, _) => const RegisterScreen()),
    GoRoute(path: '/home', builder: (_, _) => const AppShell()),
    GoRoute(path: '/explore', builder: (_, _) => const ExploreScreen()),
    GoRoute(path: '/messages', builder: (_, _) => const MessagesScreen()),
    GoRoute(path: '/messages/:userId', builder: (_, state) => ChatScreen(userId: int.parse(state.pathParameters['userId']!), name: state.extra as String? ?? 'Conversation')),
    GoRoute(path: '/notifications', builder: (_, _) => const NotificationsScreen()),
    GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen()),
    GoRoute(path: '/profile/edit', builder: (_, _) => const EditProfileScreen()),
    GoRoute(path: '/profile/:userId', builder: (_, state) => ProfileScreen(userId: int.tryParse(state.pathParameters['userId'] ?? ''))),
    GoRoute(path: '/friends', builder: (_, _) => const FriendsScreen()),
    GoRoute(path: '/settings', builder: (_, _) => const SettingsScreen()),
    GoRoute(path: '/posts/create', builder: (_, _) => const CreatePostScreen()),
    GoRoute(path: '/stories/camera', builder: (context, state) => const StoryCameraExplorer()),
  ],
);

class MbogiApp extends ConsumerWidget {
  const MbogiApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      routerConfig: _router,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ref.watch(themeModeProvider),
      debugShowCheckedModeBanner: false,
    );
  }
}
