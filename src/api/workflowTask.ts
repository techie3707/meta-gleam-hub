import { siteConfig } from "../config/siteConfig";
import axios from "axios";
import { fetchCsrfToken } from "./csrfApi";

const authToken = localStorage.getItem("authToken") || "";

// NOTE: CSRF token is fetched dynamically before each POST request
// Do NOT cache it at module level as it can expire

/**
 * Interface for workflow search parameters
 */
export interface WorkflowSearchParams {
  sort?: string;
  page?: number;
  size?: number;
  configuration?: string;
  query?: string;
  [key: string]: any; // For filter params (f.*)
}

/**
 * Search workflow objects with filtering
 */
export const getWorkflowObjects = async (params: WorkflowSearchParams = {}) => {
  const queryParams = new URLSearchParams();
  
  // Add standard params
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.page !== undefined) queryParams.append('page', params.page.toString());
  if (params.size) queryParams.append('size', params.size.toString());
  if (params.configuration) queryParams.append('configuration', params.configuration);
  if (params.query) queryParams.append('query', params.query);
  
  // Add filter params (those starting with 'f.')
  // Handle both single values and arrays
  Object.keys(params).forEach(key => {
    if (key.startsWith('f.')) {
      const value = params[key];
      if (Array.isArray(value)) {
        // For arrays, append each value separately
        value.forEach(v => {
          queryParams.append(key, v.toString());
        });
      } else if (value) {
        queryParams.append(key, value.toString());
      }
    }
  });

  queryParams.append('embed', 'thumbnail');
  queryParams.append('embed', 'item/thumbnail');

  const fullUrl = `${siteConfig.apiEndpoint}/api/discover/search/objects?${queryParams.toString()}`;
  console.log(`[WorkflowTask API] Search request:`, fullUrl);
  console.log(`[WorkflowTask API] Params received:`, params);

  try {
    const response = await axios.get(fullUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error: any) {
    console.error(`[WorkflowTask API] Search request failed:`, error.response?.status, error.response?.data);
    handleApiError(error);
  }
};

/**
 * Get submitters facet
 */
export const getWorkflowSubmittersFacet = async (params: WorkflowSearchParams = {}) => {
  return getWorkflowFacet('submitter', params);
};

/**
 * Get item types facet
 */
export const getWorkflowItemTypesFacet = async (params: WorkflowSearchParams = {}) => {
  return getWorkflowFacet('itemtype', params);
};

/**
 * Get named resource types facet
 */
export const getWorkflowNamedResourceTypesFacet = async (params: WorkflowSearchParams = {}) => {
  return getWorkflowFacet('namedresourcetype', params);
};

/**
 * Generic facet fetching function
 */
