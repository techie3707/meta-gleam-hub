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

/**
 * Fetch fresh CSRF token from the server
 */
async function fetchCsrfToken(): Promise<string | null> {
  try {
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (authToken) {
      headers.Authorization = authToken;
    }

    const response = await axios.get(`${siteConfig.apiEndpoint}/api/security/csrf`, {
      withCredentials: true,
      headers,
    });

    // Extract CSRF token from response headers
    const csrfToken = response.headers["dspace-xsrf-token"] || 
                      response.headers["x-xsrf-token"] ||
                      response.data?.token;

    if (csrfToken) {
      // Store the token for later use
      localStorage.setItem("csrfToken", csrfToken);
      return csrfToken;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error);
    return null;
  }
}

// Request interceptor to add auth token and CSRF token
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);
    if (authToken) {
      config.headers.Authorization = authToken;
    }

    // For POST, PUT, PATCH, DELETE requests, fetch fresh CSRF token
    const method = config.method?.toUpperCase() || "";
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      // Fetch fresh CSRF token before the request
      const freshCsrfToken = await fetchCsrfToken();
      
      if (freshCsrfToken) {
        config.headers[siteConfig.auth.csrfHeaderName] = freshCsrfToken;
      } else {
        // Fallback to cookie/localStorage token
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) {
          config.headers[siteConfig.auth.csrfHeaderName] = csrfToken;
        }
      }
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
