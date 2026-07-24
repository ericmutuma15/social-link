import { useEffect, useMemo, useState } from "react";
import { HiOutlineEye, HiOutlineLocationMarker, HiOutlineSearch, HiOutlineUserAdd, HiOutlineUsers } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/apiClient";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

function PeopleSkeleton() {
  return (
    <div className="people-grid" aria-label="Loading people">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="people-card people-card--skeleton" key={index}>
          <span className="people-shimmer people-shimmer--avatar" />
          <div><span className="people-shimmer people-shimmer--title" /><span className="people-shimmer people-shimmer--copy" /></div>
          <span className="people-shimmer people-shimmer--button" />
        </div>
      ))}
    </div>
  );
}

export default function ExploreUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      try {
        const { data } = await api.get("/api/users/discover");
        if (active) setUsers(data);
      } catch (error) {
        if (error.response?.status === 401) navigate("/login");
        else toast.error("Unable to load people right now.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadUsers();
    return () => { active = false; };
  }, [navigate]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.name, user.department, user.location, user.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [search, users]);

  const sendFriendRequest = async (userId) => {
    setSendingId(userId);
    try {
      await api.post("/api/send-friend-request", { userId });
      setUsers((current) => current.filter((user) => user.id !== userId));
      toast.success("Friend request sent");
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to send friend request");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <section className="workspace-page people-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">COMMUNITY</p>
          <h1>Discover people</h1>
          <p>Meet people in your community and grow your network.</p>
        </div>
      </header>

      <label className="people-search">
        <HiOutlineSearch aria-hidden="true" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, department, or location" />
      </label>

      {loading ? <PeopleSkeleton /> : filteredUsers.length ? (
        <div className="people-grid">
          {filteredUsers.map((user) => (
            <article className="surface-card people-card" key={user.id}>
              <div className="people-card__header">
                {user.picture ? <img className="people-avatar" src={user.picture} alt="" /> : <span className="people-avatar people-avatar--fallback">{initials(user.name)}</span>}
                <div>
                  <h2>{user.name}</h2>
                  {user.department && <p className="people-department">{user.department}</p>}
                </div>
              </div>
              <p className="people-bio">{user.description || "No bio available yet."}</p>
              {user.location && <p className="people-location"><HiOutlineLocationMarker aria-hidden="true" /> {user.location}</p>}
              <div className="people-card__actions">
                <button className="button-primary" onClick={() => sendFriendRequest(user.id)} disabled={sendingId === user.id}>
                  <HiOutlineUserAdd /> {sendingId === user.id ? "Sending…" : "Add friend"}
                </button>
                <button className="button-secondary people-view-button" onClick={() => navigate(`/profile/${user.id}`)} aria-label={`View ${user.name}'s profile`} title="View profile">
                  <HiOutlineEye />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="surface-card people-empty">
          <HiOutlineUsers aria-hidden="true" />
          <h2>{search ? "No people found" : "You’re all caught up"}</h2>
          <p>{search ? "Try a different name, department, or location." : "There are no new people to discover right now."}</p>
        </div>
      )}
    </section>
  );
}
