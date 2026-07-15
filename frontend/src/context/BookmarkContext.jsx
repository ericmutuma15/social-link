import { createContext, useCallback, useContext, useState } from "react";
import api from "../services/apiClient";

const BookmarkContext = createContext(null);

export function BookmarkProvider({ children }) {
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const toggleBookmark = useCallback(async post => {
    const wasBookmarked = bookmarkedIds.has(post.id) || post.bookmarked;
    setBookmarkedIds(previous => { const next = new Set(previous); wasBookmarked ? next.delete(post.id) : next.add(post.id); return next; });
    try {
      const { data } = await api.post(`/api/posts/${post.id}/bookmark`);
      setBookmarkedIds(previous => { const next = new Set(previous); data.bookmarked ? next.add(post.id) : next.delete(post.id); return next; });
      return data.bookmarked;
    } catch (error) {
      setBookmarkedIds(previous => { const next = new Set(previous); wasBookmarked ? next.add(post.id) : next.delete(post.id); return next; });
      throw error;
    }
  }, [bookmarkedIds]);
  return <BookmarkContext.Provider value={{ bookmarkedIds, toggleBookmark }}>{children}</BookmarkContext.Provider>;
}

export const useBookmarks = () => useContext(BookmarkContext);
