/**
 * Search API
 * Handles search operations, facets, and discovery
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";

export interface SearchParams {
  query?: string;
  page?: number;
  size?: number;
  sort?: string;
  scope?: string;
  dsoType?: "ITEM" | "COLLECTION" | "COMMUNITY";
  configuration?: string;
  filters?: Record<string, string>;
  embed?: string[];
}

export interface SearchResult {
  id: string;
  uuid: string;
  name: string;
  handle: string;
  metadata: Record<string, Array<{ value: string; language?: string }>>;
  type: string;
  thumbnail?: {
    id: string;
    href: string;
  };
}

export interface SearchResultObject {
  indexableObject?: SearchResult;
  _embedded?: {
    indexableObject?: SearchResult;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  searchResult?: {
    objects: SearchResultObject[];
    page?: {
      size: number;
      totalElements: number;
      totalPages: number;
      number: number;
    };
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
  facets?: FacetCategory[];
}

export interface FacetValue {
  label: string;
  count: number;
  value?: string;
}

export interface FacetCategory {
  name: string;
  facetType: string;
  values: FacetValue[];
  hasMore: boolean;
}

/**
 * Search items, collections, or communities
 * Per API docs: GET /api/discover/search/objects
 * 
 * Filter format for date range:
 * f.dateIssued=[2024-01-01 TO 2024-12-31],equals
 */
export const searchObjects = async (params: SearchParams): Promise<SearchResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    queryParams.append("configuration", params.configuration || siteConfig.searchConfiguration);
    queryParams.append("page", String(params.page || 0));
    queryParams.append("size", String(params.size || siteConfig.defaultPageSize));
    queryParams.append("sort", params.sort || siteConfig.defaultSort);
    queryParams.append("embed", "thumbnail");
    queryParams.append("embed", "item/thumbnail");
    
    if (params.query) {
      queryParams.append("query", params.query);
    }
    
    if (params.scope) {
      queryParams.append("scope", params.scope);
    }
    
    if (params.dsoType) {
      queryParams.append("dsoType", params.dsoType);
    }
    
    // Add filters
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        // Skip internal date range keys - handle specially
        if (key === "dateFrom" || key === "dateTo") {
          return;
        }
        queryParams.append(`f.${key}`, value);
      });

      // Handle date range filter per API docs
      // Format: f.dateIssued=[2024-01-01 TO 2024-12-31],equals
      const dateFrom = params.filters.dateFrom;
      const dateTo = params.filters.dateTo;
      if (dateFrom || dateTo) {
        const from = dateFrom || "*";
        const to = dateTo || "*";
        queryParams.append(`f.dateIssued`, `[${from} TO ${to}],equals`);
      }
    }

    const response = await axiosInstance.get(`/api/discover/search/objects?${queryParams.toString()}`);
    
    const searchResult = response.data._embedded?.searchResult;
    const objects = searchResult?._embedded?.objects || [];
    
    const results: SearchResult[] = objects.map((obj: any) => {
      const indexableObject = obj._embedded?.indexableObject || obj.indexableObject;
      return {
        id: indexableObject?.id,
        uuid: indexableObject?.uuid || indexableObject?.id,
        name: indexableObject?.name,
        handle: indexableObject?.handle,
        metadata: indexableObject?.metadata || {},
        type: indexableObject?.type,
        thumbnail: obj._embedded?.thumbnail || indexableObject?._embedded?.thumbnail,
      };
    });

    // Extract facets from response
    const facetsData = response.data._embedded?.facets || [];
    const facets: FacetCategory[] = facetsData.map((facet: any) => ({
      name: facet.name,
      facetType: facet.facetType,
      values: (facet._embedded?.values || []).map((v: any) => ({
        label: v.label,
        count: v.count,
        value: v._links?.search?.href,
      })),
      hasMore: facet._embedded?.values?.length >= (facet.facetLimit || 5),
    }));

    return {
      results,
      page: searchResult?.page || {
        size: params.size || 10,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
      facets,
    };
  } catch (error) {
    console.error("Search error:", error);
    const errorStatus = (error as any)?.response?.status || 500;
    if (errorStatus === 400) window.location.href = `/error-400`;
    else if (errorStatus === 401) window.location.href = `/error-401`;
    else if (errorStatus === 403) window.location.href = `/error-403`;
    else if (errorStatus === 422) window.location.href = `/error-422`;
    else if (errorStatus === 500) window.location.href = `/error-500`;
    else if (errorStatus !== 0) window.location.href = `/error-404`;
    
    return {
      results: [],
      page: { size: 10, totalElements: 0, totalPages: 0, number: 0 },
    };
  }
};

/**
 * Fetch facet values for a specific facet
 */
export const fetchFacetValues = async (
  facetName: string,
  params: SearchParams & { prefix?: string; facetPage?: number; facetSize?: number }
): Promise<FacetCategory> => {
  try {
    const queryParams = new URLSearchParams();
    
    queryParams.append("configuration", params.configuration || siteConfig.searchConfiguration);
    queryParams.append("page", String(params.facetPage || 0));
    queryParams.append("size", String(params.facetSize || 5));
    
    if (params.query) {
      queryParams.append("query", params.query);
    }
    
    if (params.scope) {
      queryParams.append("scope", params.scope);
    }
    
    if (params.dsoType) {
      queryParams.append("dsoType", params.dsoType);
    }
    
    if (params.prefix) {
      queryParams.append("prefix", params.prefix);
    }
    
    // Add filters
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        queryParams.append(`f.${key}`, value);
      });
    }

    const response = await axiosInstance.get(`/api/discover/facets/${facetName}?${queryParams.toString()}`);
    
    const values = response.data._embedded?.values || [];
    const page = response.data.page || {};
    
    return {
      name: facetName,
      facetType: response.data.facetType || "text",
      values: values.map((v: any) => ({
        label: v.label,
        count: v.count,
        value: v._links?.search?.href,
      })),
      hasMore: page.number < page.totalPages - 1,
    };
  } catch (error) {
    console.error(`Fetch facet ${facetName} error:`, error);
    return {
      name: facetName,
      facetType: "text",
      values: [],
      hasMore: false,
    };
  }
};

/**
 * Fetch all configured facets
 */
export const fetchAllFacets = async (params: SearchParams): Promise<FacetCategory[]> => {
  try {
    const facetPromises = siteConfig.sidebarFacets.map((facet) =>
      fetchFacetValues(facet.name, { ...params, facetSize: facet.size })
    );
    
    return await Promise.all(facetPromises);
  } catch (error) {
    console.error("Fetch all facets error:", error);
    return [];
  }
};

/**
 * Fetch counts for items with/without files in ORIGINAL bundle
 */
export const fetchHasFileCounts = async (
  params: SearchParams
): Promise<{ hasFileCount: number; noFileCount: number }> => {
  try {
    const facet = await fetchFacetValues('has_content_in_original_bundle', {
      ...params,
      facetSize: 10
    });
    
    const hasFileCount = facet.values.find(v => v.label === 'true')?.count || 0;
    const noFileCount = facet.values.find(v => v.label === 'false')?.count || 0;
    
    return { hasFileCount, noFileCount };
  } catch (error) {
    console.error("Fetch has file counts error:", error);
    return { hasFileCount: 0, noFileCount: 0 };
  }
};
