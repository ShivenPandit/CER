// User-provided fetch hooks modeled after reference project
export * from "./fetchHooks";

// Dynamic pagination hook
export * from "./useDynamicPagination";

// Specialized SharePoint operations
export {
  SharePointOperations,
  useSharePointOperations,
  ISPListResponse,
  ISPCreateResult,
  ISPFileUploadResult,
  ISPGetOptions,
} from "./useSharePointOperations";
