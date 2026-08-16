class Post {
  const Post({
    required this.id,
    required this.author,
    required this.createdAt,
    this.userId,
    this.authorPhoto,
    this.content,
    this.mediaUrl,
    this.mediaType,
    this.likes = 0,
    this.liked = false,
    this.bookmarked = false,
    this.isOwner = false,
  });
  final int id;
  final int? userId;
  final String author;
  final String? authorPhoto;
  final DateTime createdAt;
  final String? content;
  final String? mediaUrl;
  final String? mediaType;
  final int likes;
  final bool liked;
  final bool bookmarked;
  final bool isOwner;

  factory Post.fromJson(Map<String, dynamic> json) => Post(
    id: json['id'] as int,
    userId: json['user_id'] as int?,
    author: json['user_name'] as String? ?? 'Unknown',
    createdAt:
        DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
    authorPhoto: json['user_photo'] as String?,
    content: json['content'] as String?,
    mediaUrl: json['media_url'] as String?,
    mediaType: json['media_type'] as String?,
    likes: json['likes'] as int? ?? 0,
    liked: json['liked'] as bool? ?? false,
    bookmarked: json['bookmarked'] as bool? ?? false,
    isOwner: json['is_owner'] as bool? ?? false,
  );
  Post copyWith({int? likes, bool? liked, bool? bookmarked}) => Post(
    id: id,
    userId: userId,
    author: author,
    authorPhoto: authorPhoto,
    createdAt: createdAt,
    content: content,
    mediaUrl: mediaUrl,
    mediaType: mediaType,
    likes: likes ?? this.likes,
    liked: liked ?? this.liked,
    bookmarked: bookmarked ?? this.bookmarked,
    isOwner: isOwner,
  );
}
