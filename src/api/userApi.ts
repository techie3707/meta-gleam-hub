/**
 * User Management API
 * Handles user CRUD operations
 */

import axiosInstance from "./axiosInstance";

export interface User {
  id: string;
  uuid: string;
  email: string;
  name: string;
  canLogIn: boolean;
  requireCertificate: boolean;
  selfRegistered: boolean;
  metadata: {
    "eperson.firstname"?: Array<{ value: string }>;
    "eperson.lastname"?: Array<{ value: string }>;
    "eperson.phone"?: Array<{ value: string }>;
    "eperson.language"?: Array<{ value: string }>;
  };
}

export interface UserListResponse {
  users: User[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Search users by metadata
 */
export const searchUsers = async (
  query = "",
  page = 0,
  size = 10
): Promise<UserListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/eperson/epersons/search/byMetadata?page=${page}&size=${size}&query=${encodeURIComponent(query)}`
    );
    
    const users = response.data._embedded?.epersons || [];
    
    return {
      users: users.map((user: any) => ({
        id: user.id,
        uuid: user.uuid || user.id,
        email: user.email,
        name: user.name,
        canLogIn: user.canLogIn,
        requireCertificate: user.requireCertificate,
        selfRegistered: user.selfRegistered,
        metadata: user.metadata || {},
      })),
      page: response.data.page || {
        size,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
    };
  } catch (error) {
    console.error("Search users error:", error);
    return {
      users: [],
      page: { size, totalElements: 0, totalPages: 0, number: 0 },
    };
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const response = await axiosInstance.get(`/api/eperson/epersons/${userId}`);
    
    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      email: response.data.email,
      name: response.data.name,
      canLogIn: response.data.canLogIn,
      requireCertificate: response.data.requireCertificate,
      selfRegistered: response.data.selfRegistered,
      metadata: response.data.metadata || {},
    };
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
};

/**
 * Create a new user
 */
export const createUser = async (userData: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  canLogIn?: boolean;
}): Promise<User | null> => {
  try {
    const response = await axiosInstance.post("/api/eperson/epersons", {
      email: userData.email,
      canLogIn: userData.canLogIn ?? true,
      requireCertificate: false,
      metadata: {
        "eperson.firstname": [{ value: userData.firstName }],
        "eperson.lastname": [{ value: userData.lastName }],
        "eperson.phone": userData.phone ? [{ value: userData.phone }] : [],
      },
    });
    
    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      email: response.data.email,
      name: response.data.name,
      canLogIn: response.data.canLogIn,
      requireCertificate: response.data.requireCertificate,
      selfRegistered: response.data.selfRegistered,
      metadata: response.data.metadata || {},
    };
  } catch (error) {
    console.error("Create user error:", error);
    return null;
  }
};

/**
 * Update user
 */
export const updateUser = async (
  userId: string,
  operations: Array<{
    op: "replace" | "add" | "remove";
    path: string;
    value?: any;
  }>
): Promise<boolean> => {
  try {
    await axiosInstance.patch(`/api/eperson/epersons/${userId}`, operations);
    return true;
  } catch (error) {
    console.error("Update user error:", error);
    return false;
  }
};

/**
 * Delete user
 */
export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/eperson/epersons/${userId}`);
    return true;
  } catch (error) {
    console.error("Delete user error:", error);
    return false;
  }
};

/**
 * Get user's first name
 */
export const getUserFirstName = (user: User): string => {
  return user.metadata["eperson.firstname"]?.[0]?.value || "";
};

/**
 * Get user's last name
 */
export const getUserLastName = (user: User): string => {
  return user.metadata["eperson.lastname"]?.[0]?.value || "";
};

/**
 * Get user's full name
 */
export const getUserFullName = (user: User): string => {
  const firstName = getUserFirstName(user);
  const lastName = getUserLastName(user);
  return `${firstName} ${lastName}`.trim() || user.email;
};

/**
 * EPerson interface for resource policies
 */
export interface EPerson {
  id: string;
  uuid: string;
  email: string;
  netid: string | null;
  lastActive: string;
  canLogIn: boolean;
  requireCertificate: boolean;
  selfRegistered: boolean;
  type: string;
  metadata: {
    "eperson.firstname": [{ value: string }];
    "eperson.lastname": [{ value: string }];
  };
}

export interface EPersonListResponse {
  epersons: EPerson[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Fetch users with pagination and search
 * Returns EPerson format for resource policies
 */
export const fetchUsers = async (
  page = 0,
  size = 10,
  query = ""
): Promise<EPersonListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/eperson/epersons/search/byMetadata?page=${page}&size=${size}&query=${encodeURIComponent(query)}`
    );
    
    const epersons = response.data._embedded?.epersons || [];
    
    return {
      epersons: epersons.map((user: any) => ({
        id: user.id,
        uuid: user.uuid || user.id,
        email: user.email,
        netid: user.netid || null,
        lastActive: user.lastActive,
        canLogIn: user.canLogIn,
        requireCertificate: user.requireCertificate,
        selfRegistered: user.selfRegistered,
        type: user.type || "eperson",
        metadata: user.metadata || {
          "eperson.firstname": [{ value: "" }],
          "eperson.lastname": [{ value: "" }],
        },
      })),
      page: response.data.page || {
        size,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
    };
  } catch (error) {
    console.error("Fetch users error:", error);
    return {
      epersons: [],
      page: { size, totalElements: 0, totalPages: 0, number: 0 },
    };
  }
};
