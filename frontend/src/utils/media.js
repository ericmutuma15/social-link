const configuredApiUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const apiMediaUrl = (path) => {
  if (!path || /^(https?:|blob:|data:)/i.test(path)) return path;
  return `${configuredApiUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

export const mediaKind = (path = "", mime = "") => {
  const value = `${mime} ${path}`.toLowerCase();
  if (/video\/|\.(mp4|mov|webm)(?:[?#]|$)/.test(value)) return "video";
  if (/audio\/|\.(mp3|m4a|ogg|wav)(?:[?#]|$)/.test(value)) return "audio";
  if (/\.(pdf)(?:[?#]|$)/.test(value)) return "document";
  return "image";
};
