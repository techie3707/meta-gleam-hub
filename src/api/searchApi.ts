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

export interface SearchResponse {
  results: SearchResult[];
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
        queryParams.append(`f.${key}`, value);
      });
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

    return {
      results,
      page: searchResult?.page || {
        size: params.size || 10,
        totalElements: 0,
        totalPages: 0,
        number: 0,
      },
    };
  } catch (error) {
    console.error("Search error:", error);
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
