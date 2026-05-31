/**
 * Collection Permissions API
 * Handles automatic group creation and resource policy management for collections
 * Implements collection-wise permissions system with auto-generated groups
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";
import { createGroup } from "./groupApi";

/**
 * Resource Policy Interface
 */
export interface ResourcePolicy {
  id: string;
  uuid: string;
  type: string;
  action: string; // READ, WRITE, ADMIN, DELETE, SUBMIT
  startDate?: string;
  endDate?: string;
  policyType: string; // TYPE_SUBMISSION, TYPE_CUSTOM, etc.
  _embedded?: {
    eperson?: any;
    group?: any;
  };
  _links?: {
    self: { href: string };
    resource: { href: string };
  };
}

/**
 * Permission Group Types
 */
export enum PermissionGroupType {
  READ = "Read",
  ADMIN = "Admin",
  UPLOAD = "Upload",
}

/**
 * Auto-generate three permission groups for a collection
 * Called automatically after collection creation
 *
 * Groups created:
 * 1. {CollectionName}_Read   - Read-only access
 * 2. {CollectionName}_Admin  - Administrative access
 * 3. {CollectionName}_Upload - Upload/Submit access
 */
export const createCollectionPermissionGroups = async (
  collectionId: string,
  collectionName: string,
  collectionDescription?: string
): Promise<{
  readGroup: any | null;
  adminGroup: any | null;
  uploadGroup: any | null;
  errors: string[];
}> => {
  const errors: string[] = [];
  const results = {
    readGroup: null as any,
    adminGroup: null as any,
    uploadGroup: null as any,
    errors,
  };

  try {
    console.log(`[CollectionPermissions] Creating groups for collection: ${collectionName}`);

    // Define group names following DSpace naming convention
    const groupDefinitions = [
      {
        name: `${collectionName}_Read`,
        description: `Read-only access to ${collectionName} collection`,
        type: PermissionGroupType.READ,
      },
      {
        name: `${collectionName}_Admin`,
        description: `Administrative access to ${collectionName} collection`,
        type: PermissionGroupType.ADMIN,
      },
      {
        name: `${collectionName}_Upload`,
        description: `Upload/Submit access to ${collectionName} collection`,
        type: PermissionGroupType.UPLOAD,
      },
    ];

    // Create groups in parallel
    const groupPromises = groupDefinitions.map((groupDef) =>
      createGroup(groupDef.name, groupDef.description)
        .then((group) => ({
          type: groupDef.type,
          group,
        }))
        .catch((error) => {
          const errorMsg = `Failed to create ${groupDef.type} group: ${error.message}`;
          console.error(`[CollectionPermissions] ${errorMsg}`);
          errors.push(errorMsg);
          return {
            type: groupDef.type,
            group: null,
          };
        })
    );

    const groupResults = await Promise.all(groupPromises);

    // Map results to output
    groupResults.forEach((result) => {
      if (result.type === PermissionGroupType.READ) {
        results.readGroup = result.group;
      } else if (result.type === PermissionGroupType.ADMIN) {
        results.adminGroup = result.group;
      } else if (result.type === PermissionGroupType.UPLOAD) {
        results.uploadGroup = result.group;
      }
    });

    console.log(`[CollectionPermissions] Group creation completed`, {
      readGroup: !!results.readGroup,
      adminGroup: !!results.adminGroup,
      uploadGroup: !!results.uploadGroup,
      errors: errors.length,
    });

    return results;
  } catch (error: any) {
    const errorMsg = `Failed to create collection permission groups: ${error.message}`;
    console.error(`[CollectionPermissions] ${errorMsg}`);
    errors.push(errorMsg);
    return results;
  }
};

/**
 * Create resource policies linking groups to actions
 * Creates default policies for READ, WRITE (ADMIN), and SUBMIT actions
 */
