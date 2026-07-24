import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HiOutlineBriefcase, HiOutlineChatAlt2, HiOutlineGlobeAlt, HiOutlineLocationMarker, HiOutlineOfficeBuilding, HiOutlinePencil, HiOutlinePhotograph, HiOutlineUserGroup, HiOutlineUsers } from "react-icons/hi";
import BackButton from "../../components/BackButton";
import LoadingPage from "./LoadingPage";
import api from "../../services/apiClient";

const pictureUrl = (picture) => picture || "/default-profile.png";

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const ownProfile = !userId;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [profile, userPosts] = await Promise.all([
          api.get(userId ? `/api/user/${userId}` : "/api/current_user"),
          api.get(userId ? `/api/user_posts/${userId}` : "/api/user_posts"),
        ]);
        if (active) {
          setUser(profile.data);
          setPosts(userPosts.data.posts || []);
        }
      } catch (error) {
        if (error.response?.status === 401) navigate("/login");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [navigate, userId]);

  if (loading) return <LoadingPage />;
  if (!user) return <section className="workspace-page profile-page"><div className="surface-card empty-panel"><h2>Profile unavailable</h2><p>Please try again in a moment.</p></div></section>;

  return <section className="workspace-page profile-page">
    <BackButton />
    <div className="profile-cover" />
    <article className="surface-card profile-summary">
      <img className="profile-avatar" src={pictureUrl(user.picture)} alt="" />
      <div className="profile-summary__copy">
        <div className="profile-name-row"><h1>{user.name}</h1><span className="profile-role-badge">{user.role || "Member"}</span>{user.is_friend && <span className="profile-friend-badge">Friend</span>}</div>
        <p className="profile-location"><HiOutlineLocationMarker /> {user.location || "Location not set"}</p>
        <p className="profile-bio">{user.description || "No bio has been added yet."}</p>
        {(user.occupation || user.company || user.website) && <div className="profile-details">{user.occupation && <span><HiOutlineBriefcase /> {user.occupation}</span>}{user.company && <span><HiOutlineOfficeBuilding /> {user.company}</span>}{user.website && <a href={user.website.startsWith("http") ? user.website : `https://${user.website}`} target="_blank" rel="noreferrer"><HiOutlineGlobeAlt /> {user.website.replace(/^https?:\/\//, "")}</a>}</div>}
      </div>
      {ownProfile ? <Link className="button-primary profile-action" to="/edit-profile"><HiOutlinePencil /> Edit profile</Link> : <button className="button-primary profile-action" onClick={() => navigate(`/chat/${user.id}`)}><HiOutlineChatAlt2 /> Message</button>}
    </article>
    <div className="profile-stats">
      <div className="surface-card"><HiOutlinePhotograph /><strong>{posts.length}</strong><span>Posts</span></div>
      <div className="surface-card"><HiOutlineUsers /><strong>{user.friend_count ?? 0}</strong><span>Friends</span></div>
      <div className="surface-card"><HiOutlineUserGroup /><strong>{user.community_count ?? 0}</strong><span>Communities</span></div>
    </div>
    <div className="profile-posts-heading"><div><p className="eyebrow">FROM {ownProfile ? "YOUR" : user.name.toUpperCase() + "’S"} PROFILE</p><h2>Recent posts</h2></div></div>
    {posts.length ? <div className="profile-post-grid">{posts.map((post) => <article className="surface-card profile-post" key={post.id}>{post.media_url && (/\.(mp4|webm|ogg)$/i.test(post.media_url) ? <video controls src={post.media_url} /> : <img src={post.media_url} alt="Post attachment" />)}<p>{post.content}</p><footer><span>♥ {post.like_count || 0}</span><time>{post.timestamp ? new Date(post.timestamp).toLocaleDateString() : "Recently"}</time></footer></article>)}</div> : <div className="surface-card empty-panel profile-empty"><HiOutlinePhotograph /><h2>No posts yet</h2><p>{ownProfile ? "Share something to start your profile story." : "Posts shared by this person will appear here."}</p>{ownProfile && <Link className="button-primary" to="/create-post">Create a post</Link>}</div>}
  </section>;
}
