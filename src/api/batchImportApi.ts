/**
 * Batch Import API
 * Handles bulk import operations using CSV and ZIP files
 */

import axiosInstance from "./axiosInstance";

export interface BatchImportProcess {
  processId: string;
  status: "SCHEDULED" | "RUNNING" | "COMPLETED" | "FAILED";
  itemsProcessed: number;
  itemsTotal: number;
  startTime?: string;
  endTime?: string;
  errorMessage?: string;
}

export interface ProcessFile {
  name: string;
  type: "input" | "output";
  checkSum?: string;
}

export interface ProcessDetails {
  processId: string;
  processStatus: "SCHEDULED" | "RUNNING" | "COMPLETED" | "FAILED";
  userId?: string;
  creationTime?: string;
  startTime?: string;
  endTime?: string;
  scriptName?: string;
  parameters?: Array<{
    name: string;
    value: string;
  }>;
  files?: ProcessFile[];
}

/**
 * Start a batch import process
 * Per API docs: POST /api/system/scripts/import/processes
 */
export const startBatchImport = async (
  collectionId: string,
  metadataFile: File,
  zipFile?: File
): Promise<BatchImportProcess> => {
  try {
    const formData = new FormData();
    formData.append("metadata", metadataFile);
    if (zipFile) {
      formData.append("file", zipFile);
    }
    
    // Add parameters as required by API
    formData.append("properties", JSON.stringify([
      { name: "-c", value: collectionId },
      { name: "-z", value: zipFile?.name || "" },
      { name: "-m", value: metadataFile.name },
    ]));

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
      processId: response.data.processId || response.data.id,
      status: response.data.status || response.data.processStatus || "SCHEDULED",
      itemsProcessed: 0,
      itemsTotal: 0,
    };
  } catch (error) {
    console.error("Start batch import error:", error);
    throw error;
  }
};

/**
 * Get batch import process status
 * Per API docs: GET /api/system/processes/{processId}
 */
export const getProcessStatus = async (processId: string): Promise<ProcessDetails> => {
  try {
    const response = await axiosInstance.get(`/api/system/processes/${processId}`);
    
    return {
      processId: response.data.processId || response.data.id,
      processStatus: response.data.processStatus || response.data.status,
      userId: response.data._links?.user?.href?.split("/").pop(),
      creationTime: response.data.creationTime,
      startTime: response.data.startTime,
      endTime: response.data.endTime,
      scriptName: response.data.scriptName,
      parameters: response.data.parameters,
      files: response.data._embedded?.files,
    };
  } catch (error) {
    console.error("Get process status error:", error);
    throw error;
  }
};

/**
 * Get process output file content
 * Per API docs: GET /api/system/processes/{processId}/output
 */
export const getProcessOutput = async (processId: string): Promise<string> => {
  try {
    const response = await axiosInstance.get(
      `/api/system/processes/${processId}/output`,
      { responseType: "text" }
    );
    return response.data;
  } catch (error) {
    console.error("Get process output error:", error);
    throw error;
  }
};

/**
 * Download process file
 */
export const downloadProcessFile = async (
  processId: string,
  fileName: string
): Promise<void> => {
  try {
    const response = await axiosInstance.get(
      `/api/system/processes/${processId}/files/${fileName}`,
      { responseType: "blob" }
    );

    const blob = new Blob([response.data]);
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
 * Get all processes (with optional status filter)
 */
export const listProcesses = async (
  page: number = 0,
  size: number = 20
): Promise<{
  processes: ProcessDetails[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}> => {
  try {
    const response = await axiosInstance.get(
      `/api/system/processes?page=${page}&size=${size}`
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
        processId: p.processId || p.id,
        processStatus: p.processStatus || p.status,
        creationTime: p.creationTime,
        startTime: p.startTime,
        endTime: p.endTime,
        scriptName: p.scriptName,
        parameters: p.parameters,
      })),
      page: pageData,
    };
  } catch (error) {
    console.error("List processes error:", error);
    throw error;
  }
};

/**
 * Delete/cancel a process
 */
export const deleteProcess = async (processId: string): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/system/processes/${processId}`);
    return true;
  } catch (error) {
    console.error("Delete process error:", error);
    return false;
  }
};
