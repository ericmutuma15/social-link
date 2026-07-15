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

const socket = io(import.meta.env.VITE_API_BASE_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

const Chat = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);

  const [messages, setMessages] = useState([]);

  const [newMessage, setNewMessage] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);

  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Current user

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/current_user`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(setCurrentUser)
      .catch(console.error);
  }, []);

  // Chat partner

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/user/${userId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(setChatPartner)
      .catch(console.error);
  }, [userId]);

  // Chat history

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

  // Upload

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

      if (!response.ok)
        throw new Error("Upload failed");

      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

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

      if (!response.ok)
        throw new Error("Failed to send");

      setNewMessage("");

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    if (!e.target.files?.length) return;

    setSelectedFile(e.target.files[0]);
  };

  const previewURL = selectedFile
    ? URL.createObjectURL(selectedFile)
    : null;

 return (
  <div className="h-screen bg-[#0b1120] text-white flex flex-col overflow-hidden">

    {/* ================= HEADER ================= */}

    <div className="flex-shrink-0 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800 z-20">

      <div className="flex items-center justify-between px-5 py-4">

        <div className="flex items-center gap-4">

          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition"
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

            <div className="flex items-center gap-2 text-sm text-green-400">

              <FaCircle size={8} />

              Online

            </div>

          </div>

        </div>

      </div>

    </div>

    {/* ================= CHAT BODY ================= */}

    <div className="flex-1 flex flex-col min-h-0">

      {/* ================= MESSAGES ================= */}

      <div
        className="
          flex-1
          overflow-y-auto
          px-6
          py-6
          space-y-5
          bg-[#0b1120]
        "
      >

        {messages.length === 0 && (

          <div className="flex h-full items-center justify-center text-slate-500">

            Start your conversation 👋

          </div>

        )}

        {messages.map((msg) => {

          const mine = msg.sender_id === currentUser?.id;

          return (

            <motion.div
              key={msg.id}
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              transition={{
                duration: 0.25,
              }}
              className={`flex ${
                mine ? "justify-end" : "justify-start"
              }`}
            >

              <div
                className={`flex items-end gap-3 max-w-[80%] ${
                  mine ? "flex-row-reverse" : ""
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
                  className={`rounded-3xl px-5 py-3 shadow-xl ${
                    mine
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 rounded-br-md"
                      : "bg-slate-800 rounded-bl-md"
                  }`}
                >

                  {msg.message && (
                    <p className="leading-relaxed whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  )}

                  {msg.media_url && (

                    <div className="mt-3">

                      {msg.media_type === "image" && (

                        <img
                          src={msg.media_url}
                          alt=""
                          className="rounded-2xl max-h-72 object-cover"
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
                            className="underline text-cyan-300"
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
                        : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
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

      {/* ================= INPUT ================= */}

      <div className="flex-shrink-0 border-t border-slate-800 bg-[#111827]">

        {selectedFile && (

          <div className="px-5 pt-4">

            <div className="bg-slate-800 rounded-2xl p-3 flex items-center gap-4">

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

                <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center">

                  📄

                </div>

              )}

              <div className="flex-1">

                <p className="truncate">
                  {selectedFile.name}
                </p>

                <p className="text-sm text-slate-400">
                  Ready to send
                </p>

              </div>

            </div>

          </div>

        )}

        <div className="flex items-center gap-3 p-4">

          <button
            onClick={() => fileInputRef.current.click()}
            className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
          >
            <FaPaperclip />
          </button>

          <input
            hidden
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <input
            type="text"
            value={newMessage}
            placeholder="Type a message..."
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="
              flex-1
              bg-slate-800
              border
              border-slate-700
              rounded-full
              px-6
              py-3
              outline-none
              focus:border-cyan-500
            "
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
              flex
              items-center
              justify-center
            "
          >
            <IoSend />
          </button>

        </div>

      </div>

    </div>

  </div>
);

};

export default Chat;