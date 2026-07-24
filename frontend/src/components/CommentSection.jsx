import { Link } from "react-router-dom";
import { HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
export default function CommentSection({
  comments = [],
  value,
  onChange,
  onSubmit,
  onDelete,
  onEdit,
}) {
  return (
    <div className="comment-section">
      {comments.map((comment) => (
        <article key={comment.id} className="comment">
          <Link to={`/profile/${comment.user_id}`} className="comment-avatar" aria-label={`${comment.user_name}'s profile`}>
            {comment.user_photo ? <img src={comment.user_photo} alt="" /> : comment.user_name?.[0] || "U"}
          </Link>
          <div>
            <Link to={`/profile/${comment.user_id}`}><strong>{comment.user_name}</strong></Link>
            <p>{comment.content}</p>
            <small>{new Date(comment.timestamp).toLocaleString()}</small>{comment.is_owner && <span className="comment-actions"><button onClick={() => onEdit?.(comment)} aria-label="Edit comment"><HiOutlinePencil /></button><button onClick={() => onDelete?.(comment)} aria-label="Delete comment"><HiOutlineTrash /></button></span>}
          </div>
        </article>
      ))}
      <div className="comment-compose">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add a thoughtful reply…"
        />
        <button type="button" onClick={onSubmit} disabled={!value?.trim()}>Reply</button>
      </div>
    </div>
  );
}
