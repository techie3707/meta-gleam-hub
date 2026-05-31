import { siteConfig } from "../config/siteConfig";
import axios from "axios";
import { 
  SearchParams, 
  workflowSearchResult, 
  FacetFilterOption, 
  FacetResult,
  FilterOption 
} from "../data/workflowdata";

const authToken = localStorage.getItem("authToken") || "";
const csrfToken = localStorage.getItem("csrfToken") || "";

/**
 * Build URL query parameters for API request
 * Maps search params to API query string
 */
const buildApiQueryParams = (params: SearchParams): string => {
  const queryParams = new URLSearchParams();
  
  // Add configuration for supervision
  queryParams.append('configuration', 'supervision');

  // Add sort parameter
  if (params.sort) {
    queryParams.append('sort', params.sort || 'score,DESC');
  }

  // Add pagination
  queryParams.append('page', (params.page || 0).toString());
  queryParams.append('size', (params.size || 10).toString());

  // Add filters
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      const filterOption = FilterOption.find(f => f.id === key);
      if (!filterOption) return;

      const fieldName = filterOption.fieldName;
      
      if (filterOption.filterType === 'checkbox' && Array.isArray(value)) {
        value.forEach(v => {
          queryParams.append(`f.${fieldName}`, `${v},authority`);
        });
      } else if (filterOption.filterType === 'range' && Array.isArray(value)) {
        value.forEach(v => {
          queryParams.append(`f.${fieldName}`, `${v},equals`);
        });
      }
    });
  }
  
  const result = queryParams.toString();
  console.log(`[Workflow API] buildApiQueryParams result:`, result);
  return result;
};

/**
 * Parse search params from URL query string
 */
export const parseSearchParamsFromUrl = (): SearchParams => {
  if (typeof window === 'undefined') {
    return { page: 0, size: 10 };
  }

  const params = new URLSearchParams(window.location.search);
  const filters: any = {};

  FilterOption.forEach(section => {
    if (section.filterType === 'checkbox') {
      const values = params.getAll(`f.${section.fieldName}`);
      if (values.length > 0) {
        filters[section.id] = values.map(v => v.replace(',authority', ''));
      }
    } else if (section.filterType === 'range') {
      const values = params.getAll(`f.${section.fieldName}`);
      if (values.length > 0) {
        filters[section.id] = values.map(v => v.replace(',equals', ''));
      }
    }
  });

  return {
    page: parseInt(params.get('page') || '0'),
    size: parseInt(params.get('size') || '10'),
    query: params.get('query') || undefined,
    sort: params.get('sort') || undefined,
    scope: params.get('scope') || undefined,
    filters: Object.keys(filters).length ? filters : undefined,
  };
};

/**
 * Update URL with current search params
 */
export const updateUrlWithSearchParams = (params: SearchParams) => {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams();
  urlParams.set('page', (params.page || 0).toString());
  urlParams.set('size', (params.size || 10).toString());

  if (params.query) {
    urlParams.set('query', params.query);
  }

  if (params.scope) {
    urlParams.set('scope', params.scope);
  }

  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      const filterOption = FilterOption.find(f => f.id === key);
      if (!filterOption) return;

      const fieldName = filterOption.fieldName;
      
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (filterOption.filterType === 'checkbox') {
            urlParams.append(`f.${fieldName}`, `${v},authority`);
          } else if (filterOption.filterType === 'range') {
            urlParams.append(`f.${fieldName}`, `${v},equals`);
          }
        });
      }
    });
  }

  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.pushState({ path: newUrl }, '', newUrl);
};

/**
 * Main search function for workflow objects
 * Returns paginated results with thumbnails and access status
 */
export const getWorkflowObject = async (params: SearchParams) => {
  let apiUrl = `${siteConfig.apiEndpoint}/api/discover/search/objects?${buildApiQueryParams(params)}&embed=thumbnail&embed=item/thumbnail&embed=accessStatus&embed=supervisionOrders`;

  if (params.query?.trim()) {
    apiUrl += `&query=${encodeURIComponent(params.query)}`;
  }
  
  console.log(`[Workflow API] Full request URL:`, apiUrl);
  console.log(`[Workflow API] Request params:`, params);

  try {
    const response = await axios.get<workflowSearchResult>(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken,
      },
      withCredentials: true,
    });
    
    return {
      objects: response.data._embedded.searchResult._embedded.objects,
      totalElements: response.data._embedded.searchResult.page?.totalElements
    };
  } catch (error: any) {
    console.error(`[Workflow API] Request failed:`, error.response?.status, error.response?.data);
    const errorStatus = error.response?.status || 500;
    
    if (errorStatus === 400) {
      throw new Error('Bad request - check your parameters');
    } else if (errorStatus === 401) {
      throw new Error('Unauthorized - please login again');
    } else if (errorStatus === 403) {
      throw new Error('Forbidden - you do not have access');
    } else if (errorStatus === 422) {
      throw new Error('Invalid field configuration');
    } else if (errorStatus === 500) {
      throw new Error('Server error - please try again later');
    } else {
      throw new Error('Unknown error occurred');
    }
  }
};

/**
 * Fetch individual facet values with pagination
 */
export const workflowFacet = async (
  facetName: string,
  params: SearchParams,
  facetPage: number = 0,  
  facetSize: number = 5,
): Promise<FacetFilterOption[]> => {
  const facetParams = { ...params };
  facetParams.page = facetPage;
  facetParams.size = facetSize;
  
  let f_url = `${siteConfig.apiEndpoint}/api/discover/facets/${facetName}?${buildApiQueryParams(facetParams)}`;

  if (params.query) {
    f_url += `&query=${encodeURIComponent(params.query)}`;
  }

  const response = await axios.get<FacetResult>(f_url, {
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfToken,
      Authorization: authToken,
    },
    withCredentials: true,
  });

  return response.data._embedded?.values?.map((value: any) => ({
    id: value.label,
    label: value.label,
    count: value.count
  })) || [];
};

/**
 * Fetch all facets for current search
 */
export const workflowFacets = async (params: SearchParams) => {
  const facetPromises = FilterOption.map(section => {
    if (section.filterType === 'checkbox') {
      return workflowFacet(section.fieldName, params);
    }
    return Promise.resolve([]);
  });

  const results = await Promise.all(facetPromises);

  return FilterOption.reduce((acc, section, index) => {
    if (section.filterType === 'checkbox') {
      acc[section.id] = results[index];
    }
    return acc;
  }, {} as Record<string, FacetFilterOption[]>);
};

/**
 * Fetch workspace item collection info
 */
export const getWorkspaceItem = async (id: string) => {
  try {
    const response = await axios.get<any>(
      `${siteConfig.apiEndpoint}/api/submission/workspaceitems/${id}/collection`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
          "X-XSRF-TOKEN": csrfToken,
        },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error fetching workspace item:', error);
    throw error;
  }
};

/**
 * Remove workspace item
 */
export const removeWorkspaceItem = async (id: string) => {
  try {
    const response = await axios.delete(
      `${siteConfig.apiEndpoint}/api/submission/workspaceitems/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
          Authorization: authToken,
        },
        withCredentials: true,
      }
    );
    if (response.status === 204) {
      console.log('Workspace item deleted successfully');
    }
  } catch (error: any) {
    console.error('Failed to delete workspace item:', error);
    throw error;
  }
};
