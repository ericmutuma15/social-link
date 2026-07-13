import React, { useEffect, useState, useCallback } from "react";
import { FaUserCheck, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Notify = () => {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [loadingRequestId, setLoadingRequestId] = useState(null); // Track loading state for accept button
  const [toast, setToast] = useState(""); // For modern toast messages
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  // Fetch Notifications Function
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/notifications`, {
        credentials: "include",
      });
      if (response.status === 401) {
        navigate("/loginprompt", {
          state: { 
            message: "You must be logged in to view your notifications.", 
            redirectTo: "/notify" 
          },
        });
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch notifications");

      let data = await response.json();
      console.log("Notifications received:", data);

      // Filter out any invalid friend request notifications if needed
      data = data.filter(
        (notif) => notif.type !== "friend_request" || notif.friend_request_id !== null
      );

      setNotifications(data);
    } catch (err) {
      setError(err.message);
    }
  }, [baseUrl, navigate]);

  // Accept Friend Request with modern toast and friend list refresh
  const acceptFriendRequest = async (requestId) => {
    setLoadingRequestId(requestId);
    try {
      const response = await fetch(`${baseUrl}/api/accept-friend-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId }),
      });
      if (response.status === 401) {
        navigate("/loginprompt", {
          state: { 
            message: "You must be logged in to accept friend requests.", 
            redirectTo: "/notify" 
          },
        });
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept friend request");
      }
      // Update notifications locally: mark friend request as read
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.friend_request_id === requestId ? { ...notif, read: true } : notif
        )
      );
      
      // Display modern toast notification
      setToast("Friend request accepted!");
      
      // Dispatch a custom event to trigger friend list refresh in other components
      window.dispatchEvent(new Event("friendListUpdated"));
    } catch (err) {
      setToast(err.message || "An error occurred.");
    } finally {
      setLoadingRequestId(null);
      // Clear toast after 3 seconds
      setTimeout(() => setToast(""), 3000);
    }
  };

  // Mark All as Read (do not delete notifications)
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/mark-all-read`, {
        method: "POST",
        credentials: "include",
      });
      if (response.status === 401) {
        navigate("/loginprompt", {
          state: { 
            message: "You must be logged in to mark notifications as read.", 
            redirectTo: "/notify" 
          },
        });
        return;
      }
      if (!response.ok) throw new Error("Failed to mark notifications as read");

      // Update all notifications to read
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-4 bg-gray-900 space-y-4 h-screen flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-white">
          Notifications{" "}
          {notifications.length > 0 && (
            <span className="ml-2 bg-red-600 text-white px-2 py-1 rounded-full text-sm">
              {notifications.length}
            </span>
          )}
        </h2>

        {notifications.length > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center bg-blue-600 hover:bg-blue-800 text-white px-3 py-1 rounded-lg"
          >
            <FaCheckCircle className="mr-2" />
            Mark All as Read
          </button>
        )}
      </div>

      <div className="overflow-y-auto space-y-4 flex-1 max-h-[80vh] scrollbar-thin scrollbar-thumb-gray-700">
        {notifications.length === 0 ? (
          <p className="text-gray-400">No new notifications</p>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`w-full max-w-3xl mx-auto border border-gray-300 rounded-lg p-4 shadow-lg flex items-center justify-between transition-colors ${
                notif.read ? "bg-gray-700" : "bg-gray-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={
                    notif.originator_profile_pic.startsWith("http")
                      ? notif.originator_profile_pic
                      : `${baseUrl}static/${notif.originator_profile_pic}`
                  }
                  alt={notif.originator_name || "Unknown User"}
                  className="w-10 h-10 rounded-full object-cover cursor-pointer"
                  onClick={() => navigate(`/profile/${notif.originator_id}`)}
                />
                <p className="text-white">
                  {notif.type === "friend_accept"
                    ? notif.message
                    : `Friend request from ${
                        notif.originator_name || "Unknown User"
                      }`}
                </p>
              </div>

              {notif.type === "friend_request" && notif.friend_request_id && (
                <button
                  onClick={() => acceptFriendRequest(notif.friend_request_id)}
                  disabled={loadingRequestId === notif.friend_request_id}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                    loadingRequestId === notif.friend_request_id
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-700"
                  } text-white transition-all`}
                >
                  {loadingRequestId === notif.friend_request_id ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <FaUserCheck size={20} />
                      <span>Accept</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modern Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Notify;
