/**
 * Resource Policy API
 * Handles access control and resource policies
 */

import axiosInstance from "./axiosInstance";

export interface ResourcePolicy {
  id: string;
  name: string;
  description?: string;
  policyType: "TYPE_SUBMISSION" | "TYPE_WORKFLOW" | "TYPE_CUSTOM" | "TYPE_INHERITED";
  action: "READ" | "WRITE" | "DELETE" | "ADMIN" | "ADD" | "REMOVE";
  startDate?: string;
  endDate?: string;
  epersonId?: string;
  groupId?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface ResourcePolicyListResponse {
  policies: ResourcePolicy[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Fetch resource policies for an object
 */
export const fetchResourcePolicies = async (
  resourceType: "item" | "collection" | "community" | "bitstream",
  resourceId: string,
  page: number = 0,
  size: number = 20
): Promise<ResourcePolicyListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/authz/resourcepolicies/search/resource?uuid=${resourceId}&resource=${resourceType}&page=${page}&size=${size}`
    );

    const policies = response.data._embedded?.resourcepolicies || [];
    const pageData = response.data.page || {
      size: size,
      totalElements: policies.length,
      totalPages: 1,
      number: page,
    };

    return {
      policies: policies.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        policyType: p.policyType,
        action: p.action,
        startDate: p.startDate,
        endDate: p.endDate,
        epersonId: p._links?.eperson?.href?.split("/").pop(),
        groupId: p._links?.group?.href?.split("/").pop(),
        resourceType: p.resourceType,
        resourceId: p.resourceId,
      })),
      page: pageData,
    };
  } catch (error) {
    console.error("Fetch resource policies error:", error);
    throw error;
  }
};

/**
 * Create a new resource policy
 */
export const createResourcePolicy = async (
  resourceType: "item" | "collection" | "community" | "bitstream",
  resourceId: string,
  policy: {
    name: string;
    description?: string;
    action: ResourcePolicy["action"];
    groupId?: string;
    epersonId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<ResourcePolicy> => {
  try {
    // Create policy with the resource link
    const policyData = {
      name: policy.name,
      description: policy.description,
      action: policy.action,
      policyType: "TYPE_CUSTOM",
      startDate: policy.startDate,
      endDate: policy.endDate,
    };

    const response = await axiosInstance.post(
      `/api/authz/resourcepolicies?resource=${encodeURIComponent(
        `${axiosInstance.defaults.baseURL}/api/core/${resourceType}s/${resourceId}`
      )}`,
      policyData
    );

    const newPolicy: ResourcePolicy = {
      id: response.data.id,
      name: response.data.name,
      description: response.data.description,
      policyType: response.data.policyType,
      action: response.data.action,
      startDate: response.data.startDate,
      endDate: response.data.endDate,
    };

    // Link to group or eperson if specified
    if (policy.groupId) {
      await axiosInstance.put(
        `/api/authz/resourcepolicies/${newPolicy.id}/group`,
        `${axiosInstance.defaults.baseURL}/api/eperson/groups/${policy.groupId}`,
        {
          headers: { "Content-Type": "text/uri-list" },
        }
      );
      newPolicy.groupId = policy.groupId;
    }

    if (policy.epersonId) {
      await axiosInstance.put(
        `/api/authz/resourcepolicies/${newPolicy.id}/eperson`,
        `${axiosInstance.defaults.baseURL}/api/eperson/epersons/${policy.epersonId}`,
        {
          headers: { "Content-Type": "text/uri-list" },
        }
      );
      newPolicy.epersonId = policy.epersonId;
    }

    return newPolicy;
  } catch (error) {
    console.error("Create resource policy error:", error);
    throw error;
  }
};

/**
 * Delete a resource policy
 */
export const deleteResourcePolicy = async (policyId: string): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/authz/resourcepolicies/${policyId}`);
    return true;
  } catch (error) {
    console.error("Delete resource policy error:", error);
    return false;
  }
};

/**
 * Update a resource policy
 */
export const updateResourcePolicy = async (
  policyId: string,
  updates: {
    name?: string;
    description?: string;
    action?: ResourcePolicy["action"];
    startDate?: string;
    endDate?: string;
  }
): Promise<ResourcePolicy> => {
  try {
    const operations = Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => ({
        op: "replace",
        path: `/${key}`,
        value: value,
      }));

    const response = await axiosInstance.patch(
      `/api/authz/resourcepolicies/${policyId}`,
      operations
    );

    return {
      id: response.data.id,
      name: response.data.name,
      description: response.data.description,
      policyType: response.data.policyType,
      action: response.data.action,
      startDate: response.data.startDate,
      endDate: response.data.endDate,
    };
  } catch (error) {
    console.error("Update resource policy error:", error);
    throw error;
  }
};
