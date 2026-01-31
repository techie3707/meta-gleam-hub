/**
 * CSRF Token Management
 * Fetches and stores CSRF token for secure requests
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";

let csrfToken: string | null = null;

/**
 * Fetch CSRF token from the server
 * This should be called before making any state-changing requests
 */
export const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    // First try to get from cookie after a request
    const response = await axiosInstance.get("/api/security/csrf", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Check for token in response headers
    const headerToken = response.headers["dspace-xsrf-token"];
    if (headerToken) {
      csrfToken = headerToken;
      localStorage.setItem("csrfToken", headerToken);
      return csrfToken;
    }

    // Also check cookies after the request
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      csrfToken = cookieToken;
      localStorage.setItem("csrfToken", cookieToken);
      return csrfToken;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error);
    // Try to get from cookie as fallback
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      csrfToken = cookieToken;
      return csrfToken;
    }
    return null;
  }
};

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
  return null;
}

/**
 * Get the current CSRF token
 * Returns cached token or fetches a new one
 */
export const getCsrfToken = async (): Promise<string | null> => {
  if (csrfToken) {
    return csrfToken;
  }
  
  // Try from localStorage
  const storedToken = localStorage.getItem("csrfToken");
  if (storedToken) {
    csrfToken = storedToken;
    return csrfToken;
  }
  
  return await fetchCsrfToken();
};

/**
 * Clear CSRF token (on logout)
 */
export const clearCsrfToken = (): void => {
  csrfToken = null;
  localStorage.removeItem("csrfToken");
};
