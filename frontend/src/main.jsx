import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Normalize relative image `src` attributes to absolute URLs using VITE_API_BASE_URL.
// This helps in production when backend returns filename-only paths.
(() => {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  if (!base) return;
  const normalize = (img) => {
    try {
      if (!img || !img.getAttribute) return;
      const src = img.getAttribute('src');
      if (!src) return;
      if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('/')) return;
      img.src = `${base}/${src.replace(/^\//, '')}`;
    } catch (e) {
      // ignore
    }
  };
  document.querySelectorAll('img').forEach(normalize);
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes || []) {
        if (node.nodeType === 1) {
          if (node.tagName === 'IMG') normalize(node);
          node.querySelectorAll && node.querySelectorAll('img').forEach(normalize);
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
