import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Picker from "@emoji-mart/react"; // Just import Picker from the emoji-mart package
import data from "@emoji-mart/data";
import api from "../../services/apiClient";

const CreatePost = ({ onPostCreated }) => {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null); // For previewing media
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Emoji picker visibility
  const pickerRef = useRef(null);
  const navigate = useNavigate();

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    setMedia(file);

    if (file) {
      const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : file.type === "application/pdf" ? "document" : "image";
      const reader = new FileReader();

      reader.onload = () => {
        setMediaPreview({
          src: reader.result,
          type,
        });
      };

      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null); // Clear preview if no file is selected
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const formData = new FormData();
    formData.append("content", content);
    if (media) {
      formData.append("media", media);
    }

    try {
      setSubmitting(true);
      const response = await api.post("/api/posts", formData);
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Unable to publish post.");
      }
      const result = response.data.data || response.data;
      setContent("");
      setMedia(null);
      setMediaPreview(null); // Clear the preview after successful submission
      if (onPostCreated) {
        onPostCreated(result);
      }
      navigate("/home"); // Redirect to the home page
    } catch (error) {
      setError(
        "Error creating post: " +
          (error.response?.data?.message || error.message || "Unable to publish post.")
      );
    } finally { setSubmitting(false); }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emoji) => {
    setContent((current) => current + (emoji.native || emoji.colons || ""));
    setShowEmojiPicker(false); // Hide the emoji picker after selection
  };

  return (
    <section className="workspace-page create-post-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">POSTS</p>
          <h1>Create a Post</h1>
          <p className="muted">Share an update, image, or video with your circle.</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pb-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="surface-card rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-xl shadow-slate-900/10 dark:border-slate-800/80 dark:bg-slate-950/80"
        >
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">Create a Post</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <form onSubmit={handlePostSubmit} className="flex flex-col space-y-4">
            <div className="emoji-anchor relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                aria-label="Open emoji picker"
                className="absolute left-3 top-3 h-10 w-10 rounded-2xl border border-slate-200/70 bg-slate-100/90 text-lg text-slate-600 transition hover:bg-slate-200 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200"
              >
                😊
              </button>
              {showEmojiPicker && (
                <div ref={pickerRef} className="emoji-picker">
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="dark"
                    previewPosition="none"
                    emojiButtonSize={24}
                    skinTonePosition="none"
                  />
                </div>
              )}
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="What's on your mind?"
                className="w-full rounded-3xl border border-slate-200/70 bg-slate-50/90 py-4 pl-16 pr-4 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-800/80 dark:bg-slate-950/80 dark:text-slate-100"
              ></textarea>
            </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Media</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/avif,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/ogg,audio/wav,application/pdf"
              onChange={handleMediaChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
            />
          </div>

          {mediaPreview && (
            <div className="relative rounded-3xl border border-slate-200/70 bg-slate-50/90 p-3 dark:border-slate-800/80 dark:bg-slate-950/80">
              {mediaPreview.type === "image" ? (
                <img
                  src={mediaPreview.src}
                  alt="Preview"
                  className="w-full h-auto rounded-2xl border border-slate-200/70 object-cover dark:border-slate-800/80"
                />
              ) : mediaPreview.type === "video" ? (
                <video
                  src={mediaPreview.src}
                  controls
                  className="w-full h-auto rounded-2xl border border-slate-200/70 object-cover dark:border-slate-800/80"
                ></video>
              ) : mediaPreview.type === "audio" ? <audio controls src={mediaPreview.src} /> : <a href={mediaPreview.src} target="_blank" rel="noreferrer">Preview document</a>}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-white font-semibold shadow-lg shadow-cyan-500/15 transition hover:opacity-95"
          >
            {submitting ? "Publishing…" : "Post"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  </section>
  );
};

export default CreatePost;
