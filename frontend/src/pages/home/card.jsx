import React, {
  useEffect,
  useState
} from "react";

import {
  motion
} from "framer-motion";

import {
  FaUserPlus,
  FaUser,
  FaMapMarkerAlt
} from "react-icons/fa";

import {
  useNavigate
} from "react-router-dom";

import LoadingPage from "./LoadingPage";

import {
  toast
} from "react-hot-toast";

import {
  useTheme
} from "../../context/ThemeContext";

const Card = () => {

  const {
    theme
  } = useTheme();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();
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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/users`, {
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            // If user is not logged in, navigate to the login prompt.
            navigate("/loginprompt", {
              state: { message: "You must be logged in to add friends.", redirectTo: "/users" },
            });
            return;
          }
          throw new Error("Failed to fetch users");
        }

        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [baseUrl, navigate]);

  const sendFriendRequest = async (userId) => {
    try {
      const response = await fetch(`${baseUrl}/api/send-friend-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
  
      if (response.status === 401) {
        navigate("/loginprompt", {
          state: {
            message: "You must be logged in to add friends.",
            redirectTo: "/users",
          },
        });
        return;
      }
  
      const text = await response.text();
  
      if (!response.ok) {
        if (text.includes("already sent")) {
          toast("Friend request already sent", {
            icon: "⚠️",
            style: { background: "#fef3c7", color: "#92400e" },
          });
        } else {
          throw new Error("Failed to send friend request");
        }
      } else {
        toast.success("Friend request sent!");
        // Optionally trigger friends refresh
        window.dispatchEvent(new Event("friendListUpdated"));
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error(err.message);
    }
  };
  

  if (loading) return <LoadingPage />;
  if (error) return <div className="text-center text-red-500 p-4">{error}</div>;

  return (

  <motion.div

    initial={{
      opacity: 0,
      y: 15
    }}

    animate={{
      opacity: 1,
      y: 0
    }}

    transition={{
      duration: 0.35
    }}

    className={`
      min-h-screen
      ${pageClass}
      p-4
      sm:p-6
    `}

  >


    <div className="
      max-w-3xl
      mx-auto
      space-y-5
    ">
      {users.map((user) => (
        <div
          key={user.id}
          className="w-full max-w-3xl mx-auto border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg flex items-center p-4 transition-all transform hover:scale-105 hover:shadow-xl hover:bg-gray-800 duration-300 ease-in-out"
        >
          <img
            className="w-16 h-16 rounded-full object-cover mr-4"
            src={
              user.picture
                ? `${baseUrl}/static/${user.picture}`
                : "/default-profile.png"
            }
            alt="User Profile"
          />

          <div className="flex-1">
            <div className="font-bold text-lg">{user.name}</div>
            <p className="text-gray-500 text-sm">{user.description}</p>
            <p className="text-gray-400 text-xs">
              {user.location || "Location not available"}
            </p>
          </div>

          <div className="flex space-x-4">
            {/* Add Friend Button */}
            <button
              onClick={() => sendFriendRequest(user.id)}
              className="text-blue-500 hover:text-blue-700 transition-colors duration-300"
            >
              <FaUserPlus size={20} />
            </button>

            {/* View Profile Button */}
            <button
              onClick={() => navigate(`/profile/${user.id}`)}
              className="text-green-500 hover:text-green-700 transition-colors duration-300"
            >
              <FaUser size={20} />
            </button>
          </div>
        </div>
      ))}
        </div>

  </motion.div>

);
};

export default Card;
