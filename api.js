import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lore_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("lore_token");
      localStorage.removeItem("lore_user");
      const path = window.location.pathname;
      const publicPrefixes = ["/login", "/signup", "/welcome", "/legal"];
      const isPublic = path === "/" || publicPrefixes.some((p) => path.startsWith(p));
      if (!isPublic) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
