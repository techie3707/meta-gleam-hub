/**
 * Report API
 * Handles reporting and analytics endpoints
 */

import axiosInstance from "./axiosInstance";

export interface CommunityReport {
  name: string;
  itemCount: number;
  collections: Array<{
    name: string;
    itemCount: number;
  }>;
}

export interface ItemReportResponse {
  communities: CommunityReport[];
}

/**
 * Fetch community item report
 */
export const fetchCommunityItemReport = async (): Promise<ItemReportResponse> => {
  try {
    const response = await axiosInstance.get("/api/report/community");

    return {
      communities: response.data.communities || [],
    };
  } catch (error) {
    console.error("Fetch community item report error:", error);
    throw error;
  }
};

/**
 * Get collection statistics
 */
export const fetchCollectionStatistics = async (
  collectionId: string
): Promise<{ itemCount: number; downloadCount?: number }> => {
  try {
    // This would typically fetch from a statistics endpoint
    // Placeholder implementation
    const response = await axiosInstance.get(
      `/api/core/collections/${collectionId}`
    );

    return {
      itemCount: 0, // Would come from stats endpoint
      downloadCount: 0,
    };
  } catch (error) {
    console.error("Fetch collection statistics error:", error);
    throw error;
  }
};

/**
 * Get user activity report
 */
export const fetchUserActivityReport = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<any> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await axiosInstance.get(
      `/api/report/user/${userId}/activity?${params.toString()}`
    );

    return response.data;
  } catch (error) {
    console.error("Fetch user activity report error:", error);
    throw error;
  }
};

/**
 * Get download statistics
 */
export const fetchDownloadStatistics = async (
  itemId: string
): Promise<{ totalDownloads: number; downloadsByBitstream: Record<string, number> }> => {
  try {
    const response = await axiosInstance.get(
      `/api/statistics/items/${itemId}/downloads`
    );

    return {
      totalDownloads: response.data.totalDownloads || 0,
      downloadsByBitstream: response.data.downloadsByBitstream || {},
    };
  } catch (error) {
    console.error("Fetch download statistics error:", error);
    return {
      totalDownloads: 0,
      downloadsByBitstream: {},
    };
  }
};
