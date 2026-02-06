/**
 * Workspace Item API
 * Handles workspace item creation and submission workflow
 */

import axiosInstance from "./axiosInstance";
import { ItemMetadata } from "./itemApi";

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
      metadata: ItemMetadata;
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

export interface SubmissionFormConfig {
  rows: Array<{
    fields: Array<{
      "input-type": string;
      label: string;
      mandatory: boolean;
      repeatable: boolean;
      hints?: string;
      selectableMetadata?: Array<{
        metadata: string;
        label?: string;
        closed?: boolean;
      }>;
    }>;
  }>;
}

/**
 * Create a new workspace item
 * Per API docs: POST /api/submission/workspaceitems?embed=item,sections,collection&owningCollection={collectionId}
 */
export const createWorkspaceItem = async (
  collectionId: string
): Promise<WorkspaceItem> => {
  try {
    const response = await axiosInstance.post(
      `/api/submission/workspaceitems?embed=item,sections,collection&owningCollection=${collectionId}`,
      {}
    );

    return {
      id: response.data.id,
      lastModified: response.data.lastModified,
      sections: response.data.sections,
      _embedded: response.data._embedded,
      _links: response.data._links,
    };
  } catch (error) {
    console.error("Create workspace item error:", error);
    throw error;
  }
};

/**
 * Update workspace item metadata
 * Per API docs: PATCH /api/submission/workspaceitems/{itemId}?embed=item
 */
export const updateWorkspaceItemMetadata = async (
  workspaceItemId: string,
  fieldName: string,
  values: Array<{
    value: string;
    language?: string | null;
    authority?: string | null;
    confidence?: number;
    place?: number;
    otherInformation?: string | null;
  }>
): Promise<WorkspaceItem> => {
  try {
    const operations = [
      {
        op: "add",
        path: `/sections/traditionalpageone/${fieldName}`,
        value: values.map((v, index) => ({
          value: v.value,
          language: v.language || null,
          authority: v.authority || null,
          display: v.value,
          confidence: v.confidence ?? -1,
          place: v.place ?? index,
          otherInformation: v.otherInformation || null,
        })),
      },
    ];

    const response = await axiosInstance.patch(
      `/api/submission/workspaceitems/${workspaceItemId}?embed=item`,
      operations
    );

    return {
      id: response.data.id,
      lastModified: response.data.lastModified,
      sections: response.data.sections,
      _embedded: response.data._embedded,
      _links: response.data._links,
    };
  } catch (error) {
    console.error("Update workspace item metadata error:", error);
    throw error;
  }
};

/**
 * Add license to workspace item
 * Per API docs: PATCH /api/submission/workspaceitems/{itemId}?embed=item
 */
export const grantLicense = async (workspaceItemId: string): Promise<boolean> => {
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
    console.error("Grant license error:", error);
    return false;
  }
};

/**
 * Upload file to workspace item
 * Per API docs: POST /api/submission/workspaceitems/{itemId}
 */
export const uploadToWorkspaceItem = async (
  workspaceItemId: string,
  file: File
): Promise<{ success: boolean; workspaceItem?: WorkspaceItem }> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post(
      `/api/submission/workspaceitems/${workspaceItemId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return {
      success: true,
      workspaceItem: {
        id: response.data.id,
        lastModified: response.data.lastModified,
        _embedded: response.data._embedded,
        _links: response.data._links,
      },
    };
  } catch (error) {
    console.error("Upload to workspace item error:", error);
    throw error;
  }
};

/**
 * Submit workspace item to workflow
 * Per API docs: POST /api/workflow/workflowitems?embed=item,sections,collection
 */
export const submitToWorkflow = async (workspaceItemId: string): Promise<boolean> => {
  try {
    await axiosInstance.post(
      "/api/workflow/workflowitems?embed=item,sections,collection",
      `${axiosInstance.defaults.baseURL}/api/submission/workspaceitems/${workspaceItemId}`,
      {
        headers: {
          "Content-Type": "text/uri-list",
        },
      }
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

    return {
      id: response.data.id,
      lastModified: response.data.lastModified,
      sections: response.data.sections,
      _embedded: response.data._embedded,
      _links: response.data._links,
    };
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
 * Fetch submission form configuration
 */
export const fetchSubmissionFormConfig = async (
  configUrl: string
): Promise<SubmissionFormConfig | null> => {
  try {
    const response = await axiosInstance.get(configUrl);
    return response.data;
  } catch (error) {
    console.error("Fetch submission form config error:", error);
    return null;
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
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}> => {
  try {
    const response = await axiosInstance.get(
      `/api/submission/workspaceitems?embed=item,collection&page=${page}&size=${size}`
    );

    const items = response.data._embedded?.workspaceitems || [];
    const pageData = response.data.page || {
      size: size,
      totalElements: items.length,
      totalPages: 1,
      number: page,
    };

    return {
      items: items.map((item: any) => ({
        id: item.id,
        lastModified: item.lastModified,
        sections: item.sections,
        _embedded: item._embedded,
        _links: item._links,
      })),
      page: pageData,
    };
  } catch (error) {
    console.error("Get my workspace items error:", error);
    throw error;
  }
};
