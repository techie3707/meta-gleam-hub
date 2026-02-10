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
// Export policyApi excluding deleteResourcePolicy to avoid conflict with resourcePolicyApi
export {
  getResourcePolicies,
  createResourcePolicyForEPerson,
  createResourcePolicyForGroup,
  updateResourcePolicyGroup,
  updateResourcePolicyMetadata,
  POLICY_TYPES,
  ACTION_TYPES,
  type Policy,
  type ResourcePolicyData,
  type ResourcePolicyResponse,
} from "./policyApi";

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

// Export new APIs per documentation (avoiding duplicates)
export * from "./cartApi";
export * from "./resourcePolicyApi";
export {
  startBatchImport,
  getProcessStatus as getBatchProcessStatus,
  getProcessOutput,
  listProcesses as listBatchProcesses,
  type BatchImportProcess,
  type ProcessDetails,
  type ProcessFile,
} from "./batchImportApi";
export {
  createWorkspaceItemWithDefinition,
  getWorkspaceItem,
  getMyWorkspaceItems,
  uploadToWorkspaceItem,
  grantLicense,
  fetchSubmissionFormConfig,
  updateWorkspaceItemMetadata,
  submitToWorkflow,
  deleteWorkspaceItem,
} from "./workspaceItemApi";
export type { SubmissionFormConfig } from "@/types/submission";

export { default as axiosInstance } from "./axiosInstance";
