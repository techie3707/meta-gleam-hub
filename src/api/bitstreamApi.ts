/**
 * Bitstream API
 * Handles bitstream operations, downloads, and uploads
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";
import axios from "axios";

export interface Bitstream {
  id: string;
  uuid: string;
  name: string;
  sizeBytes: number;
  checkSum?: {
    value: string;
    checkSumAlgorithm: string;
  };
  sequenceId?: number;
  format?: string;
  mimeType?: string;
  _links?: {
    content?: { href: string };
    self?: { href: string };
  };
}

export interface BitstreamListResponse {
  bitstreams: Bitstream[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Fetch bitstreams in a bundle
 */
export const fetchBundleBitstreams = async (
  bundleId: string,
  page: number = 0,
  size: number = 100
): Promise<BitstreamListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/bundles/${bundleId}/bitstreams?page=${page}&size=${size}`
    );

    const bitstreams = response.data._embedded?.bitstreams || [];
    const pageData = response.data.page || {
      size: size,
      totalElements: bitstreams.length,
      totalPages: 1,
      number: page,
    };

    return {
      bitstreams: bitstreams.map((b: any) => ({
        id: b.id,
        uuid: b.uuid || b.id,
        name: b.name,
        sizeBytes: b.sizeBytes,
        checkSum: b.checkSum,
        sequenceId: b.sequenceId,
        format: b.format,
        mimeType: b.mimeType,
        _links: b._links,
      })),
      page: pageData,
    };
  } catch (error) {
    console.error("Fetch bundle bitstreams error:", error);
    throw error;
  }
};

/**
 * Upload bitstream to bundle
 */
export const uploadBitstream = async (
  bundleId: string,
  file: File
): Promise<Bitstream> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post(
      `/api/core/bundles/${bundleId}/bitstreams`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      sizeBytes: response.data.sizeBytes,
      checkSum: response.data.checkSum,
      sequenceId: response.data.sequenceId,
      format: response.data.format,
      mimeType: response.data.mimeType,
      _links: response.data._links,
    };
  } catch (error) {
    console.error("Upload bitstream error:", error);
    throw error;
  }
};

/**
 * Download bitstream content
 */
export const downloadBitstream = async (
  bitstreamId: string,
  fileName: string
): Promise<void> => {
  try {
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);

    const response = await axios.get(
      `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`,
      {
        headers: {
          Authorization: authToken || "",
        },
        responseType: "blob",
        withCredentials: true,
      }
    );

    // Create blob URL and trigger download
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
    console.error("Download bitstream error:", error);
    throw error;
  }
};

/**
 * Get bitstream content URL (for display in browser)
 */
export const getBitstreamContentUrl = (bitstreamId: string): string => {
  return `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`;
};

/**
 * Fetch bitstream content as blob (for preview)
 */
export const fetchBitstreamContent = async (
  bitstreamId: string
): Promise<Blob> => {
  try {
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);

    const response = await axios.get(
      `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`,
      {
        headers: {
          Authorization: authToken || "",
        },
        responseType: "blob",
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    console.error("Fetch bitstream content error:", error);
    throw error;
  }
};

/**
 * Delete bitstream
 */
export const deleteBitstream = async (bitstreamId: string): Promise<boolean> => {
  try {
    await axiosInstance.patch("/api/core/bitstreams", [
      {
        op: "remove",
        path: `/bitstreams/${bitstreamId}`,
      },
    ]);

    return true;
  } catch (error) {
    console.error("Delete bitstream error:", error);
    throw error;
  }
};

/**
 * Update bitstream metadata
 */
export const updateBitstreamMetadata = async (
  bitstreamId: string,
  metadata: Record<string, any>
): Promise<Bitstream> => {
  try {
    const operations = Object.entries(metadata).map(([key, value]) => ({
      op: "replace",
      path: `/${key}`,
      value: value,
    }));

    const response = await axiosInstance.patch(
      `/api/core/bitstreams/${bitstreamId}`,
      operations
    );

    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      sizeBytes: response.data.sizeBytes,
      checkSum: response.data.checkSum,
      sequenceId: response.data.sequenceId,
      format: response.data.format,
      mimeType: response.data.mimeType,
      _links: response.data._links,
    };
  } catch (error) {
    console.error("Update bitstream metadata error:", error);
    throw error;
  }
};
