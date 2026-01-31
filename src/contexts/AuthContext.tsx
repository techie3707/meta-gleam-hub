/**
 * Auth Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  authLogin,
  authLogout,
  getAuthStatus,
  fetchUserGroupsList,
} from "@/api/authApi";
import { fetchCsrfToken } from "@/api/csrfApi";
import { siteConfig } from "@/config/siteConfig";

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId: string | null;
  userGroups: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem(siteConfig.auth.tokenKey);
      const storedUserId = localStorage.getItem(siteConfig.auth.userIdKey);
      const storedIsAdmin = localStorage.getItem(siteConfig.auth.isAdminKey);

      if (storedToken && storedUserId) {
        setIsAuthenticated(true);
        setUserId(storedUserId);
        setIsAdmin(storedIsAdmin === "true");

        // Verify with server
        const serverUserId = await getAuthStatus();
        if (!serverUserId) {
          // Token invalid, clear auth
          await logout();
          return;
        }

        // Refresh user groups
        const groupsData = await fetchUserGroupsList(storedUserId);
        const groups = groupsData.groups.map((g) => g.name);
        setUserGroups(groups);
        setIsAdmin(groups.includes("Administrator"));
        localStorage.setItem(siteConfig.auth.isAdminKey, String(groups.includes("Administrator")));
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Check auth error:", error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Ensure CSRF token is available
      await fetchCsrfToken();

      const result = await authLogin(email, password);

      if (result.success) {
        setIsAuthenticated(true);

        // Get user ID from auth status
        const userId = await getAuthStatus();
        if (userId) {
          setUserId(userId);
          localStorage.setItem(siteConfig.auth.userIdKey, userId);

          // Fetch user groups
          const groupsData = await fetchUserGroupsList(userId);
          const groups = groupsData.groups.map((g) => g.name);
          setUserGroups(groups);

          const adminGroup = groups.includes("Administrator");
          setIsAdmin(adminGroup);
          localStorage.setItem(siteConfig.auth.isAdminKey, String(adminGroup));
        }

        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error: any) {
      console.error("Login error:", error);
      return { success: false, error: error.message || "Login failed" };
    }
  };

  const logout = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserId(null);
      setUserGroups([]);
      localStorage.removeItem(siteConfig.auth.tokenKey);
      localStorage.removeItem(siteConfig.auth.userIdKey);
      localStorage.removeItem(siteConfig.auth.isAdminKey);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        userId,
        userGroups,
        loading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Check if user has read access to a collection
 */
export function useHasReadAccess(collectionName: string): boolean {
  const { isAdmin, userGroups } = useAuth();
  if (isAdmin) return true;
  const normalized = collectionName.replace(/\s+/g, "");
  return userGroups.includes(`${normalized}_Read`);
}

/**
 * Check if user has upload access to a collection
 */
export function useHasUploadAccess(collectionName: string): boolean {
  const { isAdmin, userGroups } = useAuth();
  if (isAdmin) return true;
  const normalized = collectionName.replace(/\s+/g, "");
  return userGroups.includes(`${normalized}_Upload`);
}

/**
 * Check if user has admin access to a collection
 */
export function useHasAdminAccess(collectionName: string): boolean {
  const { isAdmin, userGroups } = useAuth();
  if (isAdmin) return true;
  const normalized = collectionName.replace(/\s+/g, "");
  return userGroups.includes(`${normalized}_Admin`);
}
