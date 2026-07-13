import React, { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight, FaSearch, FaUpload, FaBars } from "react-icons/fa";

const RightSidebar = ({ isSuperUser }) => {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on small screens
  const [selectedFile, setSelectedFile] = useState(null);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/sidebar_images`);
      if (!response.ok) throw new Error("Failed to fetch images");

      const data = await response.json();
      setImages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  const nextImage = () => {
    setCurrentIndex((prevIndex) =>
      images.length > 0 ? (prevIndex + 1) % images.length : 0
    );
  };

  const prevImage = () => {
    setCurrentIndex((prevIndex) =>
      images.length > 0 ? (prevIndex - 1 + images.length) % images.length : 0
    );
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${baseUrl}/api/upload_sidebar_image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (response.ok) {
        alert("Image uploaded successfully!");
        fetchImages();
        setSelectedFile(null);
      } else {
        alert("Failed to upload image.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file.");
    }
  };

  return (
    <>
      {/* Mobile Sidebar Toggle Button */}
      <button
        className="fixed top-4 right-4 z-20 p-2 bg-gray-700 rounded-full text-white lg:hidden"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
      >
        <FaBars />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-gray-900 text-white flex flex-col p-4 z-10 transition-transform transform ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        } lg:static lg:translate-x-0 lg:w-64`}
      >
        {/* Close Button for Small Screens */}
        <button
          className="self-end lg:hidden p-2 bg-gray-700 rounded-full mb-4"
          onClick={() => setIsSidebarOpen(false)}
        >
          <FaChevronRight />
        </button>

        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search..."
            className="w-full p-2 bg-gray-700 text-white rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <FaSearch className="absolute top-2 right-2 text-gray-500" />
        </div>

        {/* Super User Upload Button */}
        {isSuperUser && (
          <div className="mb-4">
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center space-x-2 p-2 rounded-full bg-gray-700 cursor-pointer"
            >
              <FaUpload className="text-white" />
              <span className="text-white">Upload Image</span>
            </label>
            {selectedFile && (
              <div className="mt-2 text-white">
                <span>{selectedFile.name}</span>
                <button
                  onClick={handleFileUpload}
                  className="ml-4 p-2 bg-blue-600 rounded-full text-white"
                >
                  Upload
                </button>
              </div>
            )}
          </div>
        )}

        {/* Exclusive Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Exclusive</h2>
            <div className="flex space-x-2">
              <button
                onClick={prevImage}
                className="p-2 rounded-full hover:bg-gray-700"
                aria-label="Previous"
              >
                <FaChevronLeft className="text-white" />
              </button>
              <button
                onClick={nextImage}
                className="p-2 rounded-full hover:bg-gray-700"
                aria-label="Next"
              >
                <FaChevronRight className="text-white" />
              </button>
            </div>
          </div>

          {/* Single Image Display */}
          <div className="space-y-4">
            {images.length > 0 ? (
              <div className="flex flex-col items-center">
                <img
                  src={`${baseUrl}/static/sidebar_images/${images[currentIndex].filename}`}
                  alt={`Exclusive ${currentIndex}`}
                  className="w-full h-auto rounded-lg"
                />
                <p className="mt-2">{images[currentIndex].title || "Untitled"}</p>
              </div>
            ) : (
              <p className="text-gray-400">No images available.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RightSidebar;
