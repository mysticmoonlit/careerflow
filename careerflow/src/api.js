import axios from "axios";

function getCookie(name) {
  let cookieValue = null;
  if (typeof document !== "undefined" && document.cookie && document.cookie !== "") {
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

let activeCsrfToken =
  typeof window !== "undefined" && window.sessionStorage
    ? window.sessionStorage.getItem("careerflow_csrftoken")
    : null;

export function getStoredCsrfToken() {
  return (
    getCookie("csrftoken") ||
    activeCsrfToken ||
    (typeof window !== "undefined" && window.sessionStorage
      ? window.sessionStorage.getItem("careerflow_csrftoken")
      : null)
  );
}

export function setCsrfToken(token) {
  if (token && typeof token === "string") {
    activeCsrfToken = token;
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem("careerflow_csrftoken", token);
      }
    } catch {
      // Ignore storage errors in private browsing modes
    }
  }
}

let csrfFetchPromise = null;

export async function ensureCsrfToken(forceRefresh = false) {
  const existing = getStoredCsrfToken();
  if (!forceRefresh && existing) {
    return existing;
  }

  if (csrfFetchPromise) {
    return csrfFetchPromise;
  }

  csrfFetchPromise = (async () => {
    try {
      // Use direct axios call to avoid interceptor recursion
      const res = await axios.get(`${baseURL}/auth/csrf/`, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      const token = res.data?.csrfToken;
      if (token) {
        setCsrfToken(token);
        return token;
      }
    } catch (err) {
      console.warn("[CareerFlow] Failed to fetch fresh CSRF token:", err);
    } finally {
      csrfFetchPromise = null;
    }
    return getStoredCsrfToken();
  })();

  return csrfFetchPromise;
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  headers: {
    "Content-Type": "application/json",
  },
});

// Mutating requests automatically ensure a valid CSRF token is attached
api.interceptors.request.use(async (config) => {
  const method = (config.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    let token = getStoredCsrfToken();
    if (!token) {
      token = await ensureCsrfToken();
    }
    if (token) {
      config.headers["X-CSRFToken"] = token;
    }
  }
  return config;
});

// Automatically capture updated CSRF tokens and recover from CSRF token mismatches
api.interceptors.response.use(
  (response) => {
    if (response?.data?.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const responseData = error.response?.data;
    const isCsrfError =
      error.response?.status === 403 &&
      responseData &&
      ((typeof responseData.detail === "string" &&
        responseData.detail.toLowerCase().includes("csrf")) ||
        (typeof responseData === "string" &&
          responseData.toLowerCase().includes("csrf")));

    if (isCsrfError && originalRequest && !originalRequest._retryCsrf) {
      originalRequest._retryCsrf = true;
      // Force fetch a fresh CSRF token from the backend
      const freshToken = await ensureCsrfToken(true);
      if (freshToken) {
        originalRequest.headers["X-CSRFToken"] = freshToken;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;