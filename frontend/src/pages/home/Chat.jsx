import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { FaPaperclip } from "react-icons/fa";

const socket = io(import.meta.env.VITE_API_BASE_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

const Chat = () => {
  const { userId } = useParams(); // Chat partner's user ID from URL
  const [currentUser, setCurrentUser] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Fetch current user details
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/current_user`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setCurrentUser(data))
      .catch(console.error);
  }, []);

  // Fetch chat partner details
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/user/${userId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setChatPartner(data))
      .catch(console.error);
  }, [userId]);

  // Fetch chat history and set up Socket.IO events (once currentUser is loaded)
  useEffect(() => {
    if (!currentUser) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL}/messages/${userId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(setMessages)
      .catch(console.error);

    socket.emit("join_chat", { user_id: userId });

    const handleNewMessage = (message) => {
      if (
        (message.sender_id === currentUser.id && message.receiver_id === parseInt(userId)) ||
        (message.sender_id === parseInt(userId) && message.receiver_id === currentUser.id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.emit("leave_chat", { user_id: userId });
      socket.off("new_message", handleNewMessage);
    };
  }, [userId, currentUser]);

  // File upload function: upload file to backend /upload endpoint
  const uploadFile = async () => {
    if (!selectedFile) return null;
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) throw new Error("File upload failed");
      return await response.json(); // returns { media_url, media_type }
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    let mediaData = { media_url: null, media_type: null };
    if (selectedFile) {
      const uploaded = await uploadFile();
      if (uploaded) {
        mediaData = {
          media_url: uploaded.media_url,
          media_type: uploaded.media_type,
        };
      }
    }
    const messageData = {
      receiver_id: parseInt(userId),
      message: newMessage,
      media_url: mediaData.media_url,
      media_type: mediaData.media_type,
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/messages/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(messageData),
        }
      );
      if (!response.ok) throw new Error("Failed to send message");
      setNewMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Create a preview URL for the selected file
  const previewURL = selectedFile ? URL.createObjectURL(selectedFile) : null;

  return (
    <div className="p-4 bg-gray-900 text-white h-screen flex flex-col">
      {/* Chat header with chat partner's details */}
      <div className="flex items-center space-x-3 p-3  rounded-lg sticky top-0 z-10 bg-gray-900">
        <img
          src={chatPartner?.picture || "/default-profile.png"}
          alt="Chat Partner"
          className="w-10 h-10 rounded-full"
        />
        <h2 className="text-lg font-bold">{chatPartner?.name || "Chat"}</h2>
      </div>

      {/* Chat messages */}
      <div className="mt-4 flex-1 overflow-y-auto p-4 bg-gray-800 rounded mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-center ${
              msg.sender_id === currentUser?.id ? "justify-end" : "justify-start"
            }`}
          >
            {msg.sender_id !== currentUser?.id && (
              <img
                src={msg.sender_profile_pic || chatPartner?.picture || "/default-profile.png"}
                alt={msg.sender_name}
                className="w-8 h-8 rounded-full mr-2"
              />
            )}
            <div
              className={`p-2 max-w-xs rounded-lg ${
                msg.sender_id === currentUser?.id ? "bg-blue-500" : "bg-gray-600"
              }`}
            >
              <p>{msg.message}</p>
              {msg.media_url && (
                <div className="mt-2">
                  {msg.media_type && msg.media_type === "image" ? (
                    <img src={msg.media_url} alt="Media" className="w-full rounded" />
                  ) : msg.media_type && msg.media_type === "video" ? (
                    <video controls src={msg.media_url} className="w-full rounded" />
                  ) : (
                    <a
                      href={msg.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View File
                    </a>
                  )}
                </div>
              )}
              <span className="text-xs text-gray-300">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {msg.sender_id === currentUser?.id && (
              <img
                src={currentUser.picture || "/default-profile.png"}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full ml-2"
              />
            )}
          </div>
        ))}
      </div>

      {/* Message input area */}
      <div className="mt-4 flex items-center sticky bottom-0 bg-gray-900 p-3 z-10">
        <input
          className="p-2 bg-gray-700 text-white flex-grow rounded-l"
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        {/* File picker icon */}
        <button
          className="p-2 bg-gray-600"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <FaPaperclip className="text-white" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <button className="p-2 bg-blue-600 rounded-r" onClick={sendMessage}>
          Send
        </button>
      </div>

      {/* Media Preview */}
      {selectedFile && (
        <div className="mt-2 p-2 bg-gray-700 rounded flex items-center">
          {selectedFile.type.startsWith("image") ? (
            <img
              src={previewURL}
              alt="Preview"
              className="w-16 h-16 object-cover rounded mr-2"
            />
          ) : selectedFile.type.startsWith("video") ? (
            <video
              src={previewURL}
              controls
              className="w-16 h-16 rounded mr-2"
            />
          ) : (
            <span className="mr-2">{selectedFile.name}</span>
          )}
          <span className="text-sm">Preview</span>
        </div>
      )}
    </div>
  );
};

export default Chat;
