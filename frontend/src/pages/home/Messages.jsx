import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";

import { FaPlus, FaComments, FaTimes, FaSearch } from "react-icons/fa";

import BackButton from "../../components/BackButton";

import { useTheme } from "../../context/ThemeContext";

const Messages = () => {
  const navigate = useNavigate();

  const { theme } = useTheme();

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const [chats, setChats] = useState([]);

  const [friends, setFriends] = useState([]);

  const [error, setError] = useState(null);

  const [loading, setLoading] = useState(true);

  const [showFriendModal, setShowFriendModal] = useState(false);

  const [search, setSearch] = useState("");

  const pageClass =
    theme === "dark"
      ? "bg-[#0b1120] text-white"
      : "bg-slate-100 text-slate-900";

  const cardClass =
    theme === "dark"
      ? "bg-slate-900/70 border border-slate-800"
      : "bg-white border border-slate-200 shadow-sm";

  const secondaryText = theme === "dark" ? "text-slate-400" : "text-slate-500";
  // Fetch existing chats

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);

        const response = await fetch(`${baseUrl}/api/chats`, {
          credentials: "include",
        });

        if (response.status === 401) {
          navigate("/loginprompt", {
            state: {
              message: "You must be logged in to view your chats.",
              redirectTo: "/messages",
            },
          });

          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch chats");
        }

        const data = await response.json();

        setChats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [baseUrl, navigate]);

  // Fetch friends when modal opens

  useEffect(() => {
    if (!showFriendModal) return;

    const fetchFriends = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/friends`, {
          credentials: "include",
        });

        if (response.status === 401) {
          navigate("/loginprompt", {
            state: {
              message: "You must be logged in to start a conversation.",
              redirectTo: "/messages",
            },
          });

          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch friends");
        }

        const data = await response.json();

        setFriends(data);
      } catch (err) {
        console.error("Error fetching friends:", err);
      }
    };

    fetchFriends();
  }, [baseUrl, showFriendModal, navigate]);

  // Select friend and open chat

  const handleSelectFriend = (friend) => {
    setShowFriendModal(false);

    setSearch("");

    navigate(`/chat/${friend.id}`);
  };

  // Filter friends by search

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.4,
      }}
      className={`
        h-full
        ${pageClass}
        flex
        flex-col
      `}
    >
      <div
        className="
        max-w-3xl
        mx-auto
      "
      >
        <BackButton />

        {/* Header */}

        <div
          className="
flex
items-center
justify-between
mb-4
shrink-0
"
        >
          <div>
            <h1
              className="
              text-2xl
              sm:text-3xl
              font-bold
              flex
              items-center
              gap-3
            "
            >
              <FaComments
                className="
                  text-cyan-500
                "
              />
              Messages
            </h1>

            <p
              className={`
              text-sm
              mt-1
              ${secondaryText}
            `}
            >
              Stay connected with your friends
            </p>
          </div>

          {/* New Chat Button */}

          <motion.button
            whileHover={{
              scale: 1.05,
            }}
            whileTap={{
              scale: 0.95,
            }}
            onClick={() => setShowFriendModal(true)}
            className="
              w-12
              h-12
              rounded-full
              flex
              items-center
              justify-center
              bg-gradient-to-r
              from-cyan-500
              to-blue-600
              text-white
              shadow-lg
              shadow-cyan-500/20
            "
            title="
              Start new conversation
            "
          >
            <FaPlus />
          </motion.button>
        </div>
        {/* Error Message */}

        {error && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="
              mb-5
              p-4
              rounded-2xl
              bg-red-500/10
              border
              border-red-500/30
              text-red-400
              text-sm
            "
          >
            {error}
          </motion.div>
        )}

        {/* Loading Skeleton */}

        {loading && (
          <div
            className="
            space-y-3
          "
          >
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`
                  h-20
                  rounded-2xl
                  animate-pulse

                  ${theme === "dark" ? "bg-slate-800" : "bg-slate-200"}

                `}
              />
            ))}
          </div>
        )}

        {/* Empty State */}

        {!loading && chats.length === 0 && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className={`
              ${cardClass}
              rounded-3xl
              p-10
              text-center
            `}
          >
            <FaComments
              className="
                mx-auto
                text-5xl
                text-cyan-500
                mb-4
              "
            />

            <h2
              className="
              text-lg
              font-semibold
            "
            >
              No conversations yet
            </h2>

            <p
              className={`
              mt-2
              text-sm
              ${secondaryText}
            `}
            >
              Start a conversation with your friends.
            </p>
          </motion.div>
        )}

        {/* Chats List */}

        {!loading && chats.length > 0 && (
          <div
            className="
            flex-1
            overflow-y-auto
            space-y-3
            pr-2
            no-scrollbar
          "
          >
            {chats.map((chat) => (
              <motion.div
                key={chat.id}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                whileHover={{
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className={`
                  ${cardClass}

                  rounded-2xl

                  p-4

                  flex

                  items-center

                  gap-4

                  cursor-pointer

                  transition

                  backdrop-blur-xl
                `}
              >
                {/* Avatar */}

                <img
                  src={chat.profile_pic || "/default-profile.png"}
                  alt={chat.name}
                  className="
                    w-14
                    h-14
                    rounded-full
                    object-cover
                    border-2
                    border-cyan-500/30
                  "
                />

                {/* Chat Information */}

                <div
                  className="
                  flex-1
                "
                >
                  <h3
                    className="
                    font-semibold
                    text-base
                  "
                  >
                    {chat.name}
                  </h3>

                  <p
                    className={`
                    text-sm
                    mt-1
                    ${secondaryText}
                  `}
                  >
                    Open conversation
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {/* Friend Selection Modal */}

        <AnimatePresence>
          {showFriendModal && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="
                fixed
                inset-0
                z-50
                flex
                items-center
                justify-center
                bg-black/60
                backdrop-blur-sm
                p-4
              "
            >
              <motion.div
                initial={{
                  scale: 0.9,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                exit={{
                  scale: 0.9,
                  opacity: 0,
                }}
                className={`
                  ${cardClass}

                  w-full
                  max-w-md

                  rounded-3xl

                  p-6

                  shadow-2xl
                `}
              >
                {/* Modal Header */}

                <div
                  className="
                  flex
                  items-center
                  justify-between
                  mb-5
                "
                >
                  <h2
                    className="
                    text-xl
                    font-bold
                  "
                  >
                    New Conversation
                  </h2>

                  <button
                    onClick={() => setShowFriendModal(false)}
                    className="
                      w-9
                      h-9
                      rounded-full
                      flex
                      items-center
                      justify-center
                      hover:bg-slate-800
                      transition
                    "
                  >
                    <FaTimes />
                  </button>
                </div>

                {/* Search Friends */}

                <div
                  className="
                  relative
                  mb-5
                "
                >
                  <FaSearch
                    className="
                      absolute
                      left-4
                      top-4
                      text-slate-400
                    "
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="
                      Search friends...
                    "
                    className="
                      w-full
                      pl-11
                      p-3
                      rounded-2xl
                      bg-slate-800
                      text-white
                      outline-none
                      focus:ring-2
                      focus:ring-cyan-500
                    "
                  />
                </div>

                {/* Friends List */}

                <div
                  className="
                  space-y-3
                  max-h-80
                  overflow-y-auto
                  no-scrollbar
                "
                >
                  {filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => (
                      <motion.div
                        key={friend.id}
                        whileHover={{
                          scale: 1.02,
                        }}
                        whileTap={{
                          scale: 0.98,
                        }}
                        onClick={() => handleSelectFriend(friend)}
                        className={`
                          flex
                          items-center
                          gap-3
                          p-3
                          rounded-2xl
                          cursor-pointer
                          transition

                          ${
                            theme === "dark"
                              ? "hover:bg-slate-800"
                              : "hover:bg-slate-100"
                          }

                        `}
                      >
                        <img
                          src={friend.profile_pic || "/default-profile.png"}
                          alt={friend.name}
                          className="
                            w-12
                            h-12
                            rounded-full
                            object-cover
                          "
                        />

                        <div>
                          <p
                            className="
                            font-medium
                          "
                          >
                            {friend.name}
                          </p>

                          <p
                            className={`
                            text-xs
                            ${secondaryText}
                          `}
                          >
                            Start chatting
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div
                      className="
                      text-center
                      py-8
                    "
                    >
                      <p
                        className={`
                        text-sm
                        ${secondaryText}
                      `}
                      >
                        No friends found
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Messages;
