import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NotificationCard from "./NotificationCard";
import api from "../services/apiClient";

export default function NotificationDropdown({ open, onClose, onUnreadCountChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get("/api/notifications", { params: { per_page: 4 } })
      .then(({ data }) => { setItems(data?.items || []); onUnreadCountChange?.(data?.unread_count || 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, onUnreadCountChange]);
  const openNotification = async (notification) => {
    if (!notification.read) {
      try {
        await api.patch(`/api/notifications/${notification.id}`, { read: true });
        onUnreadCountChange?.((count) => Math.max(0, count - 1));
      } catch { /* The notification can still be opened. */ }
    }
    onClose?.();
  };
  const acceptFriendRequest = async (notification) => {
    if (!notification.friend_request_id) return;
    setLoading(true);
    try {
      await api.post("/api/accept-friend-request", { requestId: notification.friend_request_id });
      setItems((current) => current.filter((item) => item.id !== notification.id));
      onUnreadCountChange?.((count) => Math.max(0, count - 1));
    } catch {
      // Ignore failures here; the user can retry from the Friends page.
    } finally {
      setLoading(false);
    }
  };
  return open ? <div className="popover notification-popover"><div className="popover-title">Notifications <Link to="/notifications" onClick={onClose}>View all</Link></div>{loading ? <p className="muted">Loading activity…</p> : items.length ? items.map(item => <NotificationCard key={item.id} notification={item} compact onOpen={openNotification} onAccept={acceptFriendRequest} />) : <p className="muted">You’re all caught up.</p>}</div> : null;
}
