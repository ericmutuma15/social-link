import { useEffect, useState } from "react";
import {
  HiOutlineBell,
  HiOutlineBookmark,
  HiOutlineChatAlt2,
  HiOutlineGlobeAlt,
  HiOutlineHome,
  HiOutlineMenu,
  HiOutlinePlus,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from "react-icons/hi";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import NotificationDropdown from "./NotificationDropdown";
import UserMenu from "./UserMenu";
import api from "../services/apiClient";
import { io } from "socket.io-client";
export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const closeOverlays = () => {
    setMenu(false);
    setNotifications(false);
    document.body.classList.remove("nav-open");
  };
  useEffect(() => {
    let active = true;
    const refresh = () => Promise.all([api.get("/api/notifications/unread-count"), api.get("/api/messages/unread-count")]).then(([notificationResponse, messageResponse]) => { if (!active) return; setUnreadCount(notificationResponse.data?.unread_count || 0); setUnreadMessages(messageResponse.data?.unread_count || 0); }).catch(() => active && (setUnreadCount(0), setUnreadMessages(0)));
    refresh();
    const socket = io(import.meta.env.VITE_API_BASE_URL, { withCredentials: true });
    socket.on("connect", () => socket.emit("join_chat", { user_id: user?.id }));
    socket.on("notification", refresh);
    return () => { active = false; socket.disconnect(); };
  }, [notifications, user?.id]);
  const exit = async () => {
    await logout();
    navigate("/login");
  };
  const navItems = [
    ["/home", "Home", HiOutlineHome],
    ["/explore", "Explore", HiOutlineGlobeAlt],
    ["/friends", "Friends", HiOutlineUsers],
    ["/messages", "Messages", HiOutlineChatAlt2],
    ["/communities", "Communities", HiOutlineUserGroup],
    ["/bookmarks", "Bookmarks", HiOutlineBookmark],
    ["/profile", "Profile", HiOutlineUser],
  ];
  return (
    <header className="global-header">
      <Link to="/home" className="brand" aria-label="Desire Link home" onClick={closeOverlays}>
        <span>👊</span>mbogi
      </Link>
      <SearchBar />
      <nav className="header-nav">
        {navItems.map(([to, label, Icon]) => (
          <Link key={to} to={to} title={label} aria-label={label} onClick={closeOverlays} className={to === "/messages" && unreadMessages ? "message-alert" : ""}>
            <Icon />
            {to === "/messages" && unreadMessages > 0 && <span className="notification-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="create-button" to="/create-post" onClick={closeOverlays}>
          <HiOutlinePlus /> <span>Create</span>
        </Link>
        <div className="menu-anchor">
          <button
            className="icon-button"
            onClick={() => { setNotifications((v) => !v); setMenu(false); }}
            aria-label="Notifications"
          >
            <HiOutlineBell />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
          <NotificationDropdown open={notifications} onClose={closeOverlays} onUnreadCountChange={setUnreadCount} />
        </div>
        <ThemeToggle onToggle={closeOverlays} />
        <div className="menu-anchor">
          <button
            className="avatar-button"
            onClick={() => { setMenu((v) => !v); setNotifications(false); }}
            aria-label="User menu"
          >
            {user?.picture ? (
              <img
                src={
                  user.picture.startsWith("http")
                    ? user.picture
                    : `${import.meta.env.VITE_API_BASE_URL}/static/${user.picture}`
                }
                alt=""
              />
            ) : (
              <span>{user?.name?.[0] || "U"}</span>
            )}
          </button>
          <UserMenu open={menu} onLogout={exit} onClose={closeOverlays} />
        </div>
        <button
          className="icon-button mobile-menu"
          onClick={() => { closeOverlays(); document.body.classList.toggle("nav-open"); }}
          aria-label="Open navigation"
        >
          <HiOutlineMenu />
        </button>
      </div>
    </header>
  );
}
