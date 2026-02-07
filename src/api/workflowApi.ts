/**
 * Workflow API
 * Handles workflow items, workspace items, and submissions
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";

export interface WorkspaceItem {
  id: string;
  type: string;
  sections?: Record<string, any>;
  item?: {
    id: string;
    uuid: string;
    name: string;
    metadata: Record<string, Array<{ value: string }>>;
  };
  collection?: {
    id: string;
    name: string;
  };
}

export interface WorkflowItem {
  id: string;
  type: string;
  action?: string;
  owner?: {
    id: string;
    email: string;
  };
  item?: {
    id: string;
    uuid: string;
    name: string;
    metadata: Record<string, Array<{ value: string }>>;
  };
  workflowitem?: {
    id: string;
    name?: string;
  };
  submitter?: {
    id: string;
    email: string;
  };
}

/**
 * Create a new workspace item (start submission)
 */
export const createWorkspaceItem = async (
  collectionId: string
): Promise<WorkspaceItem | null> => {
  try {
    const response = await axiosInstance.post(
      `/api/submission/workspaceitems?embed=item,sections,collection&owningCollection=${collectionId}`,
      {}
    );
    
    return {
      id: response.data.id,
      type: response.data.type,
      sections: response.data.sections,
      item: response.data._embedded?.item,
      collection: response.data._embedded?.collection,
    };
  } catch (error) {
    console.error("Create workspace item error:", error);
    return null;
  }
};

/**
 * Update workspace item metadata
 */
export const updateWorkspaceItemMetadata = async (
  workspaceItemId: string,
  operations: Array<{
    op: "add" | "replace" | "remove";
    path: string;
    value?: any;
  }>
): Promise<boolean> => {
  try {
    await axiosInstance.patch(
      `/api/submission/workspaceitems/${workspaceItemId}?embed=item`,
      operations
    );
    return true;
  } catch (error) {
    console.error("Update workspace item error:", error);
    return false;
  }
};

/**
 * Add license to workspace item
 */
export const addLicenseToWorkspaceItem = async (
  workspaceItemId: string
): Promise<boolean> => {
  try {
    await axiosInstance.patch(
      `/api/submission/workspaceitems/${workspaceItemId}?embed=item`,
      [
        {
          op: "add",
          path: "/sections/license/granted",
          value: "true",
        },
      ]
    );
    return true;
  } catch (error) {
    console.error("Add license error:", error);
    return false;
  }
};

/**
 * Upload file to workspace item
 */
export const uploadFileToWorkspaceItem = async (
  workspaceItemId: string,
  file: File
): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    await axiosInstance.post(
      `/api/submission/workspaceitems/${workspaceItemId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return true;
  } catch (error) {
    console.error("Upload file to workspace item error:", error);
    return false;
  }
};

/**
 * Submit workspace item to workflow
 */
export const submitToWorkflow = async (
  workspaceItemId: string
): Promise<boolean> => {
  try {
    await axiosInstance.post(
      "/api/workflow/workflowitems?embed=item,sections,collection",
      `${siteConfig.apiEndpoint}/api/submission/workspaceitems/${workspaceItemId}`,
      {
        headers: {
          "Content-Type": "text/uri-list",
        },
      }
    );
    return true;
  } catch (error) {
    console.error("Submit to workflow error:", error);
    return false;
  }
};

/**
 * Delete workspace item
 */
export const deleteWorkspaceItem = async (
  workspaceItemId: string
): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/submission/workspaceitems/${workspaceItemId}`);
    return true;
  } catch (error) {
    console.error("Delete workspace item error:", error);
    return false;
  }
};

/**
 * Fetch workflow items
 */
