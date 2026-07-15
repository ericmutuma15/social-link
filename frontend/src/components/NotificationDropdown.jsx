import { Link } from "react-router-dom";
export default function NotificationDropdown({ open }) { return open ? <div className="popover notification-popover"><div className="popover-title">Notifications <Link to="/notifications">View all</Link></div><p className="muted">You’re all caught up.</p></div> : null; }
