import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function UserMenu({ open, onLogout, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.14 }}
          className="popover user-popover"
        >
          <Link to="/profile" onClick={onClose}>View profile</Link>
          <Link to="/settings" onClick={onClose}>Settings</Link>
          <button onClick={() => { onClose?.(); onLogout(); }}>Log out</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
