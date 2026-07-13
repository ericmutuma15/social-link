import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";

const Messages = () => {
  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState(null);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  // Fetch existing chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/chats`, {
          credentials: "include",
        });
        if (response.status === 401) {
          navigate("/loginprompt", {
            state: { 
              message: "You must be logged in to view your chats.", 
              redirectTo: "/messages" 
            },
          });
          return;
        }
        if (!response.ok) throw new Error("Failed to fetch chats");
        const data = await response.json();
        setChats(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchChats();
  }, [baseUrl, navigate]);

  // Fetch friend list when modal is open
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
              message: "You must be logged in to select a friend for a new conversation.", 
              redirectTo: "/messages" 
            },
          });
          return;
        }
        if (!response.ok) throw new Error("Failed to fetch friends");
        const data = await response.json();
        setFriends(data);
      } catch (err) {
        console.error("Error fetching friends:", err);
      }
    };
    fetchFriends();
  }, [baseUrl, showFriendModal, navigate]);

  // When a friend is selected, navigate to their chat box
  const handleSelectFriend = (friend) => {
    setShowFriendModal(false);
    navigate(`/chat/${friend.id}`);
  };

  return (
    <div className="p-4 bg-gray-900 min-h-screen">
      {/* Header with Plus Icon */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Chats</h2>
        <button
          onClick={() => setShowFriendModal(true)}
          className="text-white hover:text-gray-300 transition"
          title="Start a new conversation"
        >
          <FaPlus size={24} />
        </button>
      </div>

      {/* Chats List */}
      {error && <div className="text-red-500 p-4">{error}</div>}
      {chats.length === 0 ? (
        <div className="text-gray-400 p-4">No conversations found.</div>
      ) : (
        <div className="space-y-4">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
            >
              <img
                src={chat.profile_pic}
                alt={chat.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <p className="font-semibold text-white">{chat.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Friend Selection Modal */}
      {showFriendModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">
              Select a Friend
            </h3>
            <div className="space-y-4 max-h-80 overflow-y-auto no-scrollbar">
              {friends.length > 0 ? (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => handleSelectFriend(friend)}
                    className="flex items-center space-x-4 p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    <img
                      src={friend.profile_pic}
                      alt={friend.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <p className="text-white">{friend.name}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No friends available.</p>
              )}
            </div>
            <button
              onClick={() => setShowFriendModal(false)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
