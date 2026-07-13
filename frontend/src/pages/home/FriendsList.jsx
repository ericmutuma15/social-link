import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const FriendsList = () => {
  const [friends, setFriends] = useState([]);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/friends`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch friends");
        const data = await response.json();
        setFriends(data);
      } catch (err) {
        console.error(err.message);
      }
    };

    fetchFriends();
  }, [baseUrl]);

  return (
    <div className="p-4 bg-gray-900 space-y-4">
      <h2 className="text-lg font-bold text-white">Friends List</h2>
      {friends.length === 0 ? (
        <p className="text-gray-400">No friends yet</p>
      ) : (
        friends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center space-x-4 p-2 bg-gray-800 rounded-lg cursor-pointer"
            onClick={() => navigate(`/profile/${friend.id}`)}
          >
            <img
              src={friend.profile_pic}
              alt={friend.name}
              className="w-10 h-10 rounded-full"
            />
            <p className="text-white">{friend.name}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default FriendsList;
