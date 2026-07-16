import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/apiClient";
import BackButton from "../components/BackButton";
import PostCard from "../components/PostCard";
import SkeletonLoader from "../components/SkeletonLoader";
import { useBookmarks } from "../context/BookmarkContext";

export default function ExplorePage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const { toggleBookmark } = useBookmarks();
  const load = useCallback(
    async (next = 1, reset = true) => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/explore", {
          params: { page: next, q: query, sort },
        });
        setItems((previous) =>
          reset ? data.items : [...previous, ...data.items],
        );
        setPage(next);
        setHasMore(data.has_more);
      } finally {
        setLoading(false);
      }
    },
    [query, sort],
  );
  useEffect(() => {
    const timer = setTimeout(() => load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  const update = (id, change) =>
    setItems((posts) =>
      posts.map((post) =>
        post.id === id ? { ...post, ...change(post) } : post,
      ),
    );
  const like = async (id) => {
    const post = items.find((item) => item.id === id);
    update(id, (item) => ({
      isLiked: !item.isLiked,
      likes: item.likes + (item.isLiked ? -1 : 1),
    }));
    try {
      const { data } = await api.post(`/api/posts/${id}/like`);
      update(id, () => ({ likes: data.likes }));
    } catch {
      update(id, () => ({ isLiked: post.isLiked, likes: post.likes }));
    }
  };
  const bookmark = async (post) => {
    update(post.id, (item) => ({ bookmarked: !item.bookmarked }));
    try {
      await toggleBookmark(post);
    } catch {
      update(post.id, () => ({ bookmarked: post.bookmarked }));
    }
  };
  return (
    <section className="feed-page">
      <BackButton />
      <div className="feed-heading">
        <div>
          <p className="eyebrow">DISCOVER</p>
          <h1>Explore</h1>
        </div>
        <Link className="text-link" to="/add-users">
          Find people
        </Link>
      </div>
      <div className="explore-controls">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts and creators"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Recent</option>
          <option value="popular">Popular</option>
        </select>
      </div>
      {loading && !items.length ? (
        <SkeletonLoader />
      ) : (
        <div className="post-list">
          {items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={like}
              onBookmark={bookmark}
              onToggleComments={(id) =>
                update(id, (item) => ({ showComments: !item.showComments }))
              }
              onCommentChange={(id, value) =>
                update(id, () => ({ commentText: value }))
              }
              onCommentSubmit={() => {}}
              onMediaClick={() => {}}
            />
          ))}
          {hasMore && (
            <button
              className="load-more"
              onClick={() => load(page + 1, false)}
              disabled={loading}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
