import { Link } from "react-router-dom";
import { HiOutlineTrash } from "react-icons/hi";
import ReactionBar from "./ReactionBar";
import CommentSection from "./CommentSection";
import { apiMediaUrl, mediaKind } from "../utils/media";
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
  const media = apiMediaUrl(post.media_url);
  const kind = mediaKind(media, post.media_type);
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
      {media && <div className="post-media">
        {kind === "video" && <video controls preload="metadata"><source src={media} />Your browser cannot play this video.</video>}
        {kind === "audio" && <audio controls preload="metadata" src={media}>Your browser cannot play this audio.</audio>}
        {kind === "document" && <a href={media} target="_blank" rel="noreferrer">Open document</a>}
        {kind === "image" && <button type="button" onClick={() => onMediaClick?.(media)}><img src={media} alt="Post attachment" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /></button>}
      </div>}
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