const getWorkflowFacet = async (facetName: string, params: WorkflowSearchParams = {}) => {
  const queryParams = new URLSearchParams();
  
  queryParams.append('page', (params.page || 0).toString());
  queryParams.append('size', (params.size || 10).toString());
  queryParams.append('configuration', params.configuration || 'workflow');

  if (params.query) {
    queryParams.append('query', params.query);
  }

  // NOTE: Facet endpoints do NOT support sort parameter
  // Removing sort to prevent 422 Unprocessable Content errors

  // Add filter params (starting with 'f.')
  // Handle both single values and arrays
  Object.keys(params).forEach(key => {
    if (key.startsWith('f.')) {
      const value = params[key];
      if (Array.isArray(value)) {
        // For arrays, append each value separately
        value.forEach(v => {
          queryParams.append(key, v.toString());
        });
      } else if (value) {
        queryParams.append(key, value.toString());
      }
    }
  });

  const fullUrl = `${siteConfig.apiEndpoint}/api/discover/facets/${facetName}?${queryParams.toString()}`;
  console.log(`[WorkflowTask API] Facet request for ${facetName}:`, fullUrl);
  console.log(`[WorkflowTask API] Params received:`, params);
  
  try {
    const response = await axios.get(fullUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error: any) {
    console.error(`[WorkflowTask API] Facet request failed:`, error.response?.status, error.response?.data);
    handleApiError(error);
  }
};

/**
 * Handle API errors with status-specific routing
 */
const handleApiError = (error: any) => {
  const errorStatus = error.response?.status || 500;
  
  if (typeof window !== 'undefined') {
    if (errorStatus === 400) {
      window.location.href = `/error-400`;
    } else if (errorStatus === 401) {
      window.location.href = `/error-401`;
    } else if (errorStatus === 403) {
      window.location.href = `/error-403`;
    } else if (errorStatus === 422) {
      window.location.href = `/error-422`;
    } else if (errorStatus === 500) {
      window.location.href = `/error-500`;
    } else {
      window.location.href = `/error-404`;
    }
  }
};

/**
 * ===== TASK ACTION ENDPOINTS =====
 * These handle the actual workflow actions: claim, approve, reject, delete
 */

/**
 * Claim a pool task
 * POST /api/workflow/claimedtasks
 * Body: Text URI-List format pointing to the pool task
 */
export const claimedtask = async (id: string) => {
  const url = `${siteConfig.apiEndpoint}/api/workflow/claimedtasks`;
  const body = `${siteConfig.apiEndpoint}/api/workflow/pooltasks/${id}`;
  
  // Fetch fresh CSRF token before making the request
  const csrfToken = await fetchCsrfToken();
  
  console.log('[WorkflowTask API] Claiming task:');
  console.log('  URL:', url);
  console.log('  Body:', body);
  console.log('  Fresh CSRF Token:', csrfToken ? csrfToken.substring(0, 10) + '...' : 'MISSING');
  
  try {
    const response = await axios.post(
      url,
      body,
      {
        headers: {
          "Content-Type": "text/uri-list",
          "X-XSRF-TOKEN": csrfToken || "",
          Authorization: authToken,
        },
        withCredentials: true,
      }
    );
    console.log('[WorkflowTask] Task claimed successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[WorkflowTask] Error claiming task:');
    console.error('  Status:', error.response?.status);
    console.error('  Data:', error.response?.data);
    console.error('  Message:', error.message);
    throw error;
  }
};

/**
 * Approve a claimed task
 * POST /api/workflow/claimedtasks/{id}
 * Params: submit_approve=true
 */
export const approveClaimedTask = async (id: number) => {
  const url = `${siteConfig.apiEndpoint}/api/workflow/claimedtasks/${id}`;
  const params = new URLSearchParams();
  params.append('submit_approve', 'true');

  // Fetch fresh CSRF token before making the request
  const csrfToken = await fetchCsrfToken();

  console.log('[WorkflowTask API] Approving task:');
  console.log('  URL:', url);
  console.log('  Params:', params.toString());
  console.log('  Fresh CSRF Token:', csrfToken ? csrfToken.substring(0, 10) + '...' : 'MISSING');
  console.log('  Auth Token present:', !!authToken);
  
  try {
    const response = await axios.post(
      url,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-XSRF-TOKEN": csrfToken || "",
          Authorization: authToken,
        },
        withCredentials: true,
      }
    );
    console.log('[WorkflowTask] Task approved successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[WorkflowTask] Error approving task:');
    console.error('  Status:', error.response?.status);
    console.error('  Status Text:', error.response?.statusText);
    console.error('  Headers:', error.response?.headers);
    console.error('  Data:', error.response?.data);
    console.error('  Full Error:', error);
    throw error;
  }
};

/**
 * Reject a claimed task with optional reason
 * POST /api/workflow/claimedtasks/{id}
 * Params: submit_reject=true, reason=<text>
 */
export const rejectClaimedTask = async (id: number, reason: string) => {
  const url = `${siteConfig.apiEndpoint}/api/workflow/claimedtasks/${id}`;
  const params = new URLSearchParams();
  params.append('submit_reject', 'true');
  params.append('reason', reason);

  // Fetch fresh CSRF token before making the request
  const csrfToken = await fetchCsrfToken();

  console.log('[WorkflowTask API] Rejecting task:');
  console.log('  URL:', url);
  console.log('  Params:', params.toString());
  console.log('  Fresh CSRF Token:', csrfToken ? csrfToken.substring(0, 10) + '...' : 'MISSING');
  
  try {
    const response = await axios.post(
      url,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-XSRF-TOKEN": csrfToken || "",
          Authorization: authToken,
        },
        withCredentials: true,
      }
    );
    console.log('[WorkflowTask] Task rejected successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[WorkflowTask] Error rejecting task:');
    console.error('  Status:', error.response?.status);
    console.error('  Data:', error.response?.data);
    console.error('  Message:', error.message);
    throw error;
  }
};

/**
 * Delete a claimed task (return to pool)
 * DELETE /api/workflow/claimedtasks/{id}
 */
export const deleteClaimedTask = async (id: number) => {
  const url = `${siteConfig.apiEndpoint}/api/workflow/claimedtasks/${id}`;

  // Fetch fresh CSRF token before making the request
  const csrfToken = await fetchCsrfToken();

  console.log('[WorkflowTask API] Deleting task:');
  console.log('  URL:', url);
  console.log('  Fresh CSRF Token:', csrfToken ? csrfToken.substring(0, 10) + '...' : 'MISSING');
  
  try {
    const response = await axios.delete(
      url,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken || "",
          Authorization: authToken,
        },
        withCredentials: true,
      }
    );
    console.log('[WorkflowTask] Task deleted successfully');
    return response.data;
  } catch (error: any) {
    console.error('[WorkflowTask] Error deleting task:');
    console.error('  Status:', error.response?.status);
    console.error('  Data:', error.response?.data);
    console.error('  Message:', error.message);
    throw error;
  }
};
