import { Link } from "react-router-dom";
export default function MessageCard({ chat }) { return <Link className="message-card" to={`/chat/${chat.id}`}><span>{chat.name?.[0] || "U"}</span><div><strong>{chat.name}</strong><small>{chat.last_message || "Start a conversation"}</small></div></Link>; }