export const createDefaultResourcePolicies = async (
  collectionId: string,
  groupIds: {
    readGroupId?: string;
    adminGroupId?: string;
    uploadGroupId?: string;
  }
): Promise<{
  readPolicy: ResourcePolicy | null;
  writePolicy: ResourcePolicy | null;
  submitPolicy: ResourcePolicy | null;
  errors: string[];
}> => {
  const errors: string[] = [];
  const results = {
    readPolicy: null as ResourcePolicy | null,
    writePolicy: null as ResourcePolicy | null,
    submitPolicy: null as ResourcePolicy | null,
    errors,
  };

  try {
    console.log(`[CollectionPermissions] Creating resource policies for collection: ${collectionId}`);

    const policyDefinitions = [
      {
        groupId: groupIds.readGroupId,
        action: "READ",
        policyType: "TYPE_SUBMISSION",
        resultKey: "readPolicy",
      },
      {
        groupId: groupIds.adminGroupId,
        action: "WRITE",
        policyType: "TYPE_CUSTOM",
        resultKey: "writePolicy",
      },
      {
        groupId: groupIds.uploadGroupId,
        action: "SUBMIT",
        policyType: "TYPE_SUBMISSION",
        resultKey: "submitPolicy",
      },
    ];

    // Create policies in parallel
    const policyPromises = policyDefinitions.map((policyDef) => {
      if (!policyDef.groupId) {
        return Promise.resolve({
          key: policyDef.resultKey,
          policy: null,
          error: `${policyDef.action} group ID not provided`,
        });
      }

      return createResourcePolicyForGroup(
        collectionId,
        policyDef.groupId,
        policyDef.action,
        policyDef.policyType
      )
        .then((policy) => ({
          key: policyDef.resultKey,
          policy,
          error: null,
        }))
        .catch((error) => {
          const errorMsg = `Failed to create ${policyDef.action} policy: ${error.message}`;
          console.error(`[CollectionPermissions] ${errorMsg}`);
          errors.push(errorMsg);
          return {
            key: policyDef.resultKey,
            policy: null,
            error: errorMsg,
          };
        });
    });

    const policyResults = await Promise.all(policyPromises);

    // Map results to output
    policyResults.forEach((result) => {
      if (result.key === "readPolicy") {
        results.readPolicy = result.policy;
      } else if (result.key === "writePolicy") {
        results.writePolicy = result.policy;
      } else if (result.key === "submitPolicy") {
        results.submitPolicy = result.policy;
      }

      if (result.error) {
        errors.push(result.error);
      }
    });

    console.log(`[CollectionPermissions] Resource policy creation completed`, {
      readPolicy: !!results.readPolicy,
      writePolicy: !!results.writePolicy,
      submitPolicy: !!results.submitPolicy,
      errors: errors.length,
    });

    return results;
  } catch (error: any) {
    const errorMsg = `Failed to create resource policies: ${error.message}`;
    console.error(`[CollectionPermissions] ${errorMsg}`);
    errors.push(errorMsg);
    return results;
  }
};

/**
 * Create a resource policy linking a group to a resource with specific action
 */
export const createResourcePolicyForGroup = async (
  resourceId: string,
  groupId: string,
  action: string,
  policyType: string = "TYPE_SUBMISSION"
): Promise<ResourcePolicy | null> => {
  try {
    console.log(`[CollectionPermissions] Creating ${action} policy for group ${groupId} on resource ${resourceId}`);

    const response = await axiosInstance.post(
      `/api/authz/resourcepolicies?resource=${resourceId}&group=${groupId}`,
      {
        action,
        policyType,
      }
    );

    if (response.status === 201 || response.status === 200) {
      console.log(`[CollectionPermissions] ${action} policy created successfully`);
      return response.data as ResourcePolicy;
    }

    return null;
  } catch (error: any) {
    console.error(`[CollectionPermissions] Failed to create resource policy:`, error);
    throw error;
  }
};

/**
 * Create a resource policy linking an individual user to a resource
 */
export const createResourcePolicyForUser = async (
  resourceId: string,
  userId: string,
  action: string,
  policyType: string = "TYPE_CUSTOM"
): Promise<ResourcePolicy | null> => {
  try {
    console.log(
      `[CollectionPermissions] Creating ${action} policy for user ${userId} on resource ${resourceId}`
    );

    const response = await axiosInstance.post(
      `/api/authz/resourcepolicies?resource=${resourceId}&eperson=${userId}`,
      {
        action,
        policyType,
      }
    );

    if (response.status === 201 || response.status === 200) {
      console.log(`[CollectionPermissions] ${action} policy for user created successfully`);
      return response.data as ResourcePolicy;
    }

    return null;
  } catch (error: any) {
    console.error(`[CollectionPermissions] Failed to create user resource policy:`, error);
    throw error;
  }
};

/**
 * Fetch all resource policies for a collection
 */
