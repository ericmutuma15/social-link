import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { motion } from "framer-motion";

import {
  FaPaperclip,
  FaArrowLeft,
  FaCircle,
} from "react-icons/fa";

import { IoSend } from "react-icons/io5";

import { useTheme } from "../../context/ThemeContext";

const socket = io(import.meta.env.VITE_API_BASE_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

const Chat = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  // Theme
  const { theme } = useTheme();

  // Current user
  const [currentUser, setCurrentUser] = useState(null);

  // Chat partner
  const [chatPartner, setChatPartner] = useState(null);

  // Messages
  const [messages, setMessages] = useState([]);

  // Composer
  const [newMessage, setNewMessage] = useState("");

  // Attachment
  const [selectedFile, setSelectedFile] = useState(null);

  // Refs
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll whenever a new message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
    // ================= CURRENT USER =================

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/current_user`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(setCurrentUser)
      .catch(console.error);
  }, []);

  // ================= CHAT PARTNER =================

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/user/${userId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(setChatPartner)
      .catch(console.error);
  }, [userId]);

  // ================= CHAT HISTORY =================

  useEffect(() => {
    if (!currentUser) return;

    fetch(`${import.meta.env.VITE_API_BASE_URL}/messages/${userId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(setMessages)
      .catch(console.error);

    socket.emit("join_chat", {
      user_id: userId,
    });

    const handleNewMessage = (message) => {
      if (
        (message.sender_id === currentUser.id &&
          message.receiver_id === Number(userId)) ||
        (message.sender_id === Number(userId) &&
          message.receiver_id === currentUser.id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.emit("leave_chat", {
        user_id: userId,
      });

      socket.off("new_message", handleNewMessage);
    };
  }, [currentUser, userId]);

  // ================= FILE UPLOAD =================

  const uploadFile = async () => {
    if (!selectedFile) return null;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/upload`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // ================= SEND MESSAGE =================

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    let mediaData = {
      media_url: null,
      media_type: null,
    };

    if (selectedFile) {
      const uploaded = await uploadFile();

      if (uploaded) {
        mediaData = uploaded;
      }
    }

    const messageData = {
      receiver_id: Number(userId),
      message: newMessage,
      media_url: mediaData.media_url,
      media_type: mediaData.media_type,
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/messages/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(messageData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send");
      }

      setNewMessage("");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ================= FILE PICKER =================

  const handleFileChange = (e) => {
    if (!e.target.files?.length) return;

    setSelectedFile(e.target.files[0]);
  };

  const previewURL = selectedFile
    ? URL.createObjectURL(selectedFile)
    : null;
      return (
    <div
      className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${
        theme === "dark"
          ? "bg-[#0b1120] text-white"
          : "bg-slate-100 text-slate-900"
      }`}
    >
      {/* ================= HEADER ================= */}

      <header
        className={`
          flex-shrink-0
          sticky
          top-0
          z-50
          backdrop-blur-xl
          border-b
          transition-colors
          duration-300
          ${
            theme === "dark"
              ? "bg-slate-900/90 border-slate-800"
              : "bg-white/90 border-slate-200"
          }
        `}
      >
        <div className="flex items-center justify-between px-5 py-4">

          <div className="flex items-center gap-4">

            <button
              onClick={() => navigate(-1)}
              className={`
                w-10
                h-10
                rounded-full
                flex
                items-center
                justify-center
                transition
                ${
                  theme === "dark"
                    ? "bg-slate-800 hover:bg-slate-700"
                    : "bg-slate-200 hover:bg-slate-300"
                }
              `}
            >
              <FaArrowLeft />
            </button>

            <img
              src={
                chatPartner?.picture ||
                "/default-profile.png"
              }
              alt=""
              className="w-12 h-12 rounded-full object-cover ring-2 ring-cyan-500"
            />

            <div>

              <h2 className="font-semibold text-lg">
                {chatPartner?.name || "Loading..."}
              </h2>

              <div className="flex items-center gap-2 text-sm text-green-500">

                <FaCircle size={8} />

                <span>Online</span>

              </div>

            </div>

          </div>

        </div>

      </header>

      {/* ================= CHAT CONTAINER ================= */}

      <main
        className="
          flex-1
          min-h-0
          flex
          flex-col
          overflow-hidden
        "
      >
                {/* ================= MESSAGES ================= */}

        <div
          className={`
            flex-1
            min-h-0
            overflow-y-auto
            px-5
            py-6
            space-y-5
            transition-colors
            duration-300
            ${
              theme === "dark"
                ? "bg-[#0b1120]"
                : "bg-slate-100"
            }
          `}
        >
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">

              <div
                className={`text-center ${
                  theme === "dark"
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              >
                <div className="text-5xl mb-3">💬</div>

                <h3 className="text-xl font-semibold">
                  No messages yet
                </h3>

                <p className="mt-2">
                  Start your conversation.
                </p>
              </div>

            </div>
          )}

          {messages.map((msg) => {

            const mine =
              msg.sender_id === currentUser?.id;

            return (

              <motion.div
                key={msg.id}
                initial={{
                  opacity: 0,
                  y: 18,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 0.22,
                }}
                className={`flex ${
                  mine
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                <div
                  className={`flex items-end gap-3 max-w-[85%] lg:max-w-[70%] ${
                    mine
                      ? "flex-row-reverse"
                      : ""
                  }`}
                >

                  <img
                    src={
                      mine
                        ? currentUser?.picture ||
                          "/default-profile.png"
                        : chatPartner?.picture ||
                          "/default-profile.png"
                    }
                    alt=""
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />

                  <div
                    className={`rounded-3xl px-5 py-3 shadow-lg ${
                      mine
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 rounded-br-md text-white"
                        : theme === "dark"
                        ? "bg-slate-800 text-white rounded-bl-md"
                        : "bg-white text-slate-900 rounded-bl-md border border-slate-200"
                    }`}
                  >

                    {msg.message && (
                      <p className="leading-relaxed whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    )}

                    {msg.media_url && (

                      <div className="mt-3">

                        {msg.media_type === "image" && (
                          <img
                            src={msg.media_url}
                            alt=""
                            className="rounded-2xl max-h-80 object-cover"
                          />
                        )}

                        {msg.media_type === "video" && (
                          <video
                            controls
                            src={msg.media_url}
                            className="rounded-2xl max-h-80"
                          />
                        )}

                        {msg.media_type !== "image" &&
                          msg.media_type !== "video" && (
                            <a
                              href={msg.media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline text-cyan-400"
                            >
                              Open attachment
                            </a>
                          )}

                      </div>

                    )}

                    <div
                      className={`mt-2 text-[11px] ${
                        mine
                          ? "text-cyan-100"
                          : theme === "dark"
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      {new Date(
                        msg.timestamp
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>

                  </div>

                </div>

              </motion.div>

            );

          })}

          <div ref={messagesEndRef} />

        </div>
                {/* ================= COMPOSER ================= */}

        <div
          className={`
            flex-shrink-0
            border-t
            backdrop-blur-xl
            transition-colors
            duration-300
            ${
              theme === "dark"
                ? "bg-slate-900/95 border-slate-800"
                : "bg-white/95 border-slate-200"
            }
          `}
        >

          {/* Attachment Preview */}

          {selectedFile && (

            <div className="px-5 pt-4">

              <div
                className={`
                  rounded-2xl
                  p-3
                  flex
                  items-center
                  gap-4
                  ${
                    theme === "dark"
                      ? "bg-slate-800"
                      : "bg-slate-100"
                  }
                `}
              >

                {selectedFile.type.startsWith("image") ? (

                  <img
                    src={previewURL}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover"
                  />

                ) : selectedFile.type.startsWith("video") ? (

                  <video
                    src={previewURL}
                    controls
                    className="w-20 rounded-xl"
                  />

                ) : (

                  <div
                    className={`
                      w-20
                      h-20
                      rounded-xl
                      flex
                      items-center
                      justify-center
                      text-3xl
                      ${
                        theme === "dark"
                          ? "bg-slate-700"
                          : "bg-slate-200"
                      }
                    `}
                  >
                    📄
                  </div>

                )}

                <div className="flex-1 overflow-hidden">

                  <p className="font-medium truncate">
                    {selectedFile.name}
                  </p>

                  <p
                    className={`text-sm ${
                      theme === "dark"
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    Ready to send
                  </p>

                </div>

                <button
                  onClick={() => {
                    setSelectedFile(null);

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="text-red-500 hover:text-red-400 transition"
                >
                  Remove
                </button>

              </div>

            </div>

          )}

          {/* Input Row */}

          <div className="flex items-center gap-3 p-4">

            <button
              onClick={() => fileInputRef.current?.click()}
              className={`
                w-12
                h-12
                rounded-full
                flex
                items-center
                justify-center
                transition
                ${
                  theme === "dark"
                    ? "bg-slate-800 hover:bg-slate-700"
                    : "bg-slate-200 hover:bg-slate-300"
                }
              `}
            >
              <FaPaperclip size={18} />
            </button>

            <input
              hidden
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
            />

            <input
              type="text"
              value={newMessage}
              placeholder="Type a message..."
              onChange={(e) =>
                setNewMessage(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              className={`
                flex-1
                rounded-full
                px-6
                py-3
                outline-none
                border
                transition-all
                ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700 focus:border-cyan-500 placeholder:text-slate-400"
                    : "bg-slate-100 border-slate-300 focus:border-cyan-500 placeholder:text-slate-500"
                }
              `}
            />

            <button
              onClick={sendMessage}
              className="
                w-12
                h-12
                rounded-full
                bg-gradient-to-r
                from-cyan-500
                to-blue-600
                hover:scale-105
                active:scale-95
                transition
                flex
                items-center
                justify-center
                shadow-lg
              "
            >
              <IoSend
                size={20}
                className="text-white"
              />
            </button>

          </div>

        </div>

      </main>
          </div>
  );
};

export default Chat;