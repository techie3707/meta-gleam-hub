/**
 * Workspace Item API
 * Handles workspace item creation, submission workflow, and form config fetching
 */

import axiosInstance from "./axiosInstance";
import type { WorkspaceItemWithDefinition, SubmissionFormConfig } from "@/types/submission";

export interface WorkspaceItem {
  id: string;
  lastModified?: string;
  sections?: Record<string, any>;
  _embedded?: {
    item?: {
      id: string;
      uuid: string;
      name: string;
      handle?: string;
      metadata: Record<string, any>;
    };
    collection?: {
      id: string;
      name: string;
    };
    submitter?: {
      id: string;
      email: string;
    };
  };
  _links?: {
    self?: { href: string };
    item?: { href: string };
    submissionDefinition?: { href: string };
  };
}

/**
 * Create a new workspace item AND return the full response
 * including the embedded submissionDefinition with sections/config links.
 *
 * POST /api/submission/workspaceitems?embed=item,sections,collection&owningCollection={collectionId}
 */
export const createWorkspaceItemWithDefinition = async (
  collectionId: string
): Promise<WorkspaceItemWithDefinition> => {
  try {
    const response = await axiosInstance.post(
      `/api/submission/workspaceitems?embed=item,sections,collection&owningCollection=${collectionId}`,
      {}
    );
    return response.data;
  } catch (error) {
    console.error("Create workspace item with definition error:", error);
    throw error;
  }
};

/**
 * Fetch submission form configuration
 * GET /api/config/submissionforms/{formId}
 *
 * Accepts either a full URL (extracts pathname) or a relative path.
 */
export const fetchSubmissionFormConfig = async (
  configUrl: string
): Promise<SubmissionFormConfig> => {
  try {
    let path = configUrl;
    // If the URL is absolute, extract just the pathname
    if (configUrl.startsWith("http")) {
      const url = new URL(configUrl);
      path = url.pathname;
      
      // Remove /server prefix if present since baseURL already includes it
      if (path.startsWith("/server/")) {
        path = path.replace("/server/", "/");
      }
    }
    const response = await axiosInstance.get(path);
    return response.data;
  } catch (error) {
    console.error("Fetch submission form config error:", error);
    throw error;
  }
};

/**
 * Update workspace item metadata via JSON Patch
 * PATCH /api/submission/workspaceitems/{itemId}?embed=item
 */
export const updateWorkspaceItemMetadata = async (
  workspaceItemId: string,
  operations: Array<{
    op: string;
    path: string;
    value?: any;
  }>
): Promise<WorkspaceItem> => {
  try {
    const response = await axiosInstance.patch(
      `/api/submission/workspaceitems/${workspaceItemId}?embed=item`,
      operations
    );
    return response.data;
  } catch (error) {
    console.error("Update workspace item metadata error:", error);
    throw error;
  }
};

/**
 * Grant license on workspace item
 * PATCH /api/submission/workspaceitems/{itemId}
 */
export const grantLicense = async (workspaceItemId: string): Promise<boolean> => {
  try {
    await axiosInstance.patch(
      `/api/submission/workspaceitems/${workspaceItemId}`,
      [{ op: "add", path: "/sections/license/granted", value: "true" }]
    );
    return true;
  } catch (error) {
    console.error("Grant license error:", error);
    return false;
  }
};

/**
 * Upload file to workspace item
 * POST /api/submission/workspaceitems/{itemId}
 */
export const uploadToWorkspaceItem = async (
  workspaceItemId: string,
  file: File
): Promise<{ success: boolean; data?: any }> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosInstance.post(
      `/api/submission/workspaceitems/${workspaceItemId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Upload to workspace item error:", error);
    throw error;
  }
};

/**
 * Submit workspace item to workflow
 * POST /api/workflow/workflowitems?embed=item,sections,collection
 * Body: URI of the workspace item (text/uri-list)
 */
export const submitToWorkflow = async (workspaceItemId: string): Promise<boolean> => {
  try {
    const baseUrl = axiosInstance.defaults.baseURL || "";
    await axiosInstance.post(
      "/api/workflow/workflowitems?embed=item,sections,collection",
      `${baseUrl}/api/submission/workspaceitems/${workspaceItemId}`,
      { headers: { "Content-Type": "text/uri-list" } }
    );
    return true;
  } catch (error) {
    console.error("Submit to workflow error:", error);
    throw error;
  }
};

/**
 * Get workspace item by ID
 */
export const getWorkspaceItem = async (
  workspaceItemId: string
): Promise<WorkspaceItem | null> => {
  try {
    const response = await axiosInstance.get(
      `/api/submission/workspaceitems/${workspaceItemId}?embed=item,collection`
    );
    return response.data;
  } catch (error) {
    console.error("Get workspace item error:", error);
    return null;
  }
};

/**
 * Delete workspace item
 */
export const deleteWorkspaceItem = async (workspaceItemId: string): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/submission/workspaceitems/${workspaceItemId}`);
    return true;
  } catch (error) {
    console.error("Delete workspace item error:", error);
    return false;
  }
};

/**
 * Get user's workspace items
 */
export const getMyWorkspaceItems = async (
  page: number = 0,
  size: number = 20
): Promise<{
  items: WorkspaceItem[];
  page: { size: number; totalElements: number; totalPages: number; number: number };
}> => {
  try {
    const response = await axiosInstance.get(
      `/api/submission/workspaceitems?embed=item,collection&page=${page}&size=${size}`
    );
    const items = response.data._embedded?.workspaceitems || [];
    const pageData = response.data.page || {
      size,
      totalElements: items.length,
      totalPages: 1,
      number: page,
    };
    return { items, page: pageData };
  } catch (error) {
    console.error("Get my workspace items error:", error);
    throw error;
  }
};
