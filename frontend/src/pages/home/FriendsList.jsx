import { useCallback, useEffect, useState } from "react";
import { HiOutlineCheck, HiOutlineClock, HiOutlineUserGroup, HiOutlineUserRemove, HiOutlineUsers, HiOutlineX } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/apiClient";

const avatar = (person) => person.picture || person.profile_pic || null;
const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
function Avatar({ person }) { return avatar(person) ? <img src={avatar(person)} alt="" /> : <span>{initials(person.name)}</span>; }

export default function FriendsList() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]), [requests, setRequests] = useState({ incoming: [], outgoing: [] }), [suggestions, setSuggestions] = useState([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsResult, requestsResult, suggestionsResult] = await Promise.all([api.get("/api/friends"), api.get("/api/friend-requests"), api.get("/api/friends/suggestions")]);
      setFriends(friendsResult.data); setRequests(requestsResult.data); setSuggestions(suggestionsResult.data);
    } catch { toast.error("Unable to load your connections."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const run = async (key, action, success) => { setBusy(key); try { await action(); toast.success(success); await load(); } catch (error) { toast.error(error.response?.data?.error || "Something went wrong"); } finally { setBusy(""); } };
  return <section className="workspace-page friends-page">
    <header className="page-heading"><div><p className="eyebrow">CONNECTIONS</p><h1>Friends</h1><p>Manage requests and keep your circle growing.</p></div></header>
    {loading ? <div className="friends-grid">{[1,2,3].map((key) => <div className="surface-card friend-skeleton" key={key} />)}</div> : <>
      {requests.incoming.length > 0 && <section className="friends-section"><div className="section-heading"><h2>Friend requests</h2><span>{requests.incoming.length}</span></div><div className="friends-grid">{requests.incoming.map(({ id, user }) => <article className="surface-card friend-card" key={id}><Avatar person={user}/><div><h3>{user.name}</h3><p>{user.location || user.department || "New connection"}</p></div><div className="friend-card__actions"><button className="button-primary" disabled={busy === `accept-${id}`} onClick={() => run(`accept-${id}`, () => api.post("/api/accept-friend-request", { requestId: id }), "Friend request accepted")}><HiOutlineCheck /> Accept</button><button className="button-secondary" aria-label={`Decline ${user.name}`} disabled={busy === `decline-${id}`} onClick={() => run(`decline-${id}`, () => api.patch(`/api/friend-requests/${id}`, { status: "declined" }), "Friend request declined")}><HiOutlineX /></button></div></article>)}</div></section>}
      {friends.length > 0 && <section className="friends-section"><div className="section-heading"><h2>Your friends</h2><span>{friends.length}</span></div><div className="friends-grid">{friends.map((friend) => <article className="surface-card friend-card" key={friend.id}><button className="friend-card__profile" onClick={() => navigate(`/profile/${friend.id}`)}><Avatar person={friend}/><span><h3>{friend.name}</h3><p>View profile</p></span></button><button className="icon-button" title="Remove friend" aria-label={`Remove ${friend.name}`} disabled={busy === `remove-${friend.id}`} onClick={() => run(`remove-${friend.id}`, () => api.delete(`/api/friends/${friend.id}`), "Friend removed")}><HiOutlineUserRemove /></button></article>)}</div></section>}
      {requests.outgoing.length > 0 && <section className="friends-section"><div className="section-heading"><h2>Sent requests</h2><span>{requests.outgoing.length}</span></div><div className="friends-grid">{requests.outgoing.map(({ id, user }) => <article className="surface-card friend-card" key={id}><Avatar person={user}/><div><h3>{user.name}</h3><p><HiOutlineClock /> Request pending</p></div><button className="button-secondary" disabled={busy === `cancel-${id}`} onClick={() => run(`cancel-${id}`, () => api.delete(`/api/friend-requests/${id}`), "Friend request cancelled")}>Cancel</button></article>)}</div></section>}
      {(friends.length === 0 || suggestions.length > 0) && <section className="friends-section"><div className="section-heading"><h2>{friends.length ? "People you may know" : "Start your circle"}</h2></div><div className="friends-grid">{suggestions.length ? suggestions.map((user) => <article className="surface-card friend-card" key={user.id}><Avatar person={user}/><div><h3>{user.name}</h3><p>{user.department || user.location || "New to the community"}</p></div><button className="button-primary" disabled={busy === `send-${user.id}`} onClick={() => run(`send-${user.id}`, () => api.post("/api/send-friend-request", { userId: user.id }), "Friend request sent")}><HiOutlineUsers /> Add</button></article>) : <div className="surface-card empty-panel compact"><HiOutlineUserGroup /><h2>No suggestions yet</h2><p>New people will appear here as the community grows.</p></div>}</div></section>}
    </>}
  </section>;
}
