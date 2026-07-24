import { useEffect, useState } from "react";
import { HiOutlineUserAdd, HiOutlineUsers } from "react-icons/hi";
import { Link } from "react-router-dom";
import api from "../services/apiClient";

export default function FriendSuggestions() {
  const [people, setPeople] = useState([]);
  const [sending, setSending] = useState(null);
  useEffect(() => { api.get("/api/users/discover").then(({ data }) => setPeople((data || []).sort(() => Math.random() - 0.5).slice(0, 3))).catch(() => setPeople([])); }, []);
  const addFriend = async (id) => { setSending(id); try { await api.post("/api/send-friend-request", { userId: id }); setPeople((items) => items.filter((person) => person.id !== id)); } finally { setSending(null); } };
  if (!people.length) return null;
  return <aside className="surface-card friend-suggestions"><div className="side-title"><div><p className="eyebrow">GROW YOUR CIRCLE</p><h2><HiOutlineUsers /> People to meet</h2></div><Link to="/people">See all</Link></div>{people.map((person) => <div className="suggestion-row" key={person.id}>{person.picture ? <img src={person.picture} alt="" /> : <span>{person.name?.[0] || "U"}</span>}<Link to={`/profile/${person.id}`}><strong>{person.name}</strong><small>{person.location || "In your community"}</small></Link><button className="button-secondary" onClick={() => addFriend(person.id)} disabled={sending === person.id} aria-label={`Add ${person.name}`}><HiOutlineUserAdd /></button></div>)}</aside>;
}
