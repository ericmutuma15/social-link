import { useEffect, useState } from "react";
import api from "../../services/apiClient";
import CreatePostModal from "../../components/CreatePostModal";
import PostCard from "../../components/PostCard";
import StoryCard from "../../components/StoryCard";
import SkeletonLoader from "../../components/SkeletonLoader";
import ImageViewer from "../../components/ImageViewer";
import { useBookmarks } from "../../context/BookmarkContext";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import FriendSuggestions from "../../components/FriendSuggestions";

export default function FeedsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const { toggleBookmark } = useBookmarks();
  useEffect(() => {
    api
      .get("/api/feeds")
      .then(({ data }) =>
        setPosts(
          (data.items || []).map((post) => ({
            ...post,
            isLiked: post.liked || false,
            likes: post.likes || 0,
            showComments: false,
            commentText: "",
            comments: post.comments || [],
          })),
        ),
      )
      .catch(() => setError("Your feed could not be loaded right now."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { api.get("/api/stories").then(({ data }) => setStories(data)).catch(() => setStories([])); }, []);
  const update = (id, change) =>
    setPosts((items) =>
      items.map((post) =>
        post.id === id ? { ...post, ...change(post) } : post,
      ),
    );
  const like = async (id) => {
    const post = posts.find((item) => item.id === id);
    update(id, (item) => ({
      isLiked: !item.isLiked,
      likes: item.likes + (item.isLiked ? -1 : 1),
    }));
    try {
      const { data } = await api.post(`/api/posts/${id}/like`);
      const result = data.data || data;
      update(id, () => ({ likes: result.likes, isLiked: result.liked }));
      toast.success(result.liked ? "❤️ Post liked" : "💔 Like removed");
    } catch {
      update(id, (item) => ({
        isLiked: !item.isLiked,
        likes: item.likes + (item.isLiked ? -1 : 1),
      }));
      toast.error("Could not update your reaction. Please try again.");
    }
  };
  const comment = async (id) => {
    const post = posts.find((item) => item.id === id);
    if (!post.commentText.trim()) return;
    try {
      const { data } = await api.post(`/api/posts/${id}/comments`, {
        content: post.commentText,
      });
      const saved = data.data || data;
      update(id, (item) => ({
        comments: [...item.comments, saved],
        commentText: "",
      }));
      toast.success("Comment posted");
    } catch {
      toast.error("Your comment could not be posted. Please try again.");
    }
  };
  const remove = async (post) => {
    if (!window.confirm("Delete this post?")) return;
    setPosts((items) => items.filter((item) => item.id !== post.id));
    try {
      await api.delete(`/api/posts/${post.id}`);
      toast.success("Post deleted");
    } catch {
      setPosts((items) => [post, ...items]);
      toast.error("Could not delete this post.");
    }
  };
  const bookmark = async (post) => {
    const original = post.bookmarked;
    update(post.id, () => ({ bookmarked: !original }));
    try {
      const saved = await toggleBookmark(post);
      toast.success(saved ? "🔖 Saved to bookmarks" : "🗑 Removed from bookmarks");
    } catch {
      update(post.id, () => ({ bookmarked: original }));
      toast.error("Could not update bookmark.");
    }
  };
  const deleteComment = async (postId, comment) => {
    if (!window.confirm("Delete this comment?")) return;
    update(postId, item => ({ comments: item.comments.filter(entry => entry.id !== comment.id) }));
    try { await api.delete(`/api/comments/${comment.id}`); toast.success("Comment deleted"); }
    catch { update(postId, item => ({ comments: [...item.comments, comment] })); toast.error("Could not delete this comment."); }
  };
  const editComment = async (postId, comment) => {
    const content = window.prompt("Edit comment", comment.content);
    if (content === null || !content.trim() || content.trim() === comment.content) return;
    try { const { data } = await api.patch(`/api/comments/${comment.id}`, { content: content.trim() }); const saved = data.data || data; update(postId, item => ({ comments: item.comments.map(entry => entry.id === comment.id ? saved : entry) })); toast.success("Comment updated"); }
    catch { toast.error("Could not update this comment."); }
  };
  return (
    <section className="feed-page">
      <div className="feed-heading">
        <div>
          <p className="eyebrow">YOUR FEED</p>
          <h1>For you</h1>
        </div>
        <span>Fresh stories, closer connections.</span>
      </div>
      <div className="stories">
        {stories.slice(0, 8).map((story) => (
          <StoryCard key={story.id} name={story.is_own ? "Your story" : story.name} image={story.picture} active={!story.is_own} onClick={() => setActiveStory(story)} />
        ))}
      </div>
      <CreatePostModal />
      <FriendSuggestions />
      {error && <p className="feed-error">{error}</p>}
      {loading ? (
        <SkeletonLoader />
      ) : (
        <div className="post-list">
          {posts.length ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                baseUrl={baseUrl}
                onLike={like}
                onBookmark={bookmark}
                onDelete={remove}
                onToggleComments={(id) =>
                  update(id, (item) => ({ showComments: !item.showComments }))
                }
                onCommentChange={(id, value) =>
                  update(id, () => ({ commentText: value }))
                }
                onCommentSubmit={comment}
                onCommentDelete={deleteComment}
                onCommentEdit={editComment}
                onMediaClick={setPreview}
              />
            ))
          ) : (
            <div className="surface-card empty-state">
              <h2>You don’t have any friends yet.</h2>
              <p>Explore people and start building your circle.</p>
              <Link className="primary-link" to="/people">
                Explore Friends
              </Link>
            </div>
          )}
        </div>
      )}
      <ImageViewer src={preview} onClose={() => setPreview(null)} />
      {activeStory && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Story viewer" onMouseDown={() => setActiveStory(null)}><article className="surface-card story-viewer" onMouseDown={(event) => event.stopPropagation()}><header><img src={activeStory.picture || "/default-profile.png"} alt="" /><strong>{activeStory.is_own ? "Your story" : activeStory.name}</strong><button className="icon-button" onClick={() => setActiveStory(null)} aria-label="Close story">×</button></header>{activeStory.media_type === "image" && <img src={activeStory.media_url} alt="Story" />}{activeStory.content && <p>{activeStory.content}</p>}<small>Expires {new Date(activeStory.expires_at).toLocaleString()}</small></article></div>}
    </section>
  );
}
