/**
 * Collection API
 * Handles collection CRUD operations
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";

export interface Collection {
  id: string;
  uuid: string;
  name: string;
  handle: string;
  metadata: Record<string, Array<{ value: string }>>;
  type: string;
  archivedItemsCount?: number;
}

export interface CollectionListResponse {
  collections: Collection[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Fetch all collections
 */
export const fetchCollections = async (
  page = 0,
  size = 50
): Promise<CollectionListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/collections?page=${page}&size=${size}`
    );
    
    const collections = response.data._embedded?.collections || [];
    
    return {
      collections: collections.map((col: any) => ({
        id: col.id,
        uuid: col.uuid || col.id,
        name: col.name,
        handle: col.handle,
        metadata: col.metadata || {},
        type: col.type,
        archivedItemsCount: col.archivedItemsCount,
      })),
      page: response.data.page || {
        size,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
    };
  } catch (error) {
    console.error("Fetch collections error:", error);
    return {
      collections: [],
      page: { size, totalElements: 0, totalPages: 0, number: 0 },
    };
  }
};

/**
 * Fetch collection by ID
 */
export const fetchCollectionById = async (id: string): Promise<Collection | null> => {
  try {
    const response = await axiosInstance.get(`/api/core/collections/${id}`);
    
    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      handle: response.data.handle,
      metadata: response.data.metadata || {},
      type: response.data.type,
      archivedItemsCount: response.data.archivedItemsCount,
    };
  } catch (error) {
    console.error("Fetch collection error:", error);
    return null;
  }
};

/**
 * Create a new collection under a community
 */
export const createCollection = async (
  parentId: string,
  title: string,
  description?: string
): Promise<Collection | null> => {
  try {
    const response = await axiosInstance.post(
      `/api/core/collections?parent=${parentId}`,
      {
        metadata: {
          "dc.title": [{ value: title }],
          "dc.description": description ? [{ value: description }] : [],
        },
      }
    );
    
    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      handle: response.data.handle,
      metadata: response.data.metadata || {},
      type: response.data.type,
    };
  } catch (error) {
    console.error("Create collection error:", error);
    return null;
  }
};

/**
 * Update collection title
 */
export const updateCollection = async (
  id: string,
  title: string
): Promise<boolean> => {
  try {
    await axiosInstance.patch(`/api/core/collections/${id}`, [
      {
        op: "replace",
        path: "/metadata/dc.title",
        value: { value: title, language: null },
      },
    ]);
    
    return true;
  } catch (error) {
    console.error("Update collection error:", error);
    return false;
  }
};

/**
 * Delete a collection
 */
export const deleteCollection = async (id: string): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/core/collections/${id}`);
    return true;
  } catch (error) {
    console.error("Delete collection error:", error);
    return false;
  }
};

/**
 * Group collections by category based on naming convention
 */
export const groupCollectionsByCategory = (collections: Collection[]): Map<string, Collection[]> => {
  const categoryMap = new Map<string, Collection[]>();
  const separator = siteConfig.collectionGrouping.separator;
  
  collections.forEach((collection) => {
    const name = collection.name;
    const parts = name.split(separator);
    
    if (parts.length > 1 && siteConfig.collectionGrouping.enabled) {
      // Use first part as category
      const category = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(collection);
    } else {
      // Standalone collection
      if (!categoryMap.has("Other")) {
        categoryMap.set("Other", []);
      }
      categoryMap.get("Other")!.push(collection);
    }
  });
  
  return categoryMap;
};
