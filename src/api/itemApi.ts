/**
 * Item API
 * Handles item CRUD operations, bitstreams, and bundles
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";

export interface ItemMetadata {
  [key: string]: Array<{
    value: string;
    language?: string;
    authority?: string;
    confidence?: number;
  }>;
}

export interface Item {
  id: string;
  uuid: string;
  name: string;
  handle: string;
  metadata: ItemMetadata;
  type: string;
  inArchive?: boolean;
  discoverable?: boolean;
  withdrawn?: boolean;
  lastModified?: string;
  thumbnail?: Bitstream;
  bundles?: Bundle[];
}

export interface Bundle {
  id: string;
  uuid: string;
  name: string;
  type: string;
  bitstreams?: Bitstream[];
}

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

export interface ItemListResponse {
  items: Item[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Fetch item by ID with optional embeds
 */
export const fetchItemById = async (
  id: string,
  embed: string[] = ["thumbnail", "accessStatus"]
): Promise<Item | null> => {
  try {
    const embedParams = embed.map((e) => `embed=${e}`).join("&");
    const response = await axiosInstance.get(`/api/core/items/${id}?${embedParams}`);
    
    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      handle: response.data.handle,
      metadata: response.data.metadata || {},
      type: response.data.type,
      inArchive: response.data.inArchive,
      discoverable: response.data.discoverable,
      withdrawn: response.data.withdrawn,
      lastModified: response.data.lastModified,
      thumbnail: response.data._embedded?.thumbnail,
    };
  } catch (error) {
    console.error("Fetch item error:", error);
    return null;
  }
};

/**
 * Fetch item bundles
 */
export const fetchItemBundles = async (itemId: string): Promise<Bundle[]> => {
  try {
    const response = await axiosInstance.get(`/api/core/items/${itemId}/bundles?size=9999`);
    
    const bundles = response.data._embedded?.bundles || [];
    return bundles.map((bundle: any) => ({
      id: bundle.id,
      uuid: bundle.uuid || bundle.id,
      name: bundle.name,
      type: bundle.type,
    }));
  } catch (error) {
    console.error("Fetch bundles error:", error);
    return [];
  }
};

/**
 * Fetch bitstreams for a bundle
 */
export const fetchBundleBitstreams = async (
  bundleId: string,
  page = 0,
  size = 100
): Promise<Bitstream[]> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/bundles/${bundleId}/bitstreams?page=${page}&size=${size}`
    );
    
    const bitstreams = response.data._embedded?.bitstreams || [];
    return bitstreams.map((bs: any) => ({
      id: bs.id,
      uuid: bs.uuid || bs.id,
      name: bs.name,
      sizeBytes: bs.sizeBytes,
      checkSum: bs.checkSum,
      sequenceId: bs.sequenceId,
      _links: bs._links,
    }));
  } catch (error) {
    console.error("Fetch bitstreams error:", error);
    return [];
  }
};

/**
 * Fetch item with all bitstreams from ORIGINAL bundle
 */
export const fetchItemWithBitstreams = async (itemId: string): Promise<Item | null> => {
  try {
    const item = await fetchItemById(itemId);
    if (!item) return null;
    
    const bundles = await fetchItemBundles(itemId);
    
    // Fetch bitstreams for each bundle
    const bundlesWithBitstreams = await Promise.all(
      bundles.map(async (bundle) => {
        const bitstreams = await fetchBundleBitstreams(bundle.id);
        return { ...bundle, bitstreams };
      })
    );
    
    return { ...item, bundles: bundlesWithBitstreams };
  } catch (error) {
    console.error("Fetch item with bitstreams error:", error);
    return null;
  }
};

/**
 * Get owning collection for an item
 */
export const fetchOwningCollection = async (itemId: string): Promise<{ id: string; name: string } | null> => {
  try {
    const response = await axiosInstance.get(`/api/core/items/${itemId}/owningCollection`);
    
    return {
      id: response.data.id,
      name: response.data.name,
    };
  } catch (error) {
    console.error("Fetch owning collection error:", error);
    return null;
  }
};

/**
 * Delete an item
 */
export const deleteItem = async (itemId: string): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/core/items/${itemId}`);
    return true;
  } catch (error) {
    console.error("Delete item error:", error);
    return false;
  }
};

/**
 * Update item metadata
 */
export const updateItemMetadata = async (
  itemId: string,
  operations: Array<{
    op: "add" | "replace" | "remove";
    path: string;
    value?: any;
  }>
): Promise<boolean> => {
  try {
    await axiosInstance.patch(`/api/core/items/${itemId}`, operations);
    return true;
  } catch (error) {
    console.error("Update item metadata error:", error);
    return false;
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
    
    const response = await axiosInstance.get(
      `/api/core/bitstreams/${bitstreamId}/content`,
      {
        headers: {
          Authorization: authToken || "",
        },
        responseType: "blob",
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
 * Upload bitstream to bundle
 */
export const uploadBitstream = async (
  bundleId: string,
  file: File
): Promise<Bitstream | null> => {
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
      _links: response.data._links,
    };
  } catch (error) {
    console.error("Upload bitstream error:", error);
    return null;
  }
};

/**
 * Get metadata value helper
 */
export const getMetadataValue = (
  metadata: ItemMetadata,
  field: string,
  defaultValue = ""
): string => {
  const values = metadata[field];
  if (values && values.length > 0) {
    return values[0].value;
  }
  return defaultValue;
};

/**
 * Get all metadata values for a field
 */
export const getMetadataValues = (
  metadata: ItemMetadata,
  field: string
): string[] => {
  const values = metadata[field];
  if (values && values.length > 0) {
    return values.map((v) => v.value);
  }
  return [];
};

/**
 * Get thumbnail URL for item
 */
export const getThumbnailUrl = (item: Item): string | null => {
  if (item.thumbnail?._links?.content?.href) {
    return item.thumbnail._links.content.href;
  }
  return null;
};
