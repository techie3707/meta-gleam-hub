/**
 * Discovery & Search Analytics API
 * Advanced search with analytics tracking
 */

import axiosInstance from "./axiosInstance";

export interface SearchObject {
  indexableObject: {
    uuid: string;
    name: string;
    type: string;
    metadata?: Record<string, Array<{ value: string }>>;
  };
  hitHighlights?: Record<string, string[]>;
}

export interface SearchFacetValue {
  label: string;
  count: number;
  value: string;
}

export interface SearchFacet {
  name: string;
  facetType: "text" | "date" | "hierarchical";
  facetLimit: number;
  values?: SearchFacetValue[];
}

export interface DiscoverySearchResponse {
  _embedded?: {
    searchResult?: {
      _embedded?: {
        objects: SearchObject[];
      };
      page: {
        size: number;
        totalElements: number;
        totalPages: number;
        number: number;
      };
      facets?: SearchFacet[];
    };
  };
}

export interface FacetsResponse {
  _embedded?: {
    facets: Array<{
      name: string;
      facetType: string;
      facetLimit: number;
    }>;
  };
}

/**
 * Search repository with analytics tracking
 */
export const searchRepository = async (params: {
  query?: string;
  scope?: string;
  configuration?: string;
  page?: number;
  size?: number;
  sort?: string;
  filters?: Record<string, string[]>;
}): Promise<DiscoverySearchResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (params.query) queryParams.append("query", params.query);
    if (params.scope) queryParams.append("scope", params.scope);
    if (params.configuration)
      queryParams.append("configuration", params.configuration);
    if (params.page !== undefined)
      queryParams.append("page", params.page.toString());
    if (params.size !== undefined)
      queryParams.append("size", params.size.toString());
    if (params.sort) queryParams.append("sort", params.sort);

    // Add facet filters
    if (params.filters) {
      Object.entries(params.filters).forEach(([facet, values]) => {
        values.forEach((value) => {
          queryParams.append(`f.${facet}`, value);
        });
      });
    }

    const response = await axiosInstance.get(
      `/api/discover/search/objects?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Search repository error:", error);
    throw error;
  }
};

/**
 * Get available search facets
 */
export const fetchSearchFacets = async (
  configuration?: string
): Promise<FacetsResponse> => {
  try {
    const params = configuration
      ? `?configuration=${configuration}`
      : "";
    const response = await axiosInstance.get(`/api/discover/facets${params}`);
    return response.data;
  } catch (error) {
    console.error("Fetch search facets error:", error);
    throw error;
  }
};

/**
 * Quick search - simplified search interface
 */
export const quickSearch = async (
  query: string,
  page: number = 0,
  size: number = 20
): Promise<{
  results: Array<{
    uuid: string;
    name: string;
    type: string;
    highlights?: string[];
  }>;
  total: number;
  totalPages: number;
}> => {
  try {
    const response = await searchRepository({ query, page, size });

    const objects =
      response._embedded?.searchResult?._embedded?.objects || [];
    const pageData = response._embedded?.searchResult?.page || {
      totalElements: 0,
      totalPages: 0,
      size: 0,
      number: 0,
    };

    return {
      results: objects.map((obj) => ({
        uuid: obj.indexableObject.uuid,
        name: obj.indexableObject.name,
        type: obj.indexableObject.type,
        highlights: obj.hitHighlights
          ? Object.values(obj.hitHighlights).flat()
          : undefined,
      })),
      total: pageData.totalElements,
      totalPages: pageData.totalPages,
    };
  } catch (error) {
    console.error("Quick search error:", error);
    return {
      results: [],
      total: 0,
      totalPages: 0,
    };
  }
};

/**
 * Search by type (items, collections, communities)
 */
export const searchByType = async (
  type: "item" | "collection" | "community",
  query?: string,
  page: number = 0,
  size: number = 20
): Promise<DiscoverySearchResponse> => {
  return searchRepository({
    query,
    page,
    size,
    configuration: type,
  });
};

/**
 * Get recent items from repository
 */
export const fetchRecentItems = async (
  limit: number = 10
): Promise<SearchObject[]> => {
  try {
    const response = await searchRepository({
      size: limit,
      sort: "dc.date.accessioned,DESC",
    });

    return response._embedded?.searchResult?._embedded?.objects || [];
  } catch (error) {
    console.error("Fetch recent items error:", error);
    return [];
  }
};

/**
 * Get popular items (most viewed)
 */
export const fetchPopularItems = async (
  limit: number = 10
): Promise<SearchObject[]> => {
  try {
    // Note: This would typically use view statistics
    // For now, we'll return recent items as a fallback
    const response = await searchRepository({
      size: limit,
      sort: "dc.date.accessioned,DESC",
    });

    return response._embedded?.searchResult?._embedded?.objects || [];
  } catch (error) {
    console.error("Fetch popular items error:", error);
    return [];
  }
};
