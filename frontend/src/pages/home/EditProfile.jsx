import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
  FaCamera,
  FaMapMarkerAlt,
  FaUser,
  FaSave,
  FaImage,
} from "react-icons/fa";
import { HiOutlineBriefcase, HiOutlineOfficeBuilding, HiOutlinePhotograph } from "react-icons/hi";

import { useTheme } from "../../context/ThemeContext";
import BackButton from "../../components/BackButton";
import api from "../../services/apiClient";

const EditProfile = () => {
  const navigate = useNavigate();

  const { theme } = useTheme();

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [location, setLocation] = useState("");

  const [picture, setPicture] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [occupation, setOccupation] = useState("");
  const [company, setCompany] = useState("");
  const [timezoneValue, setTimezoneValue] = useState("");
  const [languageValue, setLanguageValue] = useState("");
  const [themePreference, setThemePreference] = useState("");
  const [socialLinksText, setSocialLinksText] = useState("");

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
      const response = await api.get("/api/current_user");
      const data = response.data || response;

      setName(data.name || "");
      setDescription(data.description || "");
      setLocation(data.location || "");

      setPreview(data.picture || "/default-profile.png");
      setCoverPreview(data.cover_photo || null);
      setUsername(data.username || "");
      setPhoneNumber(data.phone_number || "");
      setWebsite(data.website || "");
      setOccupation(data.occupation || "");
      setCompany(data.company || "");
      setTimezoneValue(data.timezone || "UTC");
      setLanguageValue(data.language || "en");
      setThemePreference(data.theme_preference || "system");
      setSocialLinksText(data.social_links ? JSON.stringify(data.social_links) : "");
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

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverPhoto(file);
      setCoverPreview(URL.createObjectURL(file));
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
      if (coverPhoto) formData.append("cover_photo", coverPhoto);
      if (username) formData.append("username", username.trim());
      if (phoneNumber) formData.append("phone_number", phoneNumber.trim());
      if (website) formData.append("website", website.trim());
      if (occupation) formData.append("occupation", occupation.trim());
      if (company) formData.append("company", company.trim());
      if (timezoneValue) formData.append("timezone", timezoneValue);
      if (languageValue) formData.append("language", languageValue);
      if (themePreference) formData.append("theme_preference", themePreference);
      if (socialLinksText) formData.append("social_links", socialLinksText);

      const response = await api.post("/api/profile", formData);
      const payload = response.data || {};

      setAlert({
        message: payload.message || "Profile updated successfully!",
        type: "success",
      });

      setTimeout(() => {
        navigate("/profile");
      }, 800);
    } catch (error) {
      console.error("Error submitting profile:", error);

      setAlert({
        message: "Something went wrong, please try again.",

        type: "error",
      });
    }
  };
  return (
    <section className={`workspace-page edit-profile-page ${pageClass}`}>
      <header className="page-heading">
        <div>
          <p className="eyebrow">PROFILE</p>
          <h1>Edit profile</h1>
          <p className="muted">Update your personal information and customize your profile</p>
        </div>
        <BackButton fallback="/profile" label="Back to Profile" />
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

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
          className={`overflow-hidden rounded-[28px] border backdrop-blur-xl ${cardClass} surface-card`}
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

            {/* Username */}

            <div>
              <label className="flex items-center gap-2 mb-2 font-semibold text-sm">
                <FaUser className="text-cyan-500" />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className={`w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 ${inputClass}`}
              />
            </div>

            {/* Contact & Work */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 mb-2 font-semibold text-sm"><FaImage className="text-cyan-500" /> Phone</label>
                <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone number" className={`w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 ${inputClass}`} />
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2 font-semibold text-sm"><FaImage className="text-cyan-500" /> Website</label>
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://your-site.example" className={`w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 ${inputClass}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 mb-2 font-semibold text-sm"><HiOutlineBriefcase className="text-cyan-500" /> Occupation</label>
                <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Your role or title" className={`w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 ${inputClass}`} />
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2 font-semibold text-sm"><HiOutlineOfficeBuilding className="text-cyan-500" /> Company</label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className={`w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 ${inputClass}`} />
              </div>
            </div>

            {/* Cover photo upload */}
            <div>
              <label className="flex items-center gap-2 mb-2 font-semibold text-sm"><HiOutlinePhotograph className="text-cyan-500" /> Cover photo</label>
              <div className="mb-2">
                {coverPreview ? <img src={coverPreview} alt="Cover preview" className="w-full rounded-lg object-cover h-40" /> : <div className="w-full rounded-lg bg-slate-100 h-40 flex items-center justify-center text-sm text-slate-500">No cover photo</div>}
              </div>
              <input type="file" accept="image/*" onChange={handleCoverChange} />
            </div>

            {/* Social links (JSON) */}
            <div>
              <label className="flex items-center gap-2 mb-2 font-semibold text-sm"><FaImage className="text-cyan-500" /> Social links (JSON)</label>
              <textarea value={socialLinksText} onChange={(e) => setSocialLinksText(e.target.value)} rows={3} placeholder='{"twitter":"https://twitter.com/you","linkedin":"https://..."}' className={`w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 resize-none ${inputClass}`} />
              <p className={`text-xs mt-2 ${secondaryText}`}>Provide social links as JSON object (optional).</p>
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
    </section>
  );
};

export default EditProfile;
