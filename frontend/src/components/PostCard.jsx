import { Link } from "react-router-dom";
import { HiOutlineTrash } from "react-icons/hi";
import ReactionBar from "./ReactionBar";
import CommentSection from "./CommentSection";
export default function PostCard({
  post,
  baseUrl,
  onLike,
  onBookmark,
  onDelete,
  onToggleComments,
  onCommentChange,
  onCommentSubmit,
  onCommentDelete,
  onCommentEdit,
  onMediaClick,
}) {
  const media = post.media_url;
  return (
    <article className="post-card">
      <header>
        <Link to={`/profile/${post.user_id}`} className="post-author">
          {post.user_photo ? (
            <img src={post.user_photo} alt="" />
          ) : (
            <span>{post.user_name?.[0] || "U"}</span>
          )}
          <div>
            <strong>{post.user_name}</strong>
            <small>{new Date(post.timestamp).toLocaleString()}</small>
          </div>
        </Link>
        {post.is_owner ? (
          <button
            className="more-button"
            onClick={() => onDelete?.(post)}
            aria-label="Delete post"
          >
            <HiOutlineTrash />
          </button>
        ) : (
          <button className="more-button">•••</button>
        )}
      </header>
      {post.content && (
        <Link to={`/posts/${post.id}`} className="post-copy">
          {post.content}
        </Link>
      )}
      {media && (
        <button className="post-media" onClick={() => onMediaClick(media)}>
          {/\.(mp4|webm)$/i.test(media) ? (
            <video controls>
              <source src={media} type="video/mp4" />
            </video>
          ) : (
            <img src={media} alt="Post attachment" loading="lazy" />
          )}
        </button>
      )}
      <ReactionBar
        liked={post.isLiked}
        bookmarked={post.bookmarked}
        likes={post.likes}
        onLike={() => onLike(post.id)}
        onBookmark={() => onBookmark?.(post)}
        onComment={() => onToggleComments(post.id)}
      />
      {post.showComments && (
        <CommentSection
          comments={post.comments}
          value={post.commentText}
          baseUrl={baseUrl}
          onChange={(value) => onCommentChange(post.id, value)}
          onSubmit={() => onCommentSubmit(post.id)}
          onDelete={comment => onCommentDelete?.(post.id, comment)}
          onEdit={comment => onCommentEdit?.(post.id, comment)}
        />
      )}
    </article>
  );
}
