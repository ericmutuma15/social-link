import '../../../core/network/api_client.dart';
import '../../../shared/models/post.dart';

class FeedRepository {
  FeedRepository(this._api);
  final ApiClient _api;
  Future<({List<Post> posts, bool hasMore})> feed(int page) async {
    final result = await _api.get('/api/feeds', query: {'page': page, 'per_page': 12});
    final items = (result['items'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
    return (posts: items.map(Post.fromJson).toList(), hasMore: result['has_more'] as bool? ?? false);
  }
  Future<Post> like(int id) async {
    final result = await _api.post('/api/posts/$id/like');
    return Post.fromJson({'id': id, ...?result['data'] as Map<String, dynamic>?});
  }
  Future<bool> bookmark(int id) async {
    final result = await _api.post('/api/posts/$id/bookmark');
    return (result['data'] as Map<String, dynamic>)['bookmarked'] as bool;
  }
  Future<void> deletePost(int id) => _api.delete('/api/posts/$id');
}
