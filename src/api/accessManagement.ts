/**
 * Access Management Utilities
 * Helper functions for managing collection-wise permissions and user group assignments
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";
import { Collection, fetchCollections } from "./collectionApi";
import { Group, searchGroups } from "./groupApi";

/**
 * Fetch collections within a community
 */
export const fetchCollectionsByParent = async (
  parentId: string,
  page = 0,
  size = 50
): Promise<Collection[]> => {
  try {
    console.log(`[AccessManagement] Fetching collections for parent: ${parentId}`);

    const response = await axiosInstance.get(
      `/api/core/communities/${parentId}/collections?page=${page}&size=${size}`
    );

    const collections = response.data._embedded?.collections || [];

    return collections.map((col: any) => ({
      id: col.id,
      uuid: col.uuid || col.id,
      name: col.name,
      handle: col.handle,
      metadata: col.metadata || {},
      type: col.type,
      archivedItemsCount: col.archivedItemsCount,
    }));
  } catch (error) {
    console.error(`[AccessManagement] Failed to fetch collections:`, error);
    return [];
  }
};

/**
 * Get collection-related groups from collection name
 * Returns groups matching the pattern: {CollectionName}_Read, {CollectionName}_Admin, {CollectionName}_Upload
 */
export const getCollectionPermissionGroups = async (
  collectionName: string
): Promise<{
  readGroup: Group | null;
  adminGroup: Group | null;
  uploadGroup: Group | null;
}> => {
  try {
    console.log(`[AccessManagement] Fetching permission groups for collection: ${collectionName}`);

    const groupNames = [
      `${collectionName}_Read`,
      `${collectionName}_Admin`,
      `${collectionName}_Upload`,
    ];

    const results = {
      readGroup: null as Group | null,
      adminGroup: null as Group | null,
      uploadGroup: null as Group | null,
    };

    // Search for each group
    for (const groupName of groupNames) {
      try {
        const response = await searchGroups(groupName, 0, 10);
        const group = response.groups.find((g) => g.name === groupName);

        if (group) {
          if (groupName.includes("_Read")) {
            results.readGroup = group;
          } else if (groupName.includes("_Admin")) {
            results.adminGroup = group;
          } else if (groupName.includes("_Upload")) {
            results.uploadGroup = group;
          }
        }
      } catch (error) {
        console.warn(`[AccessManagement] Could not find group: ${groupName}`);
      }
    }

    console.log(`[AccessManagement] Found permission groups:`, results);
    return results;
  } catch (error) {
    console.error(`[AccessManagement] Failed to get collection permission groups:`, error);
    return {
      readGroup: null,
      adminGroup: null,
      uploadGroup: null,
    };
  }
};

/**
 * Fetch groups that a user belongs to
 */
export const fetchUserGroupsList = async (
  userId: string,
  page = 0,
  size = 50
): Promise<Group[]> => {
  try {
    console.log(`[AccessManagement] Fetching groups for user: ${userId}`);

    const response = await axiosInstance.get(
      `/api/eperson/epersons/${userId}/groups?page=${page}&size=${size}`
    );

    const groups = response.data._embedded?.groups || [];

    return groups.map((group: any) => ({
      id: group.id,
      uuid: group.uuid || group.id,
      name: group.name,
      permanent: group.permanent,
      metadata: group.metadata || {},
    }));
  } catch (error) {
    console.error(`[AccessManagement] Failed to fetch user groups:`, error);
    return [];
  }
};

/**
 * Check if user has specific role/permission in a collection
 * Returns true if user belongs to any of the collection's permission groups
 */
