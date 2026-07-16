export default function CommentSection({
  comments = [],
  value,
  onChange,
  onSubmit,
  baseUrl,
}) {
  return (
    <div className="comment-section">
      {comments.map((comment) => (
        <article key={comment.id} className="comment">
          <span className="comment-avatar">
            {comment.user_name?.[0] || "U"}
          </span>
          <div>
            <strong>{comment.user_name}</strong>
            <p>{comment.content}</p>
            <small>{new Date(comment.timestamp).toLocaleString()}</small>
          </div>
        </article>
      ))}
      <div className="comment-compose">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add a thoughtful reply…"
        />
        <button onClick={onSubmit}>Reply</button>
      </div>
    </div>
  );
}
