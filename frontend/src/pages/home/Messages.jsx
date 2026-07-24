import { useEffect, useMemo, useState } from "react";
import { HiOutlineChatAlt2, HiOutlinePlus, HiOutlineSearch, HiOutlineX } from "react-icons/hi";
import { useNavigate } from "react-router-dom";

const avatar = (person) => person.profile_pic || person.picture || "/default-profile.png";
export default function Messages() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL, navigate = useNavigate();
  const [chats, setChats] = useState([]), [friends, setFriends] = useState([]), [loading, setLoading] = useState(true), [query, setQuery] = useState(""), [showNew, setShowNew] = useState(false);
  useEffect(() => { fetch(`${baseUrl}/api/chats`, { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setChats).finally(() => setLoading(false)); }, [baseUrl]);
  useEffect(() => { if (showNew) fetch(`${baseUrl}/api/friends`, { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setFriends); }, [showNew, baseUrl]);
  const visibleChats = useMemo(() => chats.filter(chat => chat.name.toLowerCase().includes(query.toLowerCase())), [chats, query]);
  return <section className="workspace-page messages-page"><header className="page-heading"><div><p className="eyebrow">INBOX</p><h1>Messages</h1><p>Stay close to the conversations in your circle.</p></div><button className="button-primary" onClick={() => setShowNew(true)}><HiOutlinePlus /> New message</button></header>
    <div className="messaging-shell surface-card"><aside className="conversation-panel"><label className="search-field"><HiOutlineSearch /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search conversations" /></label><div className="conversation-list">{loading ? [1,2,3,4].map(item => <div className="conversation-skeleton" key={item} />) : visibleChats.length ? visibleChats.map(chat => <button className="conversation-card" key={chat.id} onClick={() => navigate(`/chat/${chat.id}`)}><span className="presence-avatar"><img src={avatar(chat)} alt="" /><i /></span><span><strong>{chat.name}</strong><small>{chat.last_message || "Start a conversation"}</small></span>{chat.unread_count > 0 && <b>{chat.unread_count}</b>}</button>) : <div className="empty-panel compact"><HiOutlineChatAlt2 /><h2>No conversations found</h2><p>Start a message with someone in your circle.</p></div>}</div></aside><div className="messages-blank"><HiOutlineChatAlt2 /><h2>Select a conversation</h2><p>Your messages are private and will always be easy to find here.</p></div></div>
    {showNew && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Start a new message"><div className="surface-card new-message-modal"><button className="modal-close" onClick={() => setShowNew(false)} aria-label="Close"><HiOutlineX /></button><h2>Start a conversation</h2><p>Choose a friend to send a message.</p><div className="friend-picker">{friends.map(friend => <button key={friend.id} onClick={() => navigate(`/chat/${friend.id}`)}><img src={avatar(friend)} alt="" /><span>{friend.name}</span></button>)}</div></div></div>}
  </section>;
}
