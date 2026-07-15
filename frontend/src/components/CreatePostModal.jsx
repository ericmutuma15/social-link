import { HiOutlinePhotograph } from "react-icons/hi";
import { Link } from "react-router-dom";
export default function CreatePostModal() { return <section className="quick-post"><span className="quick-avatar">✦</span><Link to="/create-post">What’s on your mind?</Link><Link to="/create-post" aria-label="Add media"><HiOutlinePhotograph /></Link></section>; }
