/**
 * Community API
 * Handles community CRUD operations
 */

import axiosInstance from "./axiosInstance";

export interface Community {
  id: string;
  uuid: string;
  name: string;
  handle: string;
  metadata: Record<string, Array<{ value: string }>>;
  type: string;
  archivedItemsCount?: number;
}

export interface CommunityListResponse {
  communities: Community[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Fetch top-level communities
 */
export const fetchTopCommunities = async (
  page = 0,
  size = 50
): Promise<CommunityListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/communities?page=${page}&size=${size}`
    );
    
    const communities = response.data._embedded?.communities || [];
    
    return {
      communities: communities.map((com: any) => ({
        id: com.id,
        uuid: com.uuid || com.id,
        name: com.name,
        handle: com.handle,
        metadata: com.metadata || {},
        type: com.type,
        archivedItemsCount: com.archivedItemsCount,
      })),
      page: response.data.page || {
        size,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
    };
  } catch (error) {
    console.error("Fetch communities error:", error);
    return {
      communities: [],
      page: { size, totalElements: 0, totalPages: 0, number: 0 },
    };
  }
};

/**
 * Fetch community by ID
 */
export const fetchCommunityById = async (id: string): Promise<Community | null> => {
  try {
    const response = await axiosInstance.get(`/api/core/communities/${id}`);
    
    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      handle: response.data.handle,
      metadata: response.data.metadata || {},
      type: response.data.type,
    };
  } catch (error) {
    console.error("Fetch community error:", error);
    return null;
  }
};

/**
 * Fetch sub-communities
 */
export const fetchSubCommunities = async (
  parentId: string,
  page = 0,
  size = 50
): Promise<CommunityListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/communities/${parentId}/subcommunities?page=${page}&size=${size}`
    );
    
    const communities = response.data._embedded?.subcommunities || [];
    
    return {
      communities: communities.map((com: any) => ({
        id: com.id,
        uuid: com.uuid || com.id,
        name: com.name,
        handle: com.handle,
        metadata: com.metadata || {},
        type: com.type,
      })),
      page: response.data.page || {
        size,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
    };
  } catch (error) {
    console.error("Fetch sub-communities error:", error);
    return {
      communities: [],
      page: { size, totalElements: 0, totalPages: 0, number: 0 },
    };
  }
};

/**
 * Fetch collections in a community
 */
export const fetchCommunityCollections = async (
  communityId: string
): Promise<any[]> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/communities/${communityId}/collections`
    );
    
    return response.data._embedded?.collections || [];
  } catch (error) {
    console.error("Fetch community collections error:", error);
    return [];
  }
};

/**
 * Create a new community
 */
export const createCommunity = async (
  title: string,
  description?: string,
  parentId?: string
): Promise<Community | null> => {
  try {
    const url = parentId
      ? `/api/core/communities?parent=${parentId}`
      : "/api/core/communities";
    
    const response = await axiosInstance.post(url, {
      metadata: {
        "dc.title": [{ value: title }],
        "dc.description": description ? [{ value: description }] : [],
      },
    });
    
    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      handle: response.data.handle,
      metadata: response.data.metadata || {},
      type: response.data.type,
    };
  } catch (error) {
    console.error("Create community error:", error);
    return null;
  }
};

/**
 * Update community
 */
export const updateCommunity = async (
  id: string,
  title: string
): Promise<boolean> => {
  try {
    await axiosInstance.patch(`/api/core/communities/${id}`, [
      {
        op: "replace",
        path: "/metadata/dc.title",
        value: { value: title, language: null },
      },
    ]);
    
    return true;
  } catch (error) {
    console.error("Update community error:", error);
    return false;
  }
};

/**
 * Delete a community
 */
export const deleteCommunity = async (id: string): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/core/communities/${id}`);
    return true;
  } catch (error) {
    console.error("Delete community error:", error);
    return false;
  }
};
