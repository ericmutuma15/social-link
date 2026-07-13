import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { initializeApp } from "firebase/app";
import "./App.css";
import { Toaster } from "react-hot-toast";

// Pages
import StartPage from "./pages/home/StartPage";
import LoadingPage from "./pages/home/LoadingPage";
import Profile from "./pages/home/Profile";
import Card from "./pages/home/card";
import FeedsPage from "./pages/home/FeedsPage";
import CreatePost from "./pages/home/CreatePost";
import SideBar from "./pages/home/sidebar";
import RightSidebar from "./pages/home/RightSidebar";
import EditProfile from "./pages/home/EditProfile";
import Notify from "./pages/home/notify";
import Friends from "./pages/home/FriendsList";
import Chat from "./pages/home/Chat";
import Messages from "./pages/home/Messages";
import LoginPrompt from './pages/home/LoginPrompt'
import Subscription from "./pages/home/Subscription";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCAlIUfXGNCdDGDfVS9Sjxexxq6GScRkdc",
  authDomain: "projx-8adc8.firebaseapp.com",
  projectId: "projx-8adc8",
  storageBucket: "projx-8adc8.appspot.com",
  messagingSenderId: "779196128624",
  appId: "1:779196128624:web:637cc73c4e8ff2777843b5",
  measurementId: "G-QL43M84DR6",
};

initializeApp(firebaseConfig);

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // New state for loading
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    // Ensure that cookies are sent with the request by adding credentials: 'include'
    fetch(`${baseUrl}/api/current_user`, {
      method: "GET", // Assuming this is a GET request to fetch current user
      credentials: "include", // This ensures cookies are sent with the request
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`Failed to fetch current user (${res.status}): ${text}`);
        }
        return res.json();
      })
      .then((data) => setCurrentUser(data))
      .catch((err) => console.error("Failed to fetch current user:", err))
      .finally(() => setLoading(false)); // Stop loading after fetch
  }, []);

  if (loading) {
    return <LoadingPage />; // Render custom loading page
  }

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <div className="bg-gray-900 h-screen w-full flex flex-col">
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home currentUser={currentUser} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />{" "}
          {/* Dynamic profile view */}
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/add-users" element={<Card />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/notifications" element={<Notify />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/chat/:userId" element={<Chat />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/loginprompt" element={<LoginPrompt />}/>
          <Route path="/subscriptions" element={<Subscription />} />
        </Routes>
      </div>
    </Router>
  );
};