export const fetchWorkflowItems = async (
  page = 0,
  size = 20
): Promise<{ items: WorkflowItem[]; page: any }> => {
  try {
    const response = await axiosInstance.get(
      `/api/workflow/workflowitems?page=${page}&size=${size}`
    );
    
    const items = response.data._embedded?.workflowitems || [];
    
    return {
      items: items.map((item: any) => ({
        id: item.id,
        type: item.type,
        item: item._embedded?.item,
        submitter: item._embedded?.submitter,
      })),
      page: response.data.page || {
        size,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
    };
  } catch (error) {
    console.error("Fetch workflow items error:", error);
    return {
      items: [],
      page: { size, totalElements: 0, totalPages: 0, number: 0 },
    };
  }
};

/**
 * Claim workflow task
 */
export const claimWorkflowTask = async (
  workflowItemId: string
): Promise<boolean> => {
  try {
    await axiosInstance.post(
      "/api/workflow/claimedtasks",
      `${siteConfig.apiEndpoint}/api/workflow/workflowitems/${workflowItemId}`,
      {
        headers: {
          "Content-Type": "text/uri-list",
        },
      }
    );
    return true;
  } catch (error) {
    console.error("Claim workflow task error:", error);
    return false;
  }
};

/**
 * Approve workflow item
 */
export const approveWorkflowItem = async (
  taskId: string,
  comment?: string
): Promise<boolean> => {
  try {
    await axiosInstance.post(
      `/api/workflow/claimedtasks/${taskId}?submit_approve=true`,
      { comment: comment || "" }
    );
    return true;
  } catch (error) {
    console.error("Approve workflow item error:", error);
    return false;
  }
};

/**
 * Reject workflow item
 */
export const rejectWorkflowItem = async (
  taskId: string,
  reason: string
): Promise<boolean> => {
  try {
    await axiosInstance.post(
      `/api/workflow/claimedtasks/${taskId}?submit_reject=true`,
      { reason }
    );
    return true;
  } catch (error) {
    console.error("Reject workflow item error:", error);
    return false;
  }
};

/**
 * Get workspace item with embedded item
 */
export const getWorkspaceItemWithItem = async (
  workspaceItemId: string
): Promise<WorkspaceItem | null> => {
  try {
    const response = await axiosInstance.get(
      `/api/submission/workspaceitems/${workspaceItemId}?embed=item`
    );
    
    return {
      id: response.data.id,
      type: response.data.type,
      sections: response.data.sections,
      item: response.data._embedded?.item,
      collection: response.data._embedded?.collection,
    };
  } catch (error) {
    console.error("Get workspace item error:", error);
    return null;
  }
};

/**
 * Fetch pooled workflow tasks (tasks available for claiming)
 * Note: DSpace 7+ may not have a direct pooleditems endpoint
 * Alternative: Use workflowitems with filters
 */
export const fetchPooledTasks = async (): Promise<WorkflowItem[]> => {
  try {
    // Try the standard workflowitems endpoint first
    const response = await axiosInstance.get(
      `/api/workflow/workflowitems`
    );
    
    const items = response.data._embedded?.workflowitems || [];
    // Filter for unclaimed items (pooled)
    return items
      .filter((item: any) => !item.owner)
      .map((item: any) => ({
        id: item.id,
        type: item.type,
        item: item._embedded?.item,
        submitter: item._embedded?.submitter,
      }));
  } catch (error) {
    console.error("Fetch pooled tasks error:", error);
    // Return empty array on error to prevent breaking the UI
    return [];
  }
};

/**
 * Fetch claimed workflow tasks (tasks assigned to current user)
 */
export const fetchClaimedTasks = async (): Promise<WorkflowItem[]> => {
  try {
    // Try the standard workflowitems endpoint
    const response = await axiosInstance.get(
      `/api/workflow/workflowitems`
    );
    
    const items = response.data._embedded?.workflowitems || [];
    // Filter for claimed items (has owner)
    return items
      .filter((item: any) => item.owner)
      .map((item: any) => ({
        id: item.id,
        type: item.type,
        item: item._embedded?.item,
        submitter: item._embedded?.submitter,
        owner: item.owner,
      }));
  } catch (error) {
    console.error("Fetch claimed tasks error:", error);
    return [];
  }
};

