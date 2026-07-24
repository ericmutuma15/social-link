import { useCallback, useEffect, useState } from "react";
import { HiOutlineBell, HiOutlineCheck } from "react-icons/hi";
import NotificationCard from "../../components/NotificationCard";
import api from "../../services/apiClient";

const filters = [["all", "All"], ["unread", "Unread"], ["read", "Read"], ["archived", "Archived"]];
export default function NotificationsPage() {
  const [filter, setFilter] = useState("all"), [items, setItems] = useState([]), [loading, setLoading] = useState(true), [meta, setMeta] = useState({ has_more: false, page: 1 }), [selected, setSelected] = useState(null);
  const load = useCallback(async (page = 1, append = false) => {
    setLoading(true);
    try { const { data } = await api.get("/api/notifications", { params: { status: filter, page } }); setItems(current => append ? [...current, ...(data.items || [])] : data.items || []); setMeta(data.pagination || {}); } finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);
  const patch = async (id, data) => { try { await api.patch(`/api/notifications/${id}`, data); setItems(current => current.map(item => item.id === id ? { ...item, ...data } : item).filter(item => filter !== "all" || !item.archived)); setSelected(current => current?.id === id ? { ...current, ...data } : current); } catch {} };
  const remove = async (id) => { try { await api.delete(`/api/notifications/${id}`); setItems(current => current.filter(item => item.id !== id)); setSelected(null); } catch {} };
  const acceptFriendRequest = async (notification) => {
    if (!notification.friend_request_id) return;
    try {
      await api.post("/api/accept-friend-request", { requestId: notification.friend_request_id });
      setItems(current => current.filter(item => item.id !== notification.id));
      if (!notification.read) patch(notification.id, { read: true });
    } catch {};
  };
  const markAll = async () => { try { await api.post("/api/mark-all-read"); setItems(current => current.map(item => ({ ...item, read: true }))); } catch {} };
  return <section className="workspace-page notifications-page">
    <header className="page-heading"><div><p className="eyebrow">ACTIVITY</p><h1>Notifications</h1><p>Keep up with the people and conversations that matter.</p></div><button className="button-secondary" onClick={markAll}><HiOutlineCheck /> Mark all read</button></header>
    <div className="filter-tabs" role="tablist">{filters.map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)} role="tab">{label}</button>)}</div>
    <div className="surface-card notification-list">{loading && !items.length ? <div className="skeleton-list">{[1,2,3].map(i => <div className="skeleton-card" key={i}><i/><span/><span/></div>)}</div> : items.length ? items.map(item => <NotificationCard key={item.id} notification={item} onOpen={(notification) => { setSelected(notification); if (!notification.read) patch(notification.id, { read: true }); }} onRead={(id) => patch(id, { read: true })} onAccept={acceptFriendRequest} onArchive={(id) => patch(id, { archived: true })} onDelete={remove} />) : <div className="empty-panel"><HiOutlineBell /><h2>Nothing here yet</h2><p>New likes, requests, and updates will appear here.</p></div>}</div>
    {meta.has_more && <button className="button-secondary load-more" disabled={loading} onClick={() => load(meta.page + 1, true)}>Load more</button>}
    {selected && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Notification details" onMouseDown={() => setSelected(null)}><article className="surface-card notification-modal" onMouseDown={(event) => event.stopPropagation()}>{selected.originator_profile_pic ? <img src={selected.originator_profile_pic} alt="" /> : <HiOutlineBell />}<p className="eyebrow">{selected.type?.replace("_", " ") || "UPDATE"}</p><h2>{selected.message}</h2><time>{selected.created_at ? new Date(selected.created_at).toLocaleString([], { dateStyle: "full", timeStyle: "short" }) : "Recently"}</time><div><button className="button-secondary" onClick={() => setSelected(null)}>Dismiss</button>{selected.originator_id && <a className="button-primary" href={`/profile/${selected.originator_id}`}>View profile</a>}</div></article></div>}
  </section>;
}