const SignUp = () => {
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        const responseData = await response.json();
        setSuccessMessage(responseData.message);
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.message || `Registration failed (${response.status})`);
      }
    } catch (error) {
      console.error("Error during sign up:", error);
    }
  };

  const handleSignInRedirect = () => {
    navigate("/login");
  };

  useEffect(() => {
    if (successMessage) {
      setTimeout(() => {
        navigate("/login");
      }, 5000); // Redirect after 5 seconds
    }
  }, [successMessage, navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      {successMessage ? (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-center w-full sm:w-96">
          <h1 className="text-xl font-bold text-white mb-4">
            {successMessage}
          </h1>
          <button
            onClick={handleSignInRedirect}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-900 transition duration-300"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 p-8 rounded-lg shadow-xl w-full sm:w-96"
        >
          <h1 className="text-2xl font-bold text-center text-gray-500 mb-6">
            Sign Up
          </h1>
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full mb-3 p-3 border border-gray-500 rounded-md text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full mb-3 p-3 border border-gray-500 rounded-md text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full mb-3 p-3 border border-gray-500 rounded-md text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full mb-3 p-3 border border-gray-500 rounded-md text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-900 transition duration-300"
          >
            Sign Up
          </button>
          <div className="mt-4 text-center text-gray-500">
            <p>
              Already a member?{" "}
              <button
                type="button"
                onClick={handleSignInRedirect}
                className="text-blue-500 hover:underline"
              >
                Sign in here
              </button>
            </p>
          </div>
        </form>
      )}
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { email, password } = formData;

    try {
      const response = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 🔥 Allow cookies
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        showLoginSuccessAlert();
        navigate("/home");
      } else {
        const errorData = await response.json().catch(() => null);
        console.error("Login failed:", response.status, errorData);
        alert(errorData?.message || "Login failed!");
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const showLoginSuccessAlert = () => {
    const alertBox = document.getElementById("login-alert");
    alertBox.style.display = "block"; // Show the alert

    // Hide the alert after 3 seconds
    setTimeout(() => {
      alertBox.style.display = "none";
    }, 3000);
  };

  const handleGoogleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // Verify with backend
      const response = await fetch(`${baseUrl}/api/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
        credentials: "include", // 🔥 Allow cookies
      });

      if (response.ok) {
        navigate("/home");
      } else {
        alert("Google login failed or email not registered.");
      }
    } catch (error) {
      console.error("Google login error:", error);
    }
  };

  const handleSignUpRedirect = () => {
    navigate("/signup");
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      {/* Modern Success Alert */}
      <div
        id="login-alert"
        className="fixed top-0 left-0 right-0 bg-green-500 text-white text-center p-4 hidden"
      >
        <strong>Login Successful!</strong>
      </div>

      <form
        onSubmit={handleLogin}
        className="bg-gray-900 p-8 rounded-lg shadow-xl w-full sm:w-96"
      >
        <h1 className="text-2xl font-bold text-center text-gray-500 mb-6">
          Login
        </h1>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full mb-3 p-3 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full mb-3 p-3 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition duration-300"
        >
          Login
        </button>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-red-600 text-white py-3 rounded-md mt-4 hover:bg-red-700 transition duration-300"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = `${baseUrl}/api/github-login`)}
          className="w-full bg-gray-800 text-white py-3 rounded-md mt-4 hover:bg-gray-900 transition duration-300"
        >
          Continue with GitHub
        </button>

        {/* Redirect to sign-up if user has not signed up */}
        <div className="mt-4 text-center text-gray-500">
          <p>
            Don't have an account?{" "}
            <button
              type="button"
              onClick={handleSignUpRedirect}
              className="text-blue-500 hover:underline"
            >
              Back to Sign Up
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
import { FaBars, FaSearch, FaSignOutAlt } from "react-icons/fa"; // Import icons

const Home = () => {
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [user, setUser] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null); // State for selected media
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar toggle

  // Fetch user data when the component loads
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/current_user`, {
          method: "GET",
          credentials: "include", // 🔥 Include cookies in request
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          console.error("Failed to fetch current user data");
        }
      } catch (error) {
        console.error("Error fetching current user data:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Log out logic
  const handleLogout = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/logout`, {
        method: "POST",
        credentials: "include", // Important! Ensures cookies are sent with the request
      });

      if (response.ok) {
        // Redirect user to login page
        navigate("/login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Function to handle media click and show preview
  const handleMediaClick = (mediaUrl, caption) => {
    setSelectedMedia({ mediaUrl, caption });
  };

  // Function to close the media preview
  const handleClosePreview = () => {
    setSelectedMedia(null);
  };

  // Function to toggle sidebar visibility
  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="h-screen w-full flex bg-gray-900 text-white">
      {/* Left Sidebar - Always visible on large screens */}
      <div
        className={`w-64 bg-gray-900 flex flex-col fixed top-0 left-0 h-full z-10 lg:block ${
          isSidebarOpen ? "block" : "hidden"
        }`}
      >
        <SideBar />
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col transition-all duration-300 ml-0 lg:ml-64">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-gray-900 w-full h-16 flex justify-between items-center p-2 sm:p-4 z-10">
          <div className="flex items-center space-x-4">
            {/* Sidebar Toggle Button (for small screens) */}
            <button className="lg:hidden text-white" onClick={handleToggleSidebar}>
              <FaBars size={24} />
            </button>

            {/* Search Icon (visible on small screens) */}
            <div className="flex-1 mx-4 flex justify-center lg:hidden">
              <button className="text-white">
                <FaSearch size={24} />
              </button>
            </div>

            {/* Profile Picture & User Name */}
            {user?.picture ? (
              <img src={user.picture} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-500 flex items-center justify-center text-white">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <span className="text-white text-lg">{user?.name || "User"}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 sm:px-2 sm:py-1 text-white bg-gray-700 rounded-md shadow-md hover:bg-red-600 transition duration-300"
          >
            <FaSignOutAlt size={20} />
          </button>
        </div>

        {/* Main Feeds Section */}
        <div className="flex flex-1 w-full bg-gray-900">
          {/* Feeds Page */}
          <div className="flex-1 min-h-0 w-full bg-gray-900 overflow-y-auto no-scrollbar transition-all duration-300">
  <div className="flex justify-center">
    <div className="max-w-7xl w-full">
      <FeedsPage onMediaClick={handleMediaClick} />
    </div>
  </div>
</div>


          {/* Right Sidebar (Visible on large screens) */}
          <div className="lg:w-64 hidden lg:block bg-gray-900">
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Media Preview Overlay */}
      {selectedMedia && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-20">
          <div className="relative max-w-3xl w-full bg-gray-800 p-6 rounded-lg">
            <button onClick={handleClosePreview} className="absolute top-4 right-4 text-white text-2xl">
              &times;
            </button>
            {selectedMedia.mediaUrl.endsWith(".mp4") || selectedMedia.mediaUrl.endsWith(".webm") ? (
              <video controls className="w-full rounded-lg" style={{ maxHeight: "70vh" }}>
                <source src={`${baseUrl}${selectedMedia.mediaUrl}`} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <img
                src={`${baseUrl}${selectedMedia.mediaUrl}`}
                alt="Preview"
                className="w-full rounded-lg"
                style={{ maxHeight: "70vh", objectFit: "cover" }}
              />
            )}
            <p className="text-white mt-4">{selectedMedia.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
  
};

export default App;
