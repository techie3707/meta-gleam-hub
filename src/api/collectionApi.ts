/**
 * Collection API
 * Handles collection CRUD operations
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";
import { setupCollectionPermissions } from "./collectionPermissionsApi";

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
 * Create a new collection under a community with automatic group creation
 * 
 * This function:
 * 1. Creates the collection resource
 * 2. Waits for backend indexing
 * 3. Automatically creates three permission groups:
 *    - {CollectionName}_Read
 *    - {CollectionName}_Admin
 *    - {CollectionName}_Upload
 * 4. Creates default resource policies linking groups to actions
 */
export const createCollection = async (
  parentId: string,
  metadata: Record<string, Array<{ value: string; language?: string }>>,
  name?: string,
  autoCreateGroups: boolean = true
): Promise<Collection | null> => {
  try {
    console.log("[Collection] Creating new collection", { parentId, name });

    const payload: any = {
      metadata,
      type: "collection",
    };

    if (name) {
      payload.name = name;
    }

    const response = await axiosInstance.post(
      `/api/core/collections?parent=${parentId}`,
      payload
    );
    
    const collection: Collection = {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      handle: response.data.handle,
      metadata: response.data.metadata || {},
      type: response.data.type,
    };

    console.log("[Collection] Collection created successfully", collection);

    // Step 2: Auto-create permission groups if enabled
    if (autoCreateGroups) {
      console.log("[Collection] Starting automatic permission group creation");

      // Extract collection title for group naming
      const collectionTitle = 
        metadata["dc.title"]?.[0]?.value || 
        collection.name || 
        `Collection_${collection.id.substring(0, 8)}`;

      const collectionDescription = metadata["dc.description"]?.[0]?.value;

      // Wait for collection to be fully indexed before creating groups
      // This prevents race conditions in the backend
      setTimeout(async () => {
        try {
          const permissionResult = await setupCollectionPermissions(
            collection.id,
            collectionTitle,
            collectionDescription
          );

          if (permissionResult.success) {
            console.log(
              "[Collection] Permission groups and policies created successfully",
              {
                groupIds: permissionResult.groupIds,
                policyIds: permissionResult.policyIds,
              }
            );
          } else {
            console.warn(
              "[Collection] Permission setup completed with errors",
              {
                errors: permissionResult.errors,
              }
            );
          }
        } catch (permissionError: any) {
          console.error(
            "[Collection] Failed to create permission groups and policies",
            permissionError
          );
        }
      }, 1000); // Wait 1 second for backend indexing
    }

    return collection;
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
 * If no category match, group by community name instead of "Other"
 */
export const groupCollectionsByCategoryWithCommunities = (
  collections: Collection[],
  communityMap: Map<string, string> = new Map()
): Map<string, Collection[]> => {
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
      // Try to get community name from the map, fallback to "Other"
      const communityName = communityMap.get(collection.id) || "Other";
      
      if (!categoryMap.has(communityName)) {
        categoryMap.set(communityName, []);
      }
      categoryMap.get(communityName)!.push(collection);
    }
  });
  
  return categoryMap;
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
