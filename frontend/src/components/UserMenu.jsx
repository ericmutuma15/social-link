import { Link } from "react-router-dom";
export default function UserMenu({ open, onLogout }) { return open ? <div className="popover user-popover"><Link to="/profile">View profile</Link><Link to="/edit-profile">Settings</Link><button onClick={onLogout}>Log out</button></div> : null; }
