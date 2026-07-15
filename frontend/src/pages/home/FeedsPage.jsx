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

const stories = ["Your story", "Amara", "Jaden", "Priya", "Theo"];
export default function FeedsPage() {
  const [posts, setPosts] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [preview, setPreview] = useState(null); const baseUrl = import.meta.env.VITE_API_BASE_URL; const { toggleBookmark } = useBookmarks();
  useEffect(() => { api.get("/api/feeds").then(({ data }) => setPosts((data.items || []).map(post => ({ ...post, isLiked: post.liked || false, likes: post.likes || 0, showComments: false, commentText: "", comments: post.comments || [] })))).catch(() => setError("Your feed could not be loaded right now.")).finally(() => setLoading(false)); }, []);
  const update = (id, change) => setPosts(items => items.map(post => post.id === id ? { ...post, ...change(post) } : post));
  const like = async id => { const post = posts.find(item => item.id === id); update(id, item => ({ isLiked: !item.isLiked, likes: item.likes + (item.isLiked ? -1 : 1) })); try { const { data } = await api.post(`/api/posts/${id}/like`); update(id, () => ({ likes: data.likes })); } catch { update(id, item => ({ isLiked: !item.isLiked, likes: item.likes + (item.isLiked ? -1 : 1) })); } };
  const comment = async id => { const post = posts.find(item => item.id === id); if (!post.commentText.trim()) return; try { const { data } = await api.post(`/api/posts/${id}/comments`, { content: post.commentText }); update(id, item => ({ comments: [...item.comments, data], commentText: "" })); } catch { setError("Your comment could not be posted."); } };
  const remove = async post => { if (!window.confirm("Delete this post?")) return; setPosts(items => items.filter(item => item.id !== post.id)); try { await api.delete(`/api/posts/${post.id}`); toast.success("Post deleted"); } catch { setPosts(items => [post, ...items]); toast.error("Could not delete this post."); } };
  const bookmark = async post => { const original = post.bookmarked; update(post.id, () => ({ bookmarked: !original })); try { await toggleBookmark(post); } catch { update(post.id, () => ({ bookmarked: original })); toast.error("Could not update bookmark."); } };
  return <section className="feed-page"><div className="feed-heading"><div><p className="eyebrow">YOUR FEED</p><h1>For you</h1></div><span>Fresh stories, closer connections.</span></div><div className="stories">{stories.map((name, index) => <StoryCard key={name} name={name} active={!index} />)}</div><CreatePostModal />{error && <p className="feed-error">{error}</p>}{loading ? <SkeletonLoader /> : <div className="post-list">{posts.length ? posts.map(post => <PostCard key={post.id} post={post} baseUrl={baseUrl} onLike={like} onBookmark={bookmark} onDelete={remove} onToggleComments={id => update(id, item => ({ showComments: !item.showComments }))} onCommentChange={(id, value) => update(id, () => ({ commentText: value }))} onCommentSubmit={comment} onMediaClick={setPreview} />) : <div className="surface-card empty-state"><h2>You don’t have any friends yet.</h2><p>Explore people and start building your circle.</p><Link className="primary-link" to="/explore">Explore Friends</Link></div>}</div>}<ImageViewer src={preview} onClose={() => setPreview(null)} /></section>;
}
