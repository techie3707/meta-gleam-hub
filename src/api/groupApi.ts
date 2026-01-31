/**
 * Group Management API
 * Handles group CRUD operations and membership
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";

export interface Group {
  id: string;
  uuid: string;
  name: string;
  permanent: boolean;
  metadata: {
    "dc.description"?: Array<{ value: string }>;
  };
}

export interface GroupListResponse {
  groups: Group[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Search groups by metadata
 */
export const searchGroups = async (
  query = "",
  page = 0,
  size = 10
): Promise<GroupListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/eperson/groups/search/byMetadata?page=${page}&size=${size}&query=${encodeURIComponent(query)}&embed=object`
    );
    
    const groups = response.data._embedded?.groups || [];
    
    return {
      groups: groups.map((group: any) => ({
        id: group.id,
        uuid: group.uuid || group.id,
        name: group.name,
        permanent: group.permanent,
        metadata: group.metadata || {},
      })),
      page: response.data.page || {
        size,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
    };
  } catch (error) {
    console.error("Search groups error:", error);
    return {
      groups: [],
      page: { size, totalElements: 0, totalPages: 0, number: 0 },
    };
  }
};

/**
 * Create a new group
 */
export const createGroup = async (
  name: string,
  description?: string
): Promise<Group | null> => {
  try {
    const response = await axiosInstance.post("/api/eperson/groups", {
      name,
      metadata: {
        "dc.description": description ? [{ value: description }] : [],
      },
    });
    
    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      permanent: response.data.permanent,
      metadata: response.data.metadata || {},
    };
  } catch (error) {
    console.error("Create group error:", error);
    return null;
  }
};

/**
 * Update group
 */
export const updateGroup = async (
  groupId: string,
  name?: string,
  description?: string
): Promise<boolean> => {
  try {
    const operations = [];
    
    if (name) {
      operations.push({
        op: "replace",
        path: "/name",
        value: name,
      });
    }
    
    if (description !== undefined) {
      operations.push({
        op: "add",
        path: "/metadata/dc.description",
        value: description,
      });
    }
    
    if (operations.length > 0) {
      await axiosInstance.patch(`/api/eperson/groups/${groupId}`, operations);
    }
    
    return true;
  } catch (error) {
    console.error("Update group error:", error);
    return false;
  }
};

/**
 * Delete group
 */
export const deleteGroup = async (groupId: string): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/eperson/groups/${groupId}`);
    return true;
  } catch (error) {
    console.error("Delete group error:", error);
    return false;
  }
};

/**
 * Fetch group members
 */
export const fetchGroupMembers = async (
  groupId: string,
  page = 0,
  size = 50
): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `/api/eperson/groups/${groupId}/epersons?page=${page}&size=${size}`
    );
    
    return {
      members: response.data._embedded?.epersons || [],
      page: response.data.page || {
        size,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
    };
  } catch (error) {
    console.error("Fetch group members error:", error);
    return { members: [], page: { size, totalElements: 0, totalPages: 0, number: 0 } };
  }
};

/**
 * Add member to group
 */
export const addMemberToGroup = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  try {
    await axiosInstance.post(
      `/api/eperson/groups/${groupId}/epersons`,
      `${siteConfig.apiEndpoint}/api/eperson/epersons/${userId}`,
      {
        headers: {
          "Content-Type": "text/uri-list",
        },
      }
    );
    return true;
  } catch (error) {
    console.error("Add member to group error:", error);
    return false;
  }
};

/**
 * Remove member from group
 */
export const removeMemberFromGroup = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/eperson/groups/${groupId}/epersons/${userId}`);
    return true;
  } catch (error) {
    console.error("Remove member from group error:", error);
    return false;
  }
};

/**
 * Fetch non-members (users not in group)
 */
export const fetchNonMembers = async (
  groupId: string,
  query = "",
  page = 0,
  size = 10
): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `/api/eperson/epersons/search/isNotMemberOf?page=${page}&size=${size}&query=${encodeURIComponent(query)}&group=${groupId}`
    );
    
    return {
      users: response.data._embedded?.epersons || [],
      page: response.data.page || {
        size,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
    };
  } catch (error) {
    console.error("Fetch non-members error:", error);
    return { users: [], page: { size, totalElements: 0, totalPages: 0, number: 0 } };
  }
};
