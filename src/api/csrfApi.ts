/**
 * CSRF Token Management
 * Fetches and stores CSRF token for secure requests
 * Per API docs: GET /api/security/csrf returns token in headers
 */

import axios from "axios";
import { siteConfig } from "@/config/siteConfig";

let csrfToken: string | null = null;

/**
 * Fetch CSRF token from the server
 * This should be called before making any state-changing requests (POST, PATCH, PUT, DELETE)
 * 
 * Endpoint: GET /api/security/csrf
 * Response: Token returned in headers["dspace-xsrf-token"]
 */
export const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (authToken) {
      headers.Authorization = authToken;
    }

    // Call CSRF endpoint - use plain axios to avoid circular dependency
    const response = await axios.get(`${siteConfig.apiEndpoint}/api/security/csrf`, {
      withCredentials: true,
      headers,
    });

    // Extract token from response headers as per documentation
    const headerToken = response.headers["dspace-xsrf-token"] || 
                        response.headers["x-xsrf-token"];
    
    if (headerToken) {
      csrfToken = headerToken;
      localStorage.setItem("csrfToken", headerToken);
      return csrfToken;
    }

    // Fallback: Check cookies after the request
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      csrfToken = cookieToken;
      localStorage.setItem("csrfToken", cookieToken);
      return csrfToken;
    }

    console.warn("CSRF token not found in response headers or cookies");
    return null;
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error);
    // Try to get from cookie as fallback
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      csrfToken = cookieToken;
      localStorage.setItem("csrfToken", cookieToken);
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
