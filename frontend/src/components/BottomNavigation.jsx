import { HiOutlineBell, HiOutlineChatAlt2, HiOutlineHome, HiOutlinePlus, HiOutlineUser } from "react-icons/hi";
import { NavLink } from "react-router-dom";
const links = [["/home", HiOutlineHome], ["/messages", HiOutlineChatAlt2], ["/create-post", HiOutlinePlus], ["/notifications", HiOutlineBell], ["/profile", HiOutlineUser]];
export default function BottomNavigation() { return <nav className="bottom-navigation">{links.map(([to, Icon]) => <NavLink key={to} to={to}><Icon /></NavLink>)}</nav>; }
