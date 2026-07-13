import React, { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Subscription = () => {
  const [activeTab, setActiveTab] = useState("friends");
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const FriendsList = () => {
    const [friends, setFriends] = useState([]);
    const [loadingFriends, setLoadingFriends] = useState(true);

    const fetchFriends = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/friends`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch friends");
        const data = await response.json();
        setFriends(data);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoadingFriends(false);
      }
    };

    useEffect(() => {
      fetchFriends();
      const handleUpdate = () => {
        setLoadingFriends(true);
        fetchFriends();
      };
      window.addEventListener("friendListUpdated", handleUpdate);
      return () => {
        window.removeEventListener("friendListUpdated", handleUpdate);
      };
    }, [baseUrl]);

    return (
      <div className="flex flex-col items-center w-full max-w-md max-h-[70vh] overflow-y-auto space-y-4 pr-2 no-scrollbar">
        {loadingFriends ? (
          <p className="text-gray-400">Loading friends…</p>
        ) : friends.length > 0 ? (
          friends.map((friend) => (
            <div
              key={friend.id}
              onClick={() => navigate(`/profile/${friend.id}`)}
              className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg w-full cursor-pointer hover:bg-gray-700 transition"
            >
              <img
                src={friend.profile_pic}
                alt={friend.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <p className="text-white font-semibold">{friend.name}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No friends found.</p>
        )}
      </div>
    );
  };

  const SubscriptionContent = () => {
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loadingImages, setLoadingImages] = useState(true);
  
    const scrollRef = React.useRef();
  
    useEffect(() => {
      const fetchImages = async () => {
        try {
          const response = await fetch(`${baseUrl}/api/sidebar_images`);
          if (!response.ok) throw new Error("Failed to fetch images");
          const data = await response.json();
          setImages(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Error fetching images:", error);
        } finally {
          setLoadingImages(false);
        }
      };
      fetchImages();
    }, [baseUrl]);
  
    const scrollToImage = (index) => {
      const container = scrollRef.current;
      if (container && container.children[index]) {
        container.children[index].scrollIntoView({ behavior: "smooth", inline: "center" });
        setCurrentIndex(index);
      }
    };
  
    const nextImage = () => {
      const newIndex = (currentIndex + 1) % images.length;
      scrollToImage(newIndex);
    };
  
    const prevImage = () => {
      const newIndex = (currentIndex - 1 + images.length) % images.length;
      scrollToImage(newIndex);
    };
  
    return (
      <div className="relative w-full h-full">
        {/* Arrows */}
        <button
          onClick={prevImage}
          className="fixed left-4 top-1/2 transform -translate-y-1/2 p-3 bg-gray-800 rounded-full hover:bg-gray-700 z-10"
          aria-label="Previous"
        >
          <FaChevronLeft className="text-white text-2xl" />
        </button>
        <button
          onClick={nextImage}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 p-3 bg-gray-800 rounded-full hover:bg-gray-700 z-10"
          aria-label="Next"
        >
          <FaChevronRight className="text-white text-2xl" />
        </button>
  
        {loadingImages ? (
          <p className="text-gray-400 text-center">Loading subscriptions…</p>
        ) : images.length > 0 ? (
          <div
            ref={scrollRef}
            className="flex overflow-x-auto no-scrollbar space-x-6 py-8 px-4 h-[70vh] items-center snap-x snap-mandatory"
          >
            {images.map((img, index) => (
              <div
                key={index}
                onClick={() => scrollToImage(index)}
                className={`min-w-[300px] max-w-[400px] flex-shrink-0 snap-center flex flex-col items-center cursor-pointer ${
                  currentIndex === index ? "scale-110" : "scale-100"
                } transition-transform duration-500 ease-in-out`}
              >
                <img
                  src={`${baseUrl}/static/sidebar_images/${img.filename}`}
                  alt={img.title || `Image ${index}`}
                  className={`w-full h-auto rounded-lg transition-all duration-500 ease-in-out ${
                    currentIndex === index ? "transform scale-110" : "transform scale-100"
                  }`}
                />
                <p className="mt-2 text-white text-center">
                  {img.title || "Untitled"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center">No subscriptions available.</p>
        )}
      </div>
    );
  };
  

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col">
      {/* Header with Tabs */}
      <div className="flex justify-center border-b border-gray-700 mb-4">
        <button
          onClick={() => handleTabClick("friends")}
          className={`px-4 py-2 font-semibold text-lg transition-colors ${
            activeTab === "friends"
              ? "text-blue-500 border-b-2 border-blue-500"
              : "text-gray-400"
          }`}
        >
          Your Friends
        </button>
        <button
          onClick={() => handleTabClick("subscriptions")}
          className={`px-4 py-2 font-semibold text-lg transition-colors ${
            activeTab === "subscriptions"
              ? "text-blue-500 border-b-2 border-blue-500"
              : "text-gray-400"
          }`}
        >
          Subscriptions
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex justify-center items-center overflow-hidden">
        {activeTab === "friends" ? <FriendsList /> : <SubscriptionContent />}
      </div>
    </div>
  );
};

export default Subscription;
