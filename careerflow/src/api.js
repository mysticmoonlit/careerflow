import axios from "axios";

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Support VITE_API_URL and VITE_API_BASE_URL environment variables from Vercel
const rawBaseURL =
  (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)) ||
  "http://localhost:8000/api";

// Ensure baseURL ends with /api (without double slashes)
const sanitizedBase = rawBaseURL.trim().replace(/\/+$/, "");
const baseURL = sanitizedBase.endsWith("/api") ? sanitizedBase : `${sanitizedBase}/api`;

let fallbackCsrfToken = null;

const api = axios.create({
  baseURL,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  headers: {
    "Content-Type": "application/json",
  },
});

// Cache CSRF token from server response (e.g. /auth/csrf/) for cross-origin hosting
api.interceptors.response.use(
  (response) => {
    if (response?.data?.csrfToken) {
      fallbackCsrfToken = response.data.csrfToken;
    }
    return response;
  },
  (error) => Promise.reject(error)
);

api.interceptors.request.use((config) => {
  const csrfToken = getCookie("csrftoken") || fallbackCsrfToken;
  if (csrfToken && !config.headers["X-CSRFToken"]) {
    config.headers["X-CSRFToken"] = csrfToken;
  }
  return config;
});

export default api;