import { useEffect, useState } from "react";
import api from "../services/apiClient";
import BackButton from "../components/BackButton";
import PostCard from "../components/PostCard";
import SkeletonLoader from "../components/SkeletonLoader";
import { useBookmarks } from "../context/BookmarkContext";

export default function BookmarksPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const { toggleBookmark } = useBookmarks();

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const { data } = await api.get("/api/bookmarks");

        setPosts(
          data.items.map(post => ({
            ...post,
            bookmarked: true,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, []);

  const remove = async post => {
    setPosts(items => items.filter(item => item.id !== post.id));

    try {
      await toggleBookmark(post);
    } catch {
      setPosts(items => [post, ...items]);
    }
  };

  return (
    <section className="feed-page">
      <BackButton />

      <div className="feed-heading">
        <div>
          <p className="eyebrow">SAVED FOR LATER</p>
          <h1>Bookmarks</h1>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : posts.length ? (
        <div className="post-list">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onBookmark={remove}
              onLike={() => {}}
              onToggleComments={() => {}}
              onCommentChange={() => {}}
              onCommentSubmit={() => {}}
              onMediaClick={() => {}}
            />
          ))}
        </div>
      ) : (
        <div className="surface-card empty-state">
          Your saved posts will live here.
        </div>
      )}
    </section>
  );
}