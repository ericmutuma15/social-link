import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Picker from "@emoji-mart/react"; // Just import Picker from the emoji-mart package

const CreatePost = ({ onPostCreated }) => {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null); // For previewing media
  const [error, setError] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Emoji picker visibility
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    setMedia(file);

    if (file) {
      const isVideo = file.type.startsWith("video");
      const reader = new FileReader();

      reader.onload = () => {
        setMediaPreview({
          src: reader.result,
          type: isVideo ? "video" : "image",
        });
      };

      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null); // Clear preview if no file is selected
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("content", content);
    if (media) {
      formData.append("media", media);
    }

    try {
      const response = await fetch(`${baseUrl}/api/posts`, {
        method: "POST",

       // headers: { "Content-Type": "application/json" },
        credentials: "include",

        body: formData,
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const result = await response.json();
      setContent("");
      setMedia(null);
      setMediaPreview(null); // Clear the preview after successful submission
      if (onPostCreated) {
        onPostCreated(result);
      }
      navigate("/home"); // Redirect to the home page
    } catch (error) {
      setError("Error creating post: " + error.message);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setContent(content + emoji.native); // Append the selected emoji to the content
    setShowEmojiPicker(false); // Hide the emoji picker after selection
  };

  return (
    <div className="min-h-screen bg-gray-900 flex justify-center items-start py-8 overflow-y-auto">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl text-white font-semibold mb-4 text-center">
          Create a Post
        </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handlePostSubmit} className="flex flex-col space-y-4">
          <div className="relative">
            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="text-gray-400 hover:text-white absolute top-1/2 left-2 transform -translate-y-1/2"
            >
              😊
            </button>
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-50">
                <Picker onEmojiSelect={handleEmojiSelect} />
              </div>
            )}
            {/* Content Textarea */}
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="What's on your mind?"
              className="w-full p-3 pl-10 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          {/* Media Upload */}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />

          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative">
              {mediaPreview.type === "image" ? (
                <img
                  src={mediaPreview.src}
                  alt="Preview"
                  className="w-full h-auto rounded-md border border-gray-600 mb-2"
                />
              ) : (
                <video
                  src={mediaPreview.src}
                  controls
                  className="w-full h-auto rounded-md border border-gray-600 mb-2"
                ></video>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
