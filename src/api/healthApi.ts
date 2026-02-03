/**
 * Health Check & System Monitoring API
 * System health and status monitoring
 */

import axiosInstance from "./axiosInstance";

export interface HealthComponent {
  status: "UP" | "DOWN" | "UNKNOWN" | "OUT_OF_SERVICE";
  details?: Record<string, any>;
}

export interface HealthResponse {
  status: "UP" | "DOWN" | "UNKNOWN" | "OUT_OF_SERVICE";
  components?: Record<string, HealthComponent>;
}

export interface AuthStatusResponse {
  okay: boolean;
  authenticated: boolean;
  type: string;
  _embedded?: {
    eperson?: {
      uuid: string;
      email: string;
      netid?: string;
      lastActive: string;
      canLogIn: boolean;
      requireCertificate: boolean;
      selfRegistered: boolean;
    };
  };
  _links?: {
    eperson?: {
      href: string;
    };
  };
}

export interface ApiRootResponse {
  _links: Record<string, { href: string }>;
}

/**
 * Get system health status
 * Note: This endpoint may need to be enabled in application.properties
 */
export const fetchHealthStatus = async (): Promise<HealthResponse> => {
  try {
    const response = await axiosInstance.get("/actuator/health");
    return response.data;
  } catch (error) {
    console.error("Fetch health status error:", error);
    // Return a fallback health status if endpoint is disabled
    return {
      status: "UNKNOWN",
      components: {
        note: {
          status: "UNKNOWN",
          details: {
            message:
              "Health endpoint may be disabled. Check application.properties",
          },
        },
      },
    };
  }
};

/**
 * Get current authentication status
 */
export const fetchAuthStatus = async (): Promise<AuthStatusResponse> => {
  try {
    const response = await axiosInstance.get("/api/authn/status");
    return response.data;
  } catch (error) {
    console.error("Fetch auth status error:", error);
    throw error;
  }
};

/**
 * Get API root endpoints (service discovery)
 */
export const fetchApiRoot = async (): Promise<ApiRootResponse> => {
  try {
    const response = await axiosInstance.get("/api");
    return response.data;
  } catch (error) {
    console.error("Fetch API root error:", error);
    throw error;
  }
};

/**
 * Check if Solr is healthy
 */
export const isSolrHealthy = async (): Promise<boolean> => {
  try {
    const health = await fetchHealthStatus();
    const solrStatus = health.components?.solr?.status;
    return solrStatus === "UP";
  } catch (error) {
    console.error("Check Solr health error:", error);
    return false;
  }
};

/**
 * Get overall system status
 */
export const getSystemStatus = async (): Promise<{
  overall: "UP" | "DOWN" | "UNKNOWN" | "OUT_OF_SERVICE";
  components: Array<{
    name: string;
    status: string;
    details?: Record<string, any>;
  }>;
}> => {
  try {
    const health = await fetchHealthStatus();

    const components = Object.entries(health.components || {}).map(
      ([name, component]) => ({
        name,
        status: component.status,
        details: component.details,
      })
    );

    return {
      overall: health.status,
      components,
    };
  } catch (error) {
    console.error("Get system status error:", error);
    return {
      overall: "UNKNOWN",
      components: [],
    };
  }
};

/**
 * Get current user info from auth status
 */
export const getCurrentUserInfo = async (): Promise<{
  authenticated: boolean;
  email?: string;
  uuid?: string;
  lastActive?: string;
} | null> => {
  try {
    const authStatus = await fetchAuthStatus();

    if (!authStatus.authenticated || !authStatus._embedded?.eperson) {
      return {
        authenticated: false,
      };
    }

    const eperson = authStatus._embedded.eperson;
    return {
      authenticated: true,
      email: eperson.email,
      uuid: eperson.uuid,
      lastActive: eperson.lastActive,
    };
  } catch (error) {
    console.error("Get current user info error:", error);
    return null;
  }
};

/**
 * Discover available API endpoints
 */
export const discoverApiEndpoints = async (): Promise<
  Array<{ name: string; href: string }>
> => {
  try {
    const root = await fetchApiRoot();
    return Object.entries(root._links || {}).map(([name, link]) => ({
      name,
      href: link.href,
    }));
  } catch (error) {
    console.error("Discover API endpoints error:", error);
    return [];
  }
};
