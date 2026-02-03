/**
 * Statistics & Usage Reports API
 * DSpace analytics and usage tracking
 */

import axiosInstance from "./axiosInstance";

export interface UsageReport {
  id: string;
  type: string;
  "report-type": string;
  points: Array<{
    id: string;
    label: string;
    type: string;
    values: Record<string, number>;
  }>;
  _links?: {
    self?: { href: string };
  };
}

export interface UsageReportListResponse {
  _embedded?: {
    usagereports: UsageReport[];
  };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export interface ViewEventRequest {
  targetId: string;
  targetType: string;
  referrer?: string;
}

export interface SearchEventRequest {
  query: string;
  scope?: string;
  resultCount?: number;
}

/**
 * Get statistics support information
 */
export const fetchStatisticsInfo = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get("/api/statistics");
    return response.data;
  } catch (error) {
    console.error("Fetch statistics info error:", error);
    throw error;
  }
};

/**
 * Get usage report by ID
 */
export const fetchUsageReportById = async (
  uuid: string,
  reportId: string
): Promise<UsageReport> => {
  try {
    const response = await axiosInstance.get(
      `/api/statistics/usagereports/${uuid}_${reportId}`
    );
    return response.data;
  } catch (error) {
    console.error("Fetch usage report error:", error);
    throw error;
  }
};

/**
 * Search usage reports by object URI
 */
export const fetchUsageReportsByObject = async (
  objectUri: string
): Promise<UsageReportListResponse> => {
  try {
    const response = await axiosInstance.get(
      "/api/statistics/usagereports/search/object",
      {
        params: { uri: objectUri },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Fetch usage reports by object error:", error);
    throw error;
  }
};

/**
 * Post view event for statistics tracking
 */
export const recordViewEvent = async (
  event: ViewEventRequest
): Promise<boolean> => {
  try {
    await axiosInstance.post("/api/statistics/viewevents", event);
    return true;
  } catch (error) {
    console.error("Record view event error:", error);
    return false;
  }
};

/**
 * Post search event for analytics
 */
export const recordSearchEvent = async (
  event: SearchEventRequest
): Promise<boolean> => {
  try {
    await axiosInstance.post("/api/statistics/searchevents", event);
    return true;
  } catch (error) {
    console.error("Record search event error:", error);
    return false;
  }
};

/**
 * Get total visits for an item/collection/community
 */
export const fetchTotalVisits = async (uuid: string): Promise<number> => {
  try {
    const report = await fetchUsageReportById(uuid, "TotalVisits");
    const totalViews = report.points?.reduce(
      (sum, point) => sum + (point.values?.views || 0),
      0
    );
    return totalViews || 0;
  } catch (error) {
    console.error("Fetch total visits error:", error);
    return 0;
  }
};

/**
 * Get total downloads for an item/bitstream
 */
export const fetchTotalDownloads = async (uuid: string): Promise<number> => {
  try {
    const report = await fetchUsageReportById(uuid, "TotalDownloads");
    const totalDownloads = report.points?.reduce(
      (sum, point) => sum + (point.values?.downloads || 0),
      0
    );
    return totalDownloads || 0;
  } catch (error) {
    console.error("Fetch total downloads error:", error);
    return 0;
  }
};

/**
 * Get monthly visit trends
 */
export const fetchMonthlyVisits = async (
  uuid: string
): Promise<Array<{ month: string; visits: number }>> => {
  try {
    const report = await fetchUsageReportById(uuid, "TotalVisitsPerMonth");
    return (
      report.points?.map((point) => ({
        month: point.label,
        visits: point.values?.views || 0,
      })) || []
    );
  } catch (error) {
    console.error("Fetch monthly visits error:", error);
    return [];
  }
};

/**
 * Get top countries
 */
export const fetchTopCountries = async (
  uuid: string
): Promise<Array<{ country: string; count: number }>> => {
  try {
    const report = await fetchUsageReportById(uuid, "TopCountries");
    return (
      report.points?.map((point) => ({
        country: point.label,
        count: point.values?.views || 0,
      })) || []
    );
  } catch (error) {
    console.error("Fetch top countries error:", error);
    return [];
  }
};
