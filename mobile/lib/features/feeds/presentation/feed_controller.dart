import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../../../shared/models/post.dart';
import '../data/feed_repository.dart';

final tokenStorageProvider = Provider((_) => TokenStorage(const FlutterSecureStorage()));
final apiProvider = Provider((ref) => ApiClient(ref.watch(tokenStorageProvider)));
final feedRepositoryProvider = Provider((ref) => FeedRepository(ref.watch(apiProvider)));
final feedProvider = AsyncNotifierProvider<FeedController, List<Post>>(FeedController.new);
final notificationUnreadProvider = StateProvider<int>((_) => 0);
final messageUnreadProvider = StateProvider<int>((_) => 0);

class FeedController extends AsyncNotifier<List<Post>> {
  var _page = 1;
  var _hasMore = true;
  FeedRepository get _repository => ref.read(feedRepositoryProvider);
  @override
  Future<List<Post>> build() async => _load(reset: true);
  Future<List<Post>> _load({required bool reset}) async {
    if (reset) { _page = 1; _hasMore = true; }
    final page = await _repository.feed(_page);
    _hasMore = page.hasMore;
    _page++;
    return reset ? page.posts : [...?state.valueOrNull, ...page.posts];
  }
  Future<void> refresh() async { state = const AsyncLoading(); state = await AsyncValue.guard(() => _load(reset: true)); }
  Future<void> loadMore() async { if (!_hasMore || state.isLoading) return; state = await AsyncValue.guard(() => _load(reset: false)); }
  Future<void> toggleLike(Post post) async {
    final before = state.valueOrNull ?? const [];
    final optimistic = post.copyWith(liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1));
    state = AsyncData([for (final item in before) if (item.id == post.id) optimistic else item]);
    try { final result = await _repository.like(post.id); state = AsyncData([for (final item in state.valueOrNull ?? before) if (item.id == post.id) item.copyWith(liked: result.liked, likes: result.likes) else item]); } catch (_) { state = AsyncData(before); rethrow; }
  }
  Future<void> toggleBookmark(Post post) async {
    final before = state.valueOrNull ?? const [];
    final optimistic = post.copyWith(bookmarked: !post.bookmarked);
    state = AsyncData([for (final item in before) if (item.id == post.id) optimistic else item]);
    try {
      final bookmarked = await _repository.bookmark(post.id);
      state = AsyncData([
        for (final item in state.valueOrNull ?? before)
          if (item.id == post.id) item.copyWith(bookmarked: bookmarked) else item,
      ]);
    } catch (_) {
      state = AsyncData(before);
      rethrow;
    }
  }
  Future<void> delete(Post post) async { final before = state.valueOrNull ?? const []; state = AsyncData(before.where((item) => item.id != post.id).toList()); try { await _repository.deletePost(post.id); } catch (_) { state = AsyncData(before); rethrow; } }
  Future<void> updatePost(Post post, String content) async {
    final before = state.valueOrNull ?? const [];
    try {
      final updated = await _repository.updatePost(post.id, content);
      state = AsyncData([for (final item in before) if (item.id == post.id) updated else item]);
    } catch (_) {
      state = AsyncData(before);
      rethrow;
    }
  }
}
