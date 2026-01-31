/**
 * Axios Instance Configuration
 * Configured with interceptors for auth, CSRF, and error handling
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { siteConfig } from "@/config/siteConfig";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: siteConfig.apiEndpoint,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token and CSRF token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);
    if (authToken) {
      config.headers.Authorization = authToken;
    }

    // Add CSRF token for state-changing requests
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(config.method?.toUpperCase() || "")) {
      config.headers[siteConfig.auth.csrfHeaderName] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth tokens on 401
      localStorage.removeItem(siteConfig.auth.tokenKey);
      localStorage.removeItem(siteConfig.auth.userIdKey);
      localStorage.removeItem(siteConfig.auth.isAdminKey);
      
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Get CSRF token from cookie
 */
function getCsrfTokenFromCookie(): string | null {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === siteConfig.auth.csrfCookieName) {
      return decodeURIComponent(value);
    }
  }
  return localStorage.getItem("csrfToken");
}

export default axiosInstance;
