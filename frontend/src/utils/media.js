export const apiMediaUrl = path => !path || /^https?:\/\//.test(path) ? path : `${import.meta.env.VITE_API_BASE_URL}${path}`;
export const isVideo = path => /\.(mp4|webm|ogg)$/i.test(path || "");
