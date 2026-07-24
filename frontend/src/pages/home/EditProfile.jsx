import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
  FaArrowLeft,
  FaCamera,
  FaMapMarkerAlt,
  FaUser,
  FaSave,
  FaImage,
} from "react-icons/fa";

import { useTheme } from "../../context/ThemeContext";

const EditProfile = () => {
  const navigate = useNavigate();

  const { theme } = useTheme();

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [location, setLocation] = useState("");

  const [picture, setPicture] = useState(null);

  const [preview, setPreview] = useState("/default-profile.png");

  const [alert, setAlert] = useState({
    message: "",
    type: "",
  });

  const [locationSuggestions, setLocationSuggestions] = useState([]);

  const pageClass =
    theme === "dark"
      ? "bg-[#070b14] text-slate-100"
      : "bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_45%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_100%)] text-slate-900";

  const cardClass =
    theme === "dark"
      ? "bg-slate-900/70 border border-slate-800/80 shadow-[0_20px_60px_-25px_rgba(8,15,30,0.8)]"
      : "bg-white/80 border border-slate-200/70 shadow-[0_18px_45px_-22px_rgba(15,23,42,0.35)] backdrop-blur";

  const inputClass =
    theme === "dark"
      ? "bg-slate-900/70 border-slate-700 text-white placeholder:text-slate-500"
      : "bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400";

  const secondaryText = theme === "dark" ? "text-slate-400" : "text-slate-500";
  // Fetch current user details from the API
  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/current_user`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        setName(data.name || "");
        setDescription(data.description || "");
        setLocation(data.location || "");

        setPreview(data.picture || "/default-profile.png");
      } else {
        console.error("Failed to fetch user details");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  // Handle image selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setPicture(file);

      setPreview(URL.createObjectURL(file));
    }
  };

  // Location search using OpenStreetMap Nominatim
  const handleLocationSearch = async (e) => {
    const query = e.target.value;

    setLocation(query);

    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "social-app/1.0",
          },
        },
      );

      if (!response.ok) {
        setLocationSuggestions([]);
        return;
      }

      const data = await response.json();
      setLocationSuggestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocationSuggestions([]);
    }
  };

  // Select location suggestion
  const handleLocationSelect = (selectedLocation) => {
    setLocation(selectedLocation.display_name);

    setLocationSuggestions([]);
  };

  // Submit profile update
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      const trimmedLocation = location.trim();

      if (trimmedName) formData.append("name", trimmedName);
      if (trimmedDescription) formData.append("description", trimmedDescription);
      if (trimmedLocation) formData.append("location", trimmedLocation);
      if (picture) formData.append("picture", picture);

      const response = await fetch(`${baseUrl}/api/profile`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        setAlert({
          message: payload.message || "Profile updated successfully!",
          type: "success",
        });

        setTimeout(() => {
          navigate("/profile");
        }, 800);
      } else {
        setAlert({
          message: payload.error || payload.message || "Error updating profile",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error submitting profile:", error);

      setAlert({
        message: "Something went wrong, please try again.",

        type: "error",
      });
    }
  };
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
        duration: 0.5,
      }}
      className={`min-h-screen ${pageClass} transition-colors duration-300 px-4 py-6 sm:px-6 lg:px-8`}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Back Button */}

        <button
          onClick={() => navigate("/profile")}
          className={`flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${theme === "dark" ? "border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100"}`}
        >
          <FaArrowLeft />

          <span>Back to Profile</span>
        </button>

        {/* Main Card */}

        <motion.div
          initial={{
            scale: 0.96,
            opacity: 0,
          }}
          animate={{
            scale: 1,
            opacity: 1,
          }}
          transition={{
            delay: 0.1,
          }}
          className={`overflow-hidden rounded-[28px] border backdrop-blur-xl ${cardClass}`}
        >
          {/* Header */}

          <div
            className="border-b border-slate-200/70 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 px-6 py-8 text-center dark:border-slate-800"
          >
            <div className="relative mx-auto mb-4 h-32 w-32">
              <img
                src={preview}
                alt="Profile Preview"
                className="h-full w-full rounded-full border-4 border-cyan-500/40 object-cover shadow-lg shadow-cyan-500/10"
              />

              {/* Camera Badge */}

              <label
                className="absolute bottom-1 right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-600"
              >
                <FaCamera
                  className="
                    text-white
                  "
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="
                    hidden
                  "
                />
              </label>
            </div>

            <h1 className="text-2xl font-semibold sm:text-3xl">
              Edit Profile
            </h1>

            <p
              className={`
                mt-2
                text-sm
                ${secondaryText}
              `}
            >
              Update your personal information and customize your profile
            </p>
          </div>

          {/* Alert */}

          {alert.message && (
            <motion.div
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className={`
                mb-6
                p-3
                rounded-xl
                text-sm
                text-center
                ${
                  alert.type === "success"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }
              `}
            >
              {alert.message}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-8 sm:px-8">
            {/* Name Field */}

            <div>
              <label
                className="
          flex
          items-center
          gap-2
          mb-2
          font-semibold
          text-sm
        "
              >
                <FaUser className="text-cyan-500" />
                Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className={`w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 ${inputClass}`}
              />
            </div>

            {/* Description Field */}

            <div>
              <label
                className="
          flex
          items-center
          gap-2
          mb-2
          font-semibold
          text-sm
        "
              >
                <FaImage
                  className="
            text-cyan-500
          "
                />
                Bio / Description
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="5"
                placeholder="
            Tell people something about yourself...
          "
                className={`w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 resize-none outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 ${inputClass}`}
              />

              <p
                className={`
          text-xs
          mt-2
          ${secondaryText}
        `}
              >
                Share something interesting about you.
              </p>
            </div>

            {/* Location Field */}

            <div>
              <label
                className="
          flex
          items-center
          gap-2
          mb-2
          font-semibold
          text-sm
        "
              >
                <FaMapMarkerAlt
                  className="
              text-cyan-500
            "
                />
                Location
              </label>

              <div
                className="
          relative
        "
              >
                <input
                  type="text"
                  value={location}
                  onChange={handleLocationSearch}
                  placeholder="
              Search your location
            "
                  className={`w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 ${inputClass}`}
                />

                {/* Location Suggestions */}

                {locationSuggestions.length > 0 && (
                  <motion.ul
                    initial={{
                      opacity: 0,
                      y: -10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className={`
                absolute
                z-20
                w-full
                mt-2
                rounded-2xl
                overflow-hidden
                shadow-xl
                border

                ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-slate-200"
                }

              `}
                  >
                    {locationSuggestions.slice(0, 5).map((item) => (
                      <li
                        key={item.place_id || item.display_name}
                        className={`
                      text-sm
                    `}
                      >
                        <button
                          type="button"
                          onClick={() => handleLocationSelect(item)}
                          className={`flex w-full items-start gap-3 p-4 text-left transition ${theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
                        >
                          <FaMapMarkerAlt className="mt-1 flex-shrink-0 text-cyan-500" />
                          <span>{item.display_name}</span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </div>
            </div>

            {/* Save Button */}

            <motion.button
              whileTap={{
                scale: 0.97,
              }}
              whileHover={{
                scale: 1.02,
              }}
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-95"
            >
              <FaSave />
              Save Changes
            </motion.button>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EditProfile;
