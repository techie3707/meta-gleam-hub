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
  authorityKey?: string;
}

export interface FacetCategory {
  name: string;
  facetType: string;
  values: FacetValue[];
  hasMore: boolean;
}

/** Dynamic facet filter configuration from backend */
export interface SearchFilterConfig {
  name: string;
  facetType: "text" | "authority" | "date" | "hierarchical" | "standard";
  hasFacets: boolean;
  facetLimit: number;
  isOpenByDefault: boolean;
  minValue?: string;
  maxValue?: string;
  _links?: {
    self?: { href: string };
  };
}

/**
 * Fetch dynamic facet configuration from backend
 * GET /api/discover/facets/{configurationName}
 */
export const fetchFacetConfiguration = async (
  configuration: string = "default",
  scope?: string
): Promise<SearchFilterConfig[]> => {
  try {
    const params = new URLSearchParams();
    if (scope) params.append("scope", scope);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const response = await axiosInstance.get(`/api/discover/facets/${configuration}${qs}`);
    
    // Response may have filters array directly or in _embedded
    const filters = response.data?.filters || response.data?._embedded?.filters || [];
    return filters.map((f: any) => ({
      name: f.name,
      facetType: f.facetType || "text",
      hasFacets: f.hasFacets !== false,
      facetLimit: f.facetLimit || 5,
      isOpenByDefault: f.isOpenByDefault || false,
      minValue: f.minValue,
      maxValue: f.maxValue,
      _links: f._links,
    }));
  } catch (error) {
    console.error("Fetch facet configuration error:", error);
    // Fallback to siteConfig facets
    return siteConfig.sidebarFacets.map((f) => ({
      name: f.name,
      facetType: "text" as const,
      hasFacets: true,
      facetLimit: f.size,
      isOpenByDefault: false,
    }));
  }
};

/**
 * Search items, collections, or communities
 * Per API docs: GET /api/discover/search/objects
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
    
    if (params.query) queryParams.append("query", params.query);
    if (params.scope) queryParams.append("scope", params.scope);
    if (params.dsoType) queryParams.append("dsoType", params.dsoType);
    
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (key === "dateFrom" || key === "dateTo") return;
        queryParams.append(`f.${key}`, value);
      });
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

    const facetsData = response.data._embedded?.facets || [];
    const facets: FacetCategory[] = facetsData.map((facet: any) => ({
      name: facet.name,
      facetType: facet.facetType,
      values: (facet._embedded?.values || []).map((v: any) => ({
        label: v.label,
        count: v.count,
        value: v._links?.search?.href,
        authorityKey: v.authorityKey,
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
    return {
      results: [],
      page: { size: 10, totalElements: 0, totalPages: 0, number: 0 },
    };
  }
};

/**
 * Fetch facet values for a specific facet
 * GET /api/discover/facets/{facetName}
 */
export const fetchFacetValues = async (
  facetName: string,
  params: SearchParams & { prefix?: string; facetPage?: number; facetSize?: number }
): Promise<FacetCategory & { page?: { size: number; totalElements: number; totalPages: number; number: number } }> => {
  try {
    const queryParams = new URLSearchParams();
    
    queryParams.append("configuration", params.configuration || siteConfig.searchConfiguration);
    queryParams.append("page", String(params.facetPage || 0));
    queryParams.append("size", String(params.facetSize || 5));
    
    if (params.query) queryParams.append("query", params.query);
    if (params.scope) queryParams.append("scope", params.scope);
    if (params.dsoType) queryParams.append("dsoType", params.dsoType);
    if (params.prefix) queryParams.append("prefix", params.prefix);
    
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        queryParams.append(`f.${key}`, value);
      });
    }

    const response = await axiosInstance.get(`/api/discover/facets/${facetName}?${queryParams.toString()}`);
    
    const values = response.data._embedded?.values || response.data.values || [];
    const page = response.data.page || {};
    
    return {
      name: facetName,
      facetType: response.data.facetType || "text",
      values: values.map((v: any) => ({
        label: v.label,
        count: v.count,
        value: v._links?.search?.href,
        authorityKey: v.authorityKey,
      })),
      hasMore: page.number < (page.totalPages || 1) - 1,
      page,
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
