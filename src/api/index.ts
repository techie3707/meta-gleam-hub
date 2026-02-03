/**
 * API Index
 * Export all API functions
 */

export * from "./authApi";
export * from "./csrfApi";
export * from "./searchApi";
export * from "./collectionApi";
export * from "./communityApi";
export * from "./userApi";
export * from "./groupApi";
export * from "./workflowApi";
export * from "./processApi";
export * from "./reportApi";
export * from "./metadataApi";

// Export itemApi but exclude Bitstream-related exports (use bitstreamApi instead)
export {
  fetchItemById,
  updateItemMetadata,
  deleteItem,
  fetchItemBundles,
  fetchItemWithBitstreams,
  fetchOwningCollection,
  getMetadataValue,
  getMetadataValues,
  getThumbnailUrl,
  type Item,
  type Bundle,
  type ItemMetadata,
  type ItemListResponse,
} from "./itemApi";

// Export all bitstream functions (primary source for Bitstream operations)
export * from "./bitstreamApi";

// Export statistics and analytics APIs
export * from "./statisticsApi";
export * from "./contentReportApi";
export * from "./healthApi";
export * from "./discoveryApi";

export { default as axiosInstance } from "./axiosInstance";
