/**
 * Authentication API
 * Handles login, logout, registration, and auth status
 */

import axiosInstance from "./axiosInstance";
import { fetchCsrfToken, clearCsrfToken } from "./csrfApi";
import { siteConfig } from "@/config/siteConfig";

export interface LoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  userId?: string;
  type?: string;
}

export interface UserGroups {
  groups: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

/**
 * Login user with email and password
 */
export const authLogin = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    // Ensure we have a CSRF token
    await fetchCsrfToken();

    const formData = new URLSearchParams();
    formData.append("user", email);
    formData.append("password", password);

    const response = await axiosInstance.post("/api/authn/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // Token is in response headers
    const authToken = response.headers["authorization"];
    if (authToken) {
      localStorage.setItem(siteConfig.auth.tokenKey, authToken);
      return { success: true, token: authToken };
    }

    return { success: false, error: "No token received" };
  } catch (error: any) {
    console.error("Login error:", error);
    if (error.response?.status === 401) {
      return { success: false, error: "Invalid email or password" };
    }
    return { success: false, error: error.message || "Login failed" };
  }
};

/**
 * Get authentication status and user ID
 */
export const getAuthStatus = async (): Promise<string | null> => {
  try {
    const response = await axiosInstance.get("/api/authn/status");
    
    if (response.data.authenticated && response.data._links?.eperson?.href) {
      const uuid = response.data._links.eperson.href.split("/").pop();
      return uuid || null;
    }
    
    return null;
  } catch (error) {
    console.error("Auth status error:", error);
    return null;
  }
};

/**
 * Logout user
 */
export const authLogout = async (): Promise<boolean> => {
  try {
    await axiosInstance.post("/api/authn/logout", {});
    
    // Clear all auth data
    localStorage.removeItem(siteConfig.auth.tokenKey);
    localStorage.removeItem(siteConfig.auth.userIdKey);
    localStorage.removeItem(siteConfig.auth.isAdminKey);
    clearCsrfToken();
    
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    // Clear local data even if API fails
    localStorage.removeItem(siteConfig.auth.tokenKey);
    localStorage.removeItem(siteConfig.auth.userIdKey);
    localStorage.removeItem(siteConfig.auth.isAdminKey);
    clearCsrfToken();
    return false;
  }
};

/**
 * Fetch user groups to determine admin status
 */
export const fetchUserGroupsList = async (userId: string): Promise<UserGroups> => {
  try {
    const response = await axiosInstance.get(`/api/eperson/epersons/${userId}/groups`);
    
    const groups = response.data._embedded?.groups || [];
    return { groups };
  } catch (error) {
    console.error("Fetch user groups error:", error);
    return { groups: [] };
  }
};

/**
 * Register new user (sends registration email)
 */
export const registerUser = async (email: string): Promise<{ success: boolean; message?: string }> => {
  try {
    await fetchCsrfToken();
    
    await axiosInstance.post("/api/eperson/registrations?accountRequestType=register", {
      email,
    });
    
    return { success: true, message: "Registration email sent. Please check your inbox." };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { success: false, message: error.response?.data?.message || "Registration failed" };
  }
};

/**
 * Request password reset
 */
export const forgotPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
  try {
    await fetchCsrfToken();
    
    await axiosInstance.post("/api/eperson/registrations?accountRequestType=forgot", {
      email,
    });
    
    return { success: true, message: "Password reset link sent to your email." };
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return { success: false, message: error.response?.data?.message || "Request failed" };
  }
};

/**
 * Complete registration with token
 */
export const completeRegistration = async (
  token: string,
  userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }
): Promise<{ success: boolean; message?: string }> => {
  try {
    await fetchCsrfToken();
    
    await axiosInstance.post(`/api/eperson/epersons?token=${token}`, {
      canLogIn: true,
      email: userData.email,
      requireCertificate: false,
      password: userData.password,
      metadata: {
        "eperson.firstname": [{ value: userData.firstName }],
        "eperson.lastname": [{ value: userData.lastName }],
        "eperson.phone": userData.phone ? [{ value: userData.phone }] : [],
        "eperson.language": [{ value: "en" }],
        "dspace.agreements.end-user": [{ value: "true" }],
      },
    });
    
    return { success: true, message: "Registration completed successfully" };
  } catch (error: any) {
    console.error("Complete registration error:", error);
    return { success: false, message: error.response?.data?.message || "Registration failed" };
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (
  userId: string,
  token: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    await fetchCsrfToken();
    
    await axiosInstance.patch(`/api/eperson/epersons/${userId}?token=${token}`, [
      {
        op: "add",
        path: "/password",
        value: {
          new_password: newPassword,
        },
      },
    ]);
    
    return { success: true, message: "Password reset successfully" };
  } catch (error: any) {
    console.error("Reset password error:", error);
    return { success: false, message: error.response?.data?.message || "Password reset failed" };
  }
};

/**
 * Change password for authenticated user
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    await axiosInstance.patch(`/api/eperson/epersons/${userId}`, [
      {
        op: "add",
        path: "/password",
        value: {
          new_password: newPassword,
          current_password: currentPassword,
        },
      },
    ]);
    
    return { success: true, message: "Password changed successfully" };
  } catch (error: any) {
    console.error("Change password error:", error);
    return { success: false, message: error.response?.data?.message || "Password change failed" };
  }
};
