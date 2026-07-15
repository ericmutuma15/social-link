import { useState } from "react";
import { HiOutlineBell, HiOutlineBookmark, HiOutlineChatAlt2, HiOutlineGlobeAlt, HiOutlineHome, HiOutlineMenu, HiOutlinePlus, HiOutlineUser, HiOutlineUserGroup, HiOutlineUsers } from "react-icons/hi";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import NotificationDropdown from "./NotificationDropdown";
import UserMenu from "./UserMenu";
export default function Header() {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const [menu, setMenu] = useState(false); const [notifications, setNotifications] = useState(false);
  const exit = async () => { await logout(); navigate("/login"); };
  const navItems = [["/home", "Home", HiOutlineHome], ["/explore", "Explore", HiOutlineGlobeAlt], ["/friends", "Friends", HiOutlineUsers], ["/messages", "Messages", HiOutlineChatAlt2], ["/communities", "Communities", HiOutlineUserGroup], ["/bookmarks", "Bookmarks", HiOutlineBookmark], ["/profile", "Profile", HiOutlineUser]];
  return <header className="global-header"><Link to="/home" className="brand" aria-label="Desire Link home"><span>✦</span>desire</Link><SearchBar /><nav className="header-nav">{navItems.map(([to, label, Icon]) => <Link key={to} to={to} title={label} aria-label={label}><Icon /></Link>)}</nav>
    <div className="header-actions"><Link className="create-button" to="/create-post"><HiOutlinePlus /> <span>Create</span></Link><div className="menu-anchor"><button className="icon-button" onClick={() => setNotifications(v => !v)} aria-label="Notifications"><HiOutlineBell /></button><NotificationDropdown open={notifications} /></div><ThemeToggle />
      <div className="menu-anchor"><button className="avatar-button" onClick={() => setMenu(v => !v)} aria-label="User menu">{user?.picture ? <img src={user.picture.startsWith("http") ? user.picture : `${import.meta.env.VITE_API_BASE_URL}/static/${user.picture}`} alt="" /> : <span>{user?.name?.[0] || "U"}</span>}</button><UserMenu open={menu} onLogout={exit} /></div><button className="icon-button mobile-menu" onClick={() => document.body.classList.toggle("nav-open")} aria-label="Open navigation"><HiOutlineMenu /></button>
    </div></header>;
}
