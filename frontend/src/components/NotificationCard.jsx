import { HiOutlineCheck, HiOutlineCheckCircle, HiOutlineTrash, HiOutlineUserAdd, HiOutlineHeart, HiOutlineChatAlt2 } from "react-icons/hi";

const icons = { friend_request: HiOutlineUserAdd, friend_accept: HiOutlineUserAdd, like: HiOutlineHeart, comment: HiOutlineChatAlt2 };
export default function NotificationCard({ notification, onRead, onAccept, onArchive, onDelete, onOpen, compact = false }) {
  const Icon = icons[notification.type] || HiOutlineCheck;
  return <article className={`notification-card ${notification.read ? "" : "is-unread"}`}>
    <div className="notification-icon"><Icon /></div>
    <button className="notification-copy" onClick={() => onOpen?.(notification)} aria-label={`Open notification: ${notification.message}`}>
      <p>{notification.message}</p>
      <time>{notification.created_at ? new Date(notification.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Recently"}</time>
    </button>
    {!compact && <div className="notification-actions">
      {notification.type === "friend_request" && notification.friend_request_id && onAccept && <button onClick={() => onAccept(notification)} aria-label="Accept friend request"><HiOutlineCheckCircle /></button>}
      {!notification.read && <button onClick={() => onRead(notification.id)} aria-label="Mark notification as read"><HiOutlineCheck /></button>}
      <button onClick={() => onArchive(notification.id)} aria-label="Archive notification">Archive</button>
      <button onClick={() => onDelete(notification.id)} aria-label="Delete notification"><HiOutlineTrash /></button>
    </div>}
  </article>;
}
