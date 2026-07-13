import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const EditProfile = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [picture, setPicture] = useState(null);
  const [preview, setPreview] = useState("/default-profile.png");
  const [alert, setAlert] = useState({ message: "", type: "" });
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // Fetch current user details from the API
  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/current_user`, {
        method: "GET",
        credentials: "include", // Include cookies in the request
      });

      if (response.ok) {
        const data = await response.json();
        setName(data.name);
        setDescription(data.description);
        setLocation(data.location);
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

  // Handle file change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPicture(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Fetch location suggestions from Nominatim API
  const handleLocationSearch = async (e) => {
    const query = e.target.value;
    setLocation(query);

    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1`
      );
      const data = await response.json();
      setLocationSuggestions(data);
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
    }
  };

  // Handle selection of a location suggestion
  const handleLocationSelect = (selectedLocation) => {
    setLocation(selectedLocation.display_name);
    setLocationSuggestions([]);
  };

  // Handle form submission
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
        credentials: "include", // Include cookies in the request
        body: formData,
      });

      if (response.ok) {
        setAlert({ message: "Profile updated successfully!", type: "success" });
        navigate("/profile");
      } else {
        setAlert({ message: "Error updating profile", type: "error" });
      }
    } catch (error) {
      console.error("Error submitting profile:", error);
      setAlert({ message: "Something went wrong, please try again.", type: "error" });
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white p-6">
      <div className="w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-lg">
        {/* Alert */}
        {alert.message && (
          <div
            className={`mb-4 p-3 rounded ${alert.type === "success" ? "bg-green-600" : "bg-red-600"}`}
          >
            <p>{alert.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <img
              src={preview}
              alt="Profile Preview"
              className="w-24 h-24 rounded-full object-cover mx-auto"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded"
            ></textarea>
          </div>

          <div>
            <label className="block text-gray-300 font-semibold">Location</label>
            <input
              type="text"
              value={location}
              onChange={handleLocationSearch}
              className="w-full p-3 bg-gray-700 text-white rounded"
              placeholder="Search for location"
            />
            {locationSuggestions.length > 0 && (
              <ul className="bg-gray-700 text-white mt-2 p-2 rounded shadow-lg max-h-40 overflow-y-auto">
                {locationSuggestions.map((location, index) => (
                  <li
                    key={index}
                    className="p-2 cursor-pointer hover:bg-gray-600"
                    onClick={() => handleLocationSelect(location)}
                  >
                    {location.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-gray-300 font-semibold">Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full p-3 bg-gray-700 text-white rounded"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-500 text-white py-2 px-4 rounded w-full"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
