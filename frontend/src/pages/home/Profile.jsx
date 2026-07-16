import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import LoadingPage from "./LoadingPage";
import BackButton from "../../components/BackButton";

import {
  FaUserFriends,
  FaRegCommentDots,
  FaMapMarkerAlt,
  FaEdit,
  FaImages,
  FaUsers,
} from "react-icons/fa";

import { useTheme } from "../../context/ThemeContext";

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { theme } = useTheme();

  const isOwnProfile = !userId;

  const [user, setUser] = useState(null);

  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [expandedPostId, setExpandedPostId] =
    useState(null);

  const baseUrl =
    import.meta.env.VITE_API_BASE_URL;

  const pageClass =
    theme === "dark"
      ? "bg-[#0b1120] text-white"
      : "bg-slate-100 text-slate-900";

  const cardClass =
    theme === "dark"
      ? "bg-slate-900/70 border border-slate-800"
      : "bg-white border border-slate-200 shadow-sm";

  const secondaryText =
    theme === "dark"
      ? "text-slate-400"
      : "text-slate-500";

  const sectionTitle =
    theme === "dark"
      ? "text-white"
      : "text-slate-900";
        // ================= FETCH USER =================

  const fetchUserDetails = async () => {
    const endpoint = userId
      ? `${baseUrl}/api/user/${userId}`
      : `${baseUrl}/api/current_user`;

    try {
      const response = await fetch(endpoint, {
        credentials: "include",
      });

      if (response.status === 401) {
        navigate("/loginprompt", {
          state: {
            message: "Please log in to view this profile.",
            redirectTo: `/profile/${userId || ""}`,
          },
        });
        return;
      }

      if (!response.ok) {
        console.error("Failed to fetch user");
        return;
      }

      const data = await response.json();

      setUser(data);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= FETCH POSTS =================

  const fetchUserPosts = async () => {
    const endpoint = userId
      ? `${baseUrl}/api/user_posts/${userId}`
      : `${baseUrl}/api/user_posts`;

    try {
      const response = await fetch(endpoint, {
        credentials: "include",
      });

      if (response.status === 401) {
        navigate("/loginprompt", {
          state: {
            message: "Please log in to view posts.",
            redirectTo: `/profile/${userId || ""}`,
          },
        });
        return;
      }

      if (!response.ok) {
        console.error("Failed to fetch posts");
        return;
      }

      const data = await response.json();

      setPosts(data.posts || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= LOAD PAGE =================

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      await Promise.all([
        fetchUserDetails(),
        fetchUserPosts(),
      ]);

      setLoading(false);
    };

    loadProfile();
  }, [userId]);

  // ================= VIDEO =================

  const handleVideoClick = (postId) => {
    setExpandedPostId((prev) =>
      prev === postId ? null : postId
    );
  };

  if (loading) return <LoadingPage />;

  if (!user) {
    return (
      <div
        className={`${pageClass} min-h-screen flex items-center justify-center`}
      >
        User not found.
      </div>
    );
  };
  return (
  <div className={`${pageClass} min-h-screen transition-colors duration-300`}>
    <BackButton/>

    {/* ================= HERO ================= */}

    <motion.div
      initial={{ opacity: 0, y: -25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative"
    >

      {/* Cover */}

      <div
        className="
          h-56
          md:h-72
          bg-gradient-to-r
          from-cyan-600
          via-blue-600
          to-indigo-700
        "
      />

      {/* Overlay */}

      <div className="absolute inset-0 bg-black/30" />

      {/* Profile Card */}

      <div className="relative max-w-6xl mx-auto px-6">

        <div
          className={`
            -mt-20
            rounded-3xl
            backdrop-blur-xl
            ${cardClass}
            p-6
            md:p-8
          `}
        >

          <div className="flex flex-col lg:flex-row lg:items-center gap-8">

            {/* Avatar */}

            <motion.img
              whileHover={{
                scale: 1.05,
              }}
              src={
                user.picture ||
                "/default-profile.png"
              }
              alt={user.name}
              className="
                w-36
                h-36
                rounded-full
                object-cover
                ring-4
                ring-cyan-500
                shadow-2xl
              "
            />

            {/* User Info */}

            <div className="flex-1">

              <div className="flex flex-wrap items-center gap-4">

                <h1
                  className={`text-4xl font-bold ${sectionTitle}`}
                >
                  {user.name}
                </h1>

                {user.is_friend && (

                  <span
                    className="
                      px-4
                      py-1
                      rounded-full
                      bg-green-500/20
                      text-green-400
                      text-sm
                    "
                  >
                    Friend
                  </span>

                )}

              </div>

              <div
                className={`flex items-center gap-2 mt-3 ${secondaryText}`}
              >
                <FaMapMarkerAlt />

                {user.location || "Location not set"}
              </div>

              <p
                className={`mt-5 leading-7 max-w-3xl ${secondaryText}`}
              >
                {user.description ||
                  "No bio has been added yet."}
              </p>

              {/* Stats */}

              <div className="grid grid-cols-3 gap-5 mt-8">

                <div
                  className={`
                    rounded-2xl
                    p-5
                    text-center
                    ${cardClass}
                  `}
                >
                  <FaImages className="mx-auto mb-2 text-cyan-400 text-xl" />

                  <h2 className="text-2xl font-bold">
                    {posts.length}
                  </h2>

                  <p className={secondaryText}>
                    Posts
                  </p>
                </div>

                <div
                  className={`
                    rounded-2xl
                    p-5
                    text-center
                    ${cardClass}
                  `}
                >
                  <FaUserFriends className="mx-auto mb-2 text-cyan-400 text-xl" />

                  <h2 className="text-2xl font-bold">
                    {user.friend_count ?? "--"}
                  </h2>

                  <p className={secondaryText}>
                    Friends
                  </p>
                </div>

                <div
                  className={`
                    rounded-2xl
                    p-5
                    text-center
                    ${cardClass}
                  `}
                >
                  <FaUsers className="mx-auto mb-2 text-cyan-400 text-xl" />

                  <h2 className="text-2xl font-bold">
                    {user.community_count ?? "--"}
                  </h2>

                  <p className={secondaryText}>
                    Communities
                  </p>
                </div>

              </div>

            </div>

            {/* Buttons */}

            <div className="flex flex-col gap-4">

              {isOwnProfile ? (

                <Link
                  to="/edit-profile"
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                    px-8
                    py-3
                    rounded-2xl
                    bg-gradient-to-r
                    from-cyan-500
                    to-blue-600
                    hover:scale-105
                    transition
                    shadow-xl
                  "
                >
                  <FaEdit />

                  Edit Profile
                </Link>

              ) : (

                <button
                  onClick={() =>
                    navigate(`/chat/${user.id}`)
                  }
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                    px-8
                    py-3
                    rounded-2xl
                    bg-gradient-to-r
                    from-cyan-500
                    to-blue-600
                    hover:scale-105
                    transition
                    shadow-xl
                  "
                >
                  <FaRegCommentDots />

                  Message
                </button>

              )}

            </div>

          </div>

        </div>

      </div>

    </motion.div>

    {/* ================= POSTS ================= */}

    <div className="max-w-6xl mx-auto px-6 py-10">

      <h2 className="text-3xl font-bold mb-8">
        Recent Posts
      </h2>
            {posts.length > 0 ? (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

          {posts.map((post) => (

            <motion.div
              key={post.id}
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              whileHover={{
                y: -6,
              }}
              transition={{
                duration: 0.25,
              }}
              className={`
                overflow-hidden
                rounded-3xl
                ${cardClass}
                shadow-xl
                transition-all
              `}
            >

              {/* ================= MEDIA ================= */}

              {post.media_url ? (

                post.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (

                  <img
                    src={post.media_url}
                    alt=""
                    className="
                      w-full
                      h-72
                      object-cover
                      transition
                      duration-500
                      hover:scale-105
                    "
                  />

                ) : post.media_url.match(/\.(mp4|webm|ogg)$/i) ? (

                  <div
                    onClick={() =>
                      handleVideoClick(post.id)
                    }
                    className="cursor-pointer"
                  >

                    <video
                      controls={
                        expandedPostId === post.id
                      }
                      src={post.media_url}
                      className={`
                        w-full
                        object-cover
                        transition-all
                        duration-300
                        ${
                          expandedPostId === post.id
                            ? "h-auto"
                            : "h-72"
                        }
                      `}
                    />

                  </div>

                ) : (

                  <div
                    className="
                      h-72
                      flex
                      items-center
                      justify-center
                      text-slate-400
                    "
                  >
                    Unsupported Media
                  </div>

                )

              ) : (

                <div
                  className="
                    h-72
                    flex
                    items-center
                    justify-center
                    text-6xl
                    bg-gradient-to-br
                    from-slate-800
                    to-slate-900
                  "
                >
                  📷
                </div>

              )}

              {/* ================= CONTENT ================= */}

              <div className="p-6">

                <p
                  className="
                    leading-7
                    whitespace-pre-wrap
                  "
                >
                  {post.content}
                </p>

                {/* Stats */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    mt-6
                    pt-5
                    border-t
                    border-slate-700/40
                  "
                >

                  <div className="flex items-center gap-5">

                    <div className="flex items-center gap-2">

                      ❤️

                      <span>
                        {post.like_count}
                      </span>

                    </div>

                  </div>

                  <span
                    className={`
                      text-sm
                      ${secondaryText}
                    `}
                  >
                    {new Date(
                      post.timestamp
                    ).toLocaleDateString()}
                  </span>

                </div>

              </div>

            </motion.div>

          ))}

        </div>

      ) : (

        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          className={`
            rounded-3xl
            ${cardClass}
            py-24
            text-center
          `}
        >

          <div className="text-7xl mb-6">
            📸
          </div>

          <h3 className="text-3xl font-bold">
            No Posts Yet
          </h3>

          <p
            className={`mt-4 ${secondaryText}`}
          >
            When posts are shared, they'll
            appear here.
          </p>

        </motion.div>

      )}
          </div>

    {/* ================= FLOATING BACK BUTTON (Mobile) ================= */}

    <motion.button
      initial={{
        opacity: 0,
        scale: 0.8,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      whileHover={{
        scale: 1.08,
      }}
      whileTap={{
        scale: 0.95,
      }}
      onClick={() => navigate(-1)}
      className="
        fixed
        bottom-6
        left-6
        md:hidden
        w-14
        h-14
        rounded-full
        bg-gradient-to-r
        from-cyan-500
        to-blue-600
        shadow-2xl
        flex
        items-center
        justify-center
        z-50
      "
    >

      ←

    </motion.button>

  </div>
);
};

export default Profile;