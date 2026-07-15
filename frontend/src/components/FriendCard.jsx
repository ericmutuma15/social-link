import { Link } from "react-router-dom";
export default function FriendCard({ friend, action }) { return <article className="friend-card"><span>{friend?.name?.[0] || "U"}</span><div><Link to={`/profile/${friend?.id}`}>{friend?.name}</Link><small>{friend?.location || "In your community"}</small></div>{action}</article>; }
