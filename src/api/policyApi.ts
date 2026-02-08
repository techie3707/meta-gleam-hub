/**
 * Policy API
 * Handles resource policy operations
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";

export interface Policy {
  id: string;
  name: string | null;
  description: string | null;
  policyType: string;
  action: string;
  startDate: string | null;
  endDate: string | null;
  type: string;
  _embedded?: {
    eperson?: {
      uuid: string;
      email: string;
      metadata: {
        "eperson.firstname": [{ value: string }];
        "eperson.lastname": [{ value: string }];
      };
    };
    group?: {
      uuid: string;
      name: string;
      permanent: boolean;
    };
  };
  _links?: {
    self: { href: string };
    resource?: { href: string };
    eperson?: { href: string };
    group?: { href: string };
  };
}

export interface ResourcePolicyResponse {
  _embedded: {
    resourcepolicies: Policy[];
  };
  _links: {
    self: { href: string };
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export interface ResourcePolicyData {
  name?: string | null;
  description?: string | null;
  policyType: string;
  action: string;
  startDate?: string | null;
  endDate?: string | null;
  type: {
    value: string;
  };
}

/**
 * Get resource policies for a specific resource
 * GET /api/authz/resourcepolicies/search/resource
 */
export const getResourcePolicies = async (
  resourceUuid: string
): Promise<ResourcePolicyResponse> => {
  const response = await axiosInstance.get<ResourcePolicyResponse>(
    `/api/authz/resourcepolicies/search/resource?uuid=${resourceUuid}&embed=eperson&embed=group`
  );
  return response.data;
};

/**
 * Create resource policy for EPerson
 * POST /api/authz/resourcepolicies
 */
export const createResourcePolicyForEPerson = async (
  resourceUuid: string,
  epersonUuid: string,
  policyData: ResourcePolicyData
): Promise<Policy> => {
  const response = await axiosInstance.post<Policy>(
    `/api/authz/resourcepolicies?resource=${resourceUuid}&eperson=${epersonUuid}`,
    policyData
  );
  return response.data;
};

/**
 * Create resource policy for Group
 * POST /api/authz/resourcepolicies
 */
export const createResourcePolicyForGroup = async (
  resourceUuid: string,
  groupUuid: string,
  policyData: ResourcePolicyData
): Promise<Policy> => {
  const response = await axiosInstance.post<Policy>(
    `/api/authz/resourcepolicies?resource=${resourceUuid}&group=${groupUuid}`,
    policyData
  );
  return response.data;
};

/**
 * Update resource policy group
 * PUT /api/authz/resourcepolicies/{policyId}/group
 */
export const updateResourcePolicyGroup = async (
  policyId: string,
  groupUuid: string
): Promise<void> => {
  await axiosInstance.put(
    `/api/authz/resourcepolicies/${policyId}/group`,
    `${siteConfig.apiEndpoint}/api/eperson/groups/${groupUuid}`,
    {
      headers: {
        "Content-Type": "text/uri-list",
      },
    }
  );
};

/**
 * Update resource policy metadata
 * PATCH /api/authz/resourcepolicies/{policyId}
 */
export const updateResourcePolicyMetadata = async (
  policyId: string,
  data: Partial<ResourcePolicyData>
): Promise<Policy> => {
  const patchOperations = [];

  if (data.action) {
    patchOperations.push({
      op: "replace",
      path: "/action",
      value: data.action,
    });
  }

  if (data.policyType) {
    patchOperations.push({
      op: "replace",
      path: "/policyType",
      value: data.policyType,
    });
  }

  const response = await axiosInstance.patch<Policy>(
    `/api/authz/resourcepolicies/${policyId}`,
    patchOperations
  );
  return response.data;
};

/**
 * Delete resource policy
 * DELETE /api/authz/resourcepolicies/{policyId}
 */
export const deleteResourcePolicy = async (policyId: string): Promise<void> => {
  await axiosInstance.delete(`/api/authz/resourcepolicies/${policyId}`);
};

/**
 * Policy type options
 */
export const POLICY_TYPES = [
  { id: "TYPE_SUBMISSION", label: "Submission" },
  { id: "TYPE_WORKFLOW", label: "Workflow" },
  { id: "TYPE_INHERITED", label: "Inherited" },
  { id: "TYPE_CUSTOM", label: "Custom" },
] as const;

/**
 * Action type options
 */
export const ACTION_TYPES = [
  { id: "READ", label: "Read" },
  { id: "WRITE", label: "Write" },
  { id: "REMOVE", label: "Remove" },
  { id: "ADMIN", label: "Admin" },
  { id: "DELETE", label: "Delete" },
  { id: "WITHDRAWN_READ", label: "Withdrawn Read" },
  { id: "DEFAULT_BITSTREAM_READ", label: "Default Bitstream Read" },
  { id: "DEFAULT_ITEM_READ", label: "Default Item Read" },
] as const;
