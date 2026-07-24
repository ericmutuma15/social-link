import axios from "axios";

const readCookie = (name) => document.cookie.split("; ").find((item) => item.startsWith(`${name}=`))?.split("=")[1];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: "csrf_access_token",
  xsrfHeaderName: "X-CSRF-TOKEN",
});

// A short-lived access cookie is renewed once, transparently, without
// exposing either token to JavaScript.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (error.response?.status !== 401 || request?._retried || request?.url === "/api/refresh") {
      return Promise.reject(error);
    }
    request._retried = true;
    try {
      await api.post("/api/refresh");
      return api(request);
    } catch {
      return Promise.reject(error);
    }
  },
);

api.interceptors.request.use((config) => {
  if (["post", "put", "patch", "delete"].includes(config.method?.toLowerCase())) {
    const csrfCookie = config.url === "/api/refresh" ? "csrf_refresh_token" : "csrf_access_token";
    const token = readCookie(csrfCookie);
    if (token) config.headers["X-CSRF-TOKEN"] = decodeURIComponent(token);
  }
  return config;
});

export default api;
