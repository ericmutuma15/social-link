import { Link } from "react-router-dom";
export default function UserMenu({ open, onLogout, onClose }) {
  return open ? (
    <div className="popover user-popover">
      <Link to="/profile" onClick={onClose}>View profile</Link>
      <Link to="/settings" onClick={onClose}>Settings</Link>
      <button onClick={() => { onClose?.(); onLogout(); }}>Log out</button>
    </div>
  ) : null;
}
