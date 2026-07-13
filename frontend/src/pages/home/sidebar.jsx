import React, { useEffect, useState } from "react";
import {
  FaHome,
  FaBell,
  FaEnvelope,
  FaUserFriends,
  FaUser,
  FaDollarSign,
  FaPlus,
} from "react-icons/fa";
import { Link } from "react-router-dom";

const Sidebar = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const fetchNotifCount = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/notifications`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch notifications");
        const data = await response.json();
        // Set the count of notifications (assuming all returned notifications are unread)
        setNotifCount(data.length);
      } catch (error) {
        console.error("Error fetching notifications count:", error);
      }
    };
    fetchNotifCount();
  }, [baseUrl]);

  return (
    <div className="relative">
      {/* Sidebar for larger screens */}
      <div className="h-screen w-64 bg-gray-900 text-white shadow-lg fixed left-0 top-0 z-40 flex flex-col lg:flex">
        {/* Navigation items */}
        <div className="flex flex-col justify-between h-full p-4 overflow-y-auto">
          <div className="space-y-4">
            <Link to="/home">
              <div className="flex items-center space-x-4 p-3 rounded-md hover:bg-gray-800 cursor-pointer">
                <FaHome className="text-xl" />
                <span className="text-lg font-medium">Home</span>
              </div>
            </Link>
            <Link to="/notifications">
              <div className="relative flex items-center space-x-4 p-3 rounded-md hover:bg-gray-800 cursor-pointer">
                <FaBell className="text-xl" />
                <span className="text-lg font-medium">Notifications</span>
                {notifCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                    {notifCount}
                  </span>
                )}
              </div>
            </Link>
            <Link to="/messages">
              <div className="flex items-center space-x-4 p-3 rounded-md hover:bg-gray-800 cursor-pointer">
                <FaEnvelope className="text-xl" />
                <span className="text-lg font-medium">Messages</span>
              </div>
            </Link>
            <Link to="/add-users">
              <div className="flex items-center space-x-4 p-3 rounded-md hover:bg-gray-800 cursor-pointer">
                <FaUserFriends className="text-xl" />
                <span className="text-lg font-medium">Add Friends</span>
              </div>
            </Link>
            <Link to="/subscriptions">
              <div className="flex items-center space-x-4 p-3 rounded-md hover:bg-gray-800 cursor-pointer">
                <FaDollarSign className="text-xl" />
                <span className="text-lg font-medium">Subscriptions</span>
              </div>
            </Link>
            <Link to="/profile">
              <div className="flex items-center space-x-4 p-3 rounded-md hover:bg-gray-800 cursor-pointer">
                <FaUser className="text-xl" />
                <span className="text-lg font-medium">My Profile</span>
              </div>
            </Link>
          </div>

          {/* Bottom button */}
          <div>
            <Link to="/create-post">
              <button className="w-full bg-blue-500 text-white flex items-center justify-center py-3 rounded-lg shadow-md hover:bg-blue-600">
                <FaPlus className="text-xl mr-2" />
                <span className="text-lg font-medium">Create Post</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