export const getCollectionResourcePolicies = async (
  collectionId: string
): Promise<ResourcePolicy[]> => {
  try {
    console.log(`[CollectionPermissions] Fetching resource policies for collection ${collectionId}`);

    const response = await axiosInstance.get(
      `/api/authz/resourcepolicies/search/resource?uuid=${collectionId}&embed=eperson&embed=group`
    );

    const policies = response.data._embedded?.resourcepolicies || [];
    console.log(`[CollectionPermissions] Found ${policies.length} resource policies`);

    return policies as ResourcePolicy[];
  } catch (error: any) {
    console.error(`[CollectionPermissions] Failed to fetch resource policies:`, error);
    return [];
  }
};

/**
 * Update a resource policy
 */
export const updateResourcePolicy = async (
  policyId: string,
  action?: string,
  groupId?: string
): Promise<boolean> => {
  try {
    const operations = [];

    if (action) {
      operations.push({
        op: "replace",
        path: "/action",
        value: action,
      });
    }

    if (operations.length === 0) {
      return true; // No updates needed
    }

    const response = await axiosInstance.patch(
      `/api/authz/resourcepolicies/${policyId}`,
      operations
    );

    console.log(`[CollectionPermissions] Resource policy ${policyId} updated successfully`);
    return response.status === 200 || response.status === 204;
  } catch (error: any) {
    console.error(`[CollectionPermissions] Failed to update resource policy:`, error);
    throw error;
  }
};

/**
 * Delete a resource policy
 */
export const deleteResourcePolicy = async (policyId: string): Promise<boolean> => {
  try {
    console.log(`[CollectionPermissions] Deleting resource policy ${policyId}`);

    const response = await axiosInstance.delete(
      `/api/authz/resourcepolicies/${policyId}`
    );

    console.log(`[CollectionPermissions] Resource policy deleted successfully`);
    return response.status === 204 || response.status === 200;
  } catch (error: any) {
    console.error(`[CollectionPermissions] Failed to delete resource policy:`, error);
    throw error;
  }
};

/**
 * Complete setup for collection permissions
 * 1. Creates three default groups
 * 2. Creates resource policies linking groups to actions
 * 3. Logs all operations and errors
 */
export const setupCollectionPermissions = async (
  collectionId: string,
  collectionName: string,
  collectionDescription?: string
): Promise<{
  success: boolean;
  groupIds: {
    readGroupId?: string;
    adminGroupId?: string;
    uploadGroupId?: string;
  };
  policyIds: {
    readPolicyId?: string;
    writePolicyId?: string;
    submitPolicyId?: string;
  };
  errors: string[];
}> => {
  const result = {
    success: true,
    groupIds: {} as any,
    policyIds: {} as any,
    errors: [] as string[],
  };

  try {
    console.log(`[CollectionPermissions] Setting up permissions for collection: ${collectionName}`);

    // Step 1: Create groups
    const groupResults = await createCollectionPermissionGroups(
      collectionId,
      collectionName,
      collectionDescription
    );

    result.errors.push(...groupResults.errors);

    if (!groupResults.readGroup || !groupResults.adminGroup || !groupResults.uploadGroup) {
      result.success = false;
      result.errors.push("Failed to create one or more permission groups");
      return result;
    }

    // Store group IDs
    result.groupIds = {
      readGroupId: groupResults.readGroup.id || groupResults.readGroup.uuid,
      adminGroupId: groupResults.adminGroup.id || groupResults.adminGroup.uuid,
      uploadGroupId: groupResults.uploadGroup.id || groupResults.uploadGroup.uuid,
    };

    console.log(`[CollectionPermissions] Permission groups created successfully`, result.groupIds);

    // Step 2: Create resource policies
    const policyResults = await createDefaultResourcePolicies(collectionId, result.groupIds);

    result.errors.push(...policyResults.errors);

    if (!policyResults.readPolicy || !policyResults.writePolicy || !policyResults.submitPolicy) {
      result.success = false;
      result.errors.push("Failed to create one or more resource policies");
      return result;
    }

    // Store policy IDs
    result.policyIds = {
      readPolicyId: policyResults.readPolicy.id || policyResults.readPolicy.uuid,
      writePolicyId: policyResults.writePolicy.id || policyResults.writePolicy.uuid,
      submitPolicyId: policyResults.submitPolicy.id || policyResults.submitPolicy.uuid,
    };

    console.log(
      `[CollectionPermissions] Resource policies created successfully`,
      result.policyIds
    );

    console.log(`[CollectionPermissions] Collection permissions setup completed successfully`);
  } catch (error: any) {
    result.success = false;
    const errorMsg = `Collection permissions setup failed: ${error.message}`;
    result.errors.push(errorMsg);
    console.error(`[CollectionPermissions] ${errorMsg}`);
  }

  return result;
};
