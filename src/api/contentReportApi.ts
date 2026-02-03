/**
 * Content Reporting API
 * Content curation and quality management
 */

import axiosInstance from "./axiosInstance";

export interface CollectionStatistics {
  missingMetadataCount: number;
  embargoItemsCount: number;
  withdrawnItemsCount: number;
  privateItemsCount: number;
}

export interface FilteredCollection {
  uuid: string;
  name: string;
  handle: string;
  itemCount: number;
  statistics: CollectionStatistics;
}

export interface FilteredCollectionsResponse {
  type: string;
  collections: FilteredCollection[];
  totalCollections: number;
  totalItemsAffected: number;
}

export interface FilteredItem {
  uuid: string;
  handle: string;
  metadata: Record<string, any>;
  inArchive: boolean;
  withdrawn: boolean;
  discoverable: boolean;
  owningCollection?: {
    uuid: string;
    name: string;
  };
}

export interface FilteredItemsResponse {
  type: string;
  items: FilteredItem[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Available filter types for collections
 */
export type CollectionFilterType =
  | "missing_metadata"
  | "embargo_items"
  | "withdrawn_items"
  | "private_items";

/**
 * Get filtered collections report
 */
export const fetchFilteredCollections = async (
  filters?: CollectionFilterType[]
): Promise<FilteredCollectionsResponse> => {
  try {
    const params = new URLSearchParams();
    if (filters && filters.length > 0) {
      filters.forEach((filter) => params.append("filters", filter));
    }

    const response = await axiosInstance.get(
      `/api/contentreport/filteredcollections?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Fetch filtered collections error:", error);
    throw error;
  }
};

/**
 * Get filtered items report with predicates
 */
export const fetchFilteredItems = async (params: {
  collections?: string[];
  predicates?: string[];
  filters?: string[];
  additionalFields?: string[];
  pageNumber?: number;
  pageLimit?: number;
}): Promise<FilteredItemsResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (params.collections) {
      params.collections.forEach((c) => queryParams.append("collections", c));
    }
    if (params.predicates) {
      params.predicates.forEach((p) => queryParams.append("predicates", p));
    }
    if (params.filters) {
      params.filters.forEach((f) => queryParams.append("filters", f));
    }
    if (params.additionalFields) {
      params.additionalFields.forEach((f) =>
        queryParams.append("additionalFields", f)
      );
    }
    if (params.pageNumber !== undefined) {
      queryParams.append("pageNumber", params.pageNumber.toString());
    }
    if (params.pageLimit !== undefined) {
      queryParams.append("pageLimit", params.pageLimit.toString());
    }

    const response = await axiosInstance.get(
      `/api/contentreport/filtereditems?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Fetch filtered items error:", error);
    throw error;
  }
};

/**
 * Get items with missing metadata
 */
export const fetchItemsWithMissingMetadata = async (
  metadataFields: string[] = ["dc.title", "dc.contributor.author"],
  pageNumber: number = 0,
  pageLimit: number = 20
): Promise<FilteredItemsResponse> => {
  const predicates = metadataFields.map((field) => `${field}:missing`);
  return fetchFilteredItems({ predicates, pageNumber, pageLimit });
};

/**
 * Get collections with quality issues
 */
export const fetchCollectionsWithIssues = async (): Promise<
  FilteredCollectionsResponse
> => {
  return fetchFilteredCollections([
    "missing_metadata",
    "embargo_items",
    "withdrawn_items",
  ]);
};

/**
 * Get total items with issues across all collections
 */
export const fetchContentQualitySummary = async (): Promise<{
  totalCollections: number;
  collectionsWithIssues: number;
  totalItemsWithIssues: number;
  issueBreakdown: {
    missingMetadata: number;
    embargoed: number;
    withdrawn: number;
    private: number;
  };
}> => {
  try {
    const report = await fetchCollectionsWithIssues();

    const issueBreakdown = report.collections.reduce(
      (acc, col) => ({
        missingMetadata: acc.missingMetadata + col.statistics.missingMetadataCount,
        embargoed: acc.embargoed + col.statistics.embargoItemsCount,
        withdrawn: acc.withdrawn + col.statistics.withdrawnItemsCount,
        private: acc.private + col.statistics.privateItemsCount,
      }),
      { missingMetadata: 0, embargoed: 0, withdrawn: 0, private: 0 }
    );

    return {
      totalCollections: report.totalCollections,
      collectionsWithIssues: report.collections.length,
      totalItemsWithIssues: report.totalItemsAffected,
      issueBreakdown,
    };
  } catch (error) {
    console.error("Fetch content quality summary error:", error);
    throw error;
  }
};
