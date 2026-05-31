// API integration for assigning workflow roles to collections
import axiosInstance from './axiosInstance';

export interface Group {
  id: string;
  uuid: string;
  name: string;
  metadata?: {
    'dc.description'?: Array<{
      value: string;
      language: null;
      authority: null;
      confidence: number;
      place: number;
    }>;
  };
  _links?: {
    self: {
      href: string;
    };
  };
}

export type RoleType = 'submitter' | 'reviewer' | 'editor' | 'finalEditor';

// ============= SUBMITTER ROLE ENDPOINTS =============

export const fetchSubmitterGroup = async (collectionId: string): Promise<Group | null> => {
  try {
    const response = await axiosInstance.get(`/api/core/collections/${collectionId}/submittersGroup`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error fetching submitter group:', error);
    throw error;
  }
};

export const createSubmitterGroup = async (
  collectionId: string,
  description: string
): Promise<Group> => {
  try {
    const response = await axiosInstance.post(
      `/api/core/collections/${collectionId}/submittersGroup`,
      {
        metadata: {
          'dc.description': [{ value: description }],
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error creating submitter group:', error);
    throw error;
  }
};

export const deleteSubmitterGroup = async (collectionId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/core/collections/${collectionId}/submittersGroup`);
  } catch (error: any) {
    console.error('Error deleting submitter group:', error);
    throw error;
  }
};

// ============= REVIEWER ROLE ENDPOINTS =============

export const fetchReviewerGroup = async (collectionId: string): Promise<Group | null> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/collections/${collectionId}/workflowGroups/reviewer`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error fetching reviewer group:', error);
    throw error;
  }
};

export const createReviewerGroup = async (
  collectionId: string,
  description: string
): Promise<Group> => {
  try {
    const response = await axiosInstance.post(
      `/api/core/collections/${collectionId}/workflowGroups/reviewer`,
      {
        metadata: {
          'dc.description': [{ value: description }],
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error creating reviewer group:', error);
    throw error;
  }
};

export const deleteReviewerGroup = async (collectionId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/core/collections/${collectionId}/workflowGroups/reviewer`);
  } catch (error: any) {
    console.error('Error deleting reviewer group:', error);
    throw error;
  }
};

// ============= EDITOR ROLE ENDPOINTS =============

export const fetchEditorGroup = async (collectionId: string): Promise<Group | null> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/collections/${collectionId}/workflowGroups/editor`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error fetching editor group:', error);
    throw error;
  }
};

export const createEditorGroup = async (
  collectionId: string,
  description: string
): Promise<Group> => {
  try {
    const response = await axiosInstance.post(
      `/api/core/collections/${collectionId}/workflowGroups/editor`,
      {
        metadata: {
          'dc.description': [{ value: description }],
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error creating editor group:', error);
    throw error;
  }
};

export const deleteEditorGroup = async (collectionId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/core/collections/${collectionId}/workflowGroups/editor`);
  } catch (error: any) {
    console.error('Error deleting editor group:', error);
    throw error;
  }
};

// ============= FINAL EDITOR ROLE ENDPOINTS =============

export const fetchFinalEditorGroup = async (collectionId: string): Promise<Group | null> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/collections/${collectionId}/workflowGroups/finaleditor`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error fetching final editor group:', error);
    throw error;
  }
};

export const createFinalEditorGroup = async (
  collectionId: string,
  description: string
): Promise<Group> => {
  try {
    const response = await axiosInstance.post(
      `/api/core/collections/${collectionId}/workflowGroups/finaleditor`,
      {
        metadata: {
          'dc.description': [{ value: description }],
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error creating final editor group:', error);
    throw error;
  }
};

export const deleteFinalEditorGroup = async (collectionId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/core/collections/${collectionId}/workflowGroups/finaleditor`);
  } catch (error: any) {
    console.error('Error deleting final editor group:', error);
    throw error;
  }
};

// ============= UTILITY FUNCTIONS =============

/**
 * Fetch all roles for a collection
 */
export const fetchAllRoles = async (collectionId: string) => {
  const results = await Promise.allSettled([
    fetchSubmitterGroup(collectionId),
    fetchReviewerGroup(collectionId),
    fetchEditorGroup(collectionId),
    fetchFinalEditorGroup(collectionId),
  ]);

  return {
    submitter: results[0].status === 'fulfilled' ? results[0].value : null,
    reviewer: results[1].status === 'fulfilled' ? results[1].value : null,
    editor: results[2].status === 'fulfilled' ? results[2].value : null,
    finalEditor: results[3].status === 'fulfilled' ? results[3].value : null,
  };
};

/**
 * Create all default roles for a collection
 */
export const createAllDefaultRoles = async (collectionId: string) => {
  const results = await Promise.allSettled([
    createSubmitterGroup(collectionId, 'Submitter Group'),
    createReviewerGroup(collectionId, 'Reviewer Group'),
    createEditorGroup(collectionId, 'Editor Group'),
    createFinalEditorGroup(collectionId, 'Final Editor Group'),
  ]);

  return {
    submitter: results[0].status === 'fulfilled' ? results[0].value : null,
    reviewer: results[1].status === 'fulfilled' ? results[1].value : null,
    editor: results[2].status === 'fulfilled' ? results[2].value : null,
    finalEditor: results[3].status === 'fulfilled' ? results[3].value : null,
  };
};