export const hasCollectionPermission = async (
  userId: string,
  collectionName: string,
  permissionType: "read" | "admin" | "upload" = "read"
): Promise<boolean> => {
  try {
    console.log(
      `[AccessManagement] Checking ${permissionType} permission for user ${userId} in collection ${collectionName}`
    );

    const userGroups = await fetchUserGroupsList(userId);
    const collectionGroups = await getCollectionPermissionGroups(collectionName);

    let targetGroup: Group | null = null;

    if (permissionType === "read") {
      targetGroup = collectionGroups.readGroup;
    } else if (permissionType === "admin") {
      targetGroup = collectionGroups.adminGroup;
    } else if (permissionType === "upload") {
      targetGroup = collectionGroups.uploadGroup;
    }

    if (!targetGroup) {
      console.warn(
        `[AccessManagement] ${permissionType} group not found for collection: ${collectionName}`
      );
      return false;
    }

    const hasPermission = userGroups.some(
      (group) => group.id === targetGroup!.id || group.uuid === targetGroup!.uuid
    );

    console.log(
      `[AccessManagement] User has ${permissionType} permission: ${hasPermission}`
    );
    return hasPermission;
  } catch (error) {
    console.error(`[AccessManagement] Failed to check collection permission:`, error);
    return false;
  }
};

/**
 * Get all collections where user has a specific permission
 */
export const getCollectionsWithUserPermission = async (
  userId: string,
  permissionType: "read" | "admin" | "upload" = "read"
): Promise<Collection[]> => {
  try {
    console.log(
      `[AccessManagement] Fetching collections where user has ${permissionType} permission`
    );

    const userGroups = await fetchUserGroupsList(userId);
    const allCollections = await fetchCollections(0, 100);

    // Filter collections where user's groups match permission group pattern
    const collectionsWithPermission = allCollections.collections.filter((collection) => {
      const permissionSuffix =
        permissionType === "read" ? "_Read" : permissionType === "admin" ? "_Admin" : "_Upload";

      return userGroups.some((group) =>
        group.name.startsWith(collection.name) && group.name.includes(permissionSuffix)
      );
    });

    console.log(
      `[AccessManagement] Found ${collectionsWithPermission.length} collections with user permission`
    );
    return collectionsWithPermission;
  } catch (error) {
    console.error(
      `[AccessManagement] Failed to get collections with user permission:`,
      error
    );
    return [];
  }
};

/**
 * Get user's role in a specific collection
 * Returns the highest permission level user has
 */
export const getUserCollectionRole = async (
  userId: string,
  collectionName: string
): Promise<"admin" | "upload" | "read" | "none"> => {
  try {
    console.log(`[AccessManagement] Getting user role in collection: ${collectionName}`);

    const isAdmin = await hasCollectionPermission(userId, collectionName, "admin");
    if (isAdmin) {
      return "admin";
    }

    const canUpload = await hasCollectionPermission(userId, collectionName, "upload");
    if (canUpload) {
      return "upload";
    }

    const canRead = await hasCollectionPermission(userId, collectionName, "read");
    if (canRead) {
      return "read";
    }

    return "none";
  } catch (error) {
    console.error(`[AccessManagement] Failed to get user collection role:`, error);
    return "none";
  }
};

/**
 * Get permission summary for a collection
 * Shows groups and their members
 */
export const getCollectionPermissionSummary = async (collectionName: string): Promise<{
  readGroup: { group: Group | null; memberCount: number };
  adminGroup: { group: Group | null; memberCount: number };
  uploadGroup: { group: Group | null; memberCount: number };
}> => {
  try {
    console.log(`[AccessManagement] Getting permission summary for collection: ${collectionName}`);

    const { readGroup, adminGroup, uploadGroup } =
      await getCollectionPermissionGroups(collectionName);

    const result = {
      readGroup: { group: readGroup, memberCount: 0 },
      adminGroup: { group: adminGroup, memberCount: 0 },
      uploadGroup: { group: uploadGroup, memberCount: 0 },
    };

    // This could be enhanced to fetch member counts if needed
    // For now, just return group info

    console.log(`[AccessManagement] Permission summary:`, result);
    return result;
  } catch (error) {
    console.error(`[AccessManagement] Failed to get permission summary:`, error);
    return {
      readGroup: { group: null, memberCount: 0 },
      adminGroup: { group: null, memberCount: 0 },
      uploadGroup: { group: null, memberCount: 0 },
    };
  }
};
