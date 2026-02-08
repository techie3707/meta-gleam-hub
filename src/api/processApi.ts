/**
 * Process API
 * Handles system processes, batch imports, and script execution
 */

import axiosInstance from "./axiosInstance";

export interface Process {
  processId: number;
  scriptName: string;
  userId: string;
  startTime?: string;
  endTime?: string;
  creationTime: string;
  processStatus: "SCHEDULED" | "RUNNING" | "COMPLETED" | "FAILED";
  type: string;
  parameters?: Array<{
    name: string;
    value: string;
  }>;
  _links?: {
    files?: { href: string };
    output?: { href: string };
    self?: { href: string };
  };
  _embedded?: {
    files?: {
      _embedded?: {
        files: any[];
      };
    };
  };
}

export interface ProcessListResponse {
  processes: Process[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export interface ShortLivedToken {
  token: string;
}

/**
 * Fetch processes by status
 */
export const fetchProcessesByStatus = async (
  status: "SCHEDULED" | "RUNNING" | "COMPLETED" | "FAILED",
  page: number = 0,
  size: number = 20,
  sort: string = "creationTime,DESC"
): Promise<ProcessListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/system/processes/search/byProperty?page=${page}&size=${size}&sort=${sort}&processStatus=${status}`
    );

    const processes = response.data._embedded?.processes || [];
    const pageData = response.data.page || {
      size: size,
      totalElements: processes.length,
      totalPages: 1,
      number: page,
    };

    return {
      processes: processes.map((p: any) => ({
        processId: p.processId,
        scriptName: p.scriptName,
        userId: p.userId,
        startTime: p.startTime,
        endTime: p.endTime,
        creationTime: p.creationTime,
        processStatus: p.processStatus,
        type: p.type,
        parameters: p.parameters,
        _links: p._links,
        _embedded: p._embedded,
      })),
      page: pageData,
    };
  } catch (error) {
    console.error(`Fetch ${status} processes error:`, error);
    throw error;
  }
};

/**
 * Get process detail
 */
export const fetchProcessById = async (
  processId: number,
  embed: string[] = ["files"]
): Promise<Process | null> => {
  try {
    const embedParams = embed.map((e) => `embed=${e}`).join("&");
    const response = await axiosInstance.get(
      `/api/system/processes/${processId}?${embedParams}`
    );

    return {
      processId: response.data.processId,
      scriptName: response.data.scriptName,
      userId: response.data.userId,
      startTime: response.data.startTime,
      endTime: response.data.endTime,
      creationTime: response.data.creationTime,
      processStatus: response.data.processStatus,
      type: response.data.type,
      parameters: response.data.parameters,
      _links: response.data._links,
      _embedded: response.data._embedded,
    };
  } catch (error) {
    console.error("Fetch process error:", error);
    return null;
  }
};

/**
 * Delete process
 */
export const deleteProcess = async (processId: number): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/system/processes/${processId}`);
    return true;
  } catch (error) {
    console.error("Delete process error:", error);
    throw error;
  }
};

/**
 * Get short-lived token for file downloads
 */
export const getShortLivedToken = async (): Promise<string> => {
  try {
    const response = await axiosInstance.post("/api/authn/shortlivedtokens", {});
    return response.data.token;
  } catch (error) {
    console.error("Get short-lived token error:", error);
    throw error;
  }
};

/**
 * Download process file
 */
export const downloadProcessFile = async (
  fileUrl: string,
  fileName: string
): Promise<void> => {
  try {
    const token = await getShortLivedToken();
    const downloadUrl = `${fileUrl}?authentication-token=${token}`;

    const response = await fetch(downloadUrl, {
      headers: {
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      throw new Error("Download failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download process file error:", error);
    throw error;
  }
};

/**
 * Get process output log
 */
export const fetchProcessOutput = async (
  processId: number
): Promise<string> => {
  try {
    const response = await axiosInstance.get(
      `/api/system/processes/${processId}/output`
    );

    if (response.data._links?.content?.href) {
      const token = await getShortLivedToken();
      const contentUrl = `${response.data._links.content.href}?authentication-token=${token}`;

      const contentResponse = await fetch(contentUrl, {
        headers: {
          Accept: "text/plain",
        },
      });

      return await contentResponse.text();
    }

    return "";
  } catch (error) {
    console.error("Fetch process output error:", error);
    throw error;
  }
};

/**
 * Upload batch import
 */
export const uploadBatchImport = async (
  file: File,
  collectionId: string,
  options?: {
    validate?: boolean;
    workflow?: boolean;
  }
): Promise<Process> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    // Build properties array with optional flags
    const properties: Array<{ name: string; value?: string }> = [
      { name: "--add" },
      { name: "--zip", value: file.name },
      { name: "--collection", value: collectionId },
    ];

    // Add validation flag if requested
    if (options?.validate) {
      properties.push({ name: "--validate" });
    }

    // Add workflow flag if requested (ignored if validating)
    if (options?.workflow && !options?.validate) {
      properties.push({ name: "--workflow" });
    }

    formData.append("properties", JSON.stringify(properties));

    const response = await axiosInstance.post(
      "/api/system/scripts/import/processes",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return {
      processId: response.data.processId,
      scriptName: response.data.scriptName,
      userId: response.data.userId,
      creationTime: response.data.creationTime,
      processStatus: response.data.processStatus,
      type: response.data.type,
      parameters: response.data.parameters,
      _links: response.data._links,
    };
  } catch (error) {
    console.error("Upload batch import error:", error);
    throw error;
  }
};

/**
 * Fetch failed processes
 */
export const fetchFailedProcesses = async (
  page: number = 0,
  size: number = 20
): Promise<ProcessListResponse> => {
  return fetchProcessesByStatus("FAILED", page, size, "endTime,ASC");
};

/**
 * Fetch running processes
 */
export const fetchRunningProcesses = async (
  page: number = 0,
  size: number = 5
): Promise<ProcessListResponse> => {
  return fetchProcessesByStatus("RUNNING", page, size, "creationTime,DESC");
};

/**
 * Fetch scheduled processes
 */
export const fetchScheduledProcesses = async (
  page: number = 0,
  size: number = 20
): Promise<ProcessListResponse> => {
  return fetchProcessesByStatus("SCHEDULED", page, size, "creationTime,ASC");
};

/**
 * Fetch completed processes
 */
export const fetchCompletedProcesses = async (
  page: number = 0,
  size: number = 20
): Promise<ProcessListResponse> => {
  return fetchProcessesByStatus("COMPLETED", page, size, "creationTime,DESC");
};
