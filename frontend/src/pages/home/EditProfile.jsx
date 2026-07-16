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
      ? "bg-[#0b1120] text-white"
      : "bg-slate-100 text-slate-900";

  const cardClass =
    theme === "dark"
      ? "bg-slate-900/70 border border-slate-800"
      : "bg-white border border-slate-200 shadow-sm";

  const inputClass =
    theme === "dark"
      ? `
        bg-slate-800
        border-slate-700
        text-white
        placeholder:text-slate-500
      `
      : `
        bg-white
        border-slate-300
        text-slate-900
        placeholder:text-slate-400
      `;

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
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1`,
      );

      const data = await response.json();

      setLocationSuggestions(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
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

      if (name) formData.append("name", name);

      if (description) formData.append("description", description);

      if (location) formData.append("location", location);

      if (picture) formData.append("picture", picture);

      const response = await fetch(`${baseUrl}/api/profile`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        setAlert({
          message: "Profile updated successfully!",
          type: "success",
        });

        setTimeout(() => {
          navigate("/profile");
        }, 800);
      } else {
        setAlert({
          message: "Error updating profile",

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
      className={`
        min-h-screen
        ${pageClass}
        flex
        items-center
        justify-center
        p-4
        sm:p-6
      `}
    >
      <div
        className="
        w-full
        max-w-xl
      "
      >
        {/* Back Button */}

        <button
          onClick={() => navigate("/profile")}
          className={`
            mb-5
            flex
            items-center
            gap-2
            px-4
            py-2
            rounded-full
            transition
            ${
              theme === "dark"
                ? "bg-slate-800 hover:bg-slate-700 text-white"
                : "bg-white hover:bg-slate-100 text-slate-700 shadow"
            }
          `}
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
          className={`
            rounded-3xl
            backdrop-blur-xl
            p-6
            sm:p-8
            ${cardClass}
          `}
        >
          {/* Header */}

          <div
            className="
            text-center
            mb-8
          "
          >
            <div
              className="
              relative
              w-32
              h-32
              mx-auto
              mb-4
            "
            >
              <img
                src={preview}
                alt="Profile Preview"
                className="
                  w-full
                  h-full
                  rounded-full
                  object-cover
                  border-4
                  border-cyan-500/40
                "
              />

              {/* Camera Badge */}

              <label
                className="
                  absolute
                  bottom-1
                  right-1
                  bg-cyan-500
                  hover:bg-cyan-600
                  w-10
                  h-10
                  rounded-full
                  flex
                  items-center
                  justify-center
                  cursor-pointer
                  shadow-lg
                  transition
                "
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

            <h1
              className="
              text-2xl
              sm:text-3xl
              font-bold
            "
            >
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

          <form
            onSubmit={handleSubmit}
            className="
              space-y-6
            "
          >
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
                className={`
            w-full
            p-4
            rounded-2xl
            border
            outline-none
            transition
            focus:ring-2
            focus:ring-cyan-500
            ${inputClass}
          `}
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
                className={`
            w-full
            p-4
            rounded-2xl
            border
            resize-none
            outline-none
            transition
            focus:ring-2
            focus:ring-cyan-500
            ${inputClass}
          `}
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
                  className={`
              w-full
              p-4
              rounded-2xl
              border
              outline-none
              transition
              focus:ring-2
              focus:ring-cyan-500
              ${inputClass}
            `}
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
                    {locationSuggestions.slice(0, 5).map((item, index) => (
                      <li
                        key={index}
                        onClick={() => handleLocationSelect(item)}
                        className={`
                      p-4
                      cursor-pointer
                      text-sm
                      transition

                      ${
                        theme === "dark"
                          ? "hover:bg-slate-800"
                          : "hover:bg-slate-100"
                      }

                    `}
                      >
                        <div
                          className="
                      flex
                      items-start
                      gap-3
                    "
                        >
                          <FaMapMarkerAlt
                            className="
                          text-cyan-500
                          mt-1
                          flex-shrink-0
                        "
                          />

                          <span>{item.display_name}</span>
                        </div>
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
              className="
          w-full
          flex
          items-center
          justify-center
          gap-3
          py-4
          rounded-2xl
          bg-gradient-to-r
          from-cyan-500
          to-blue-600
          text-white
          font-semibold
          shadow-lg
          shadow-cyan-500/20
          transition
        "
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
