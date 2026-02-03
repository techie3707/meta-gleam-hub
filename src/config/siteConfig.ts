/**
 * Site Configuration
 * Centralized configuration for the DSpace DMS application
 */

export const siteConfig = {
  // Application name
  name: "DocVault",
  description: "Document Management System",

  // API Configuration
  // Change this to your DSpace server URL (e.g., "http://your-server:8080/server")
  apiEndpoint: "http://localhost:8080/server",
  
  // UI Configuration  
  uiUrl: "http://localhost:4000",
  
  // Pagination
  itemsPerPage: 10,
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50, 100],

  // File Upload
  maxFileSize: 52428800, // 50MB
  allowedFileTypes: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".gif", ".webp"],
  
  // Search Configuration
  searchConfiguration: "default",
  defaultSort: "score,DESC",
  
  // Sidebar Facets Configuration
  sidebarFacets: [
    { name: "author", label: "Author", size: 5 },
    { name: "subject", label: "Subject", size: 5 },
    { name: "dateIssued", label: "Date Issued", size: 5 },
    { name: "has_content_in_original_bundle", label: "Has Files", size: 2 },
    { name: "entityType", label: "Entity Type", size: 5 },
  ],

  // View Configuration
  viewOptions: {
    defaultView: "grid" as "grid" | "list",
    thumbnailSize: { width: 200, height: 200 },
    showMetadataFields: [
      "dc.title",
      "dc.contributor.author",
      "dc.date.issued",
      "dc.description.abstract",
      "dc.subject",
      "dc.type",
    ],
  },

  // Metadata Fields for Display
  metadataLabels: {
    "dc.title": "Title",
    "dc.contributor.author": "Author",
    "dc.date.issued": "Date Issued",
    "dc.description.abstract": "Abstract",
    "dc.description": "Description",
    "dc.subject": "Subject",
    "dc.type": "Type",
    "dc.identifier.uri": "URI",
    "dc.identifier.doi": "DOI",
    "dc.publisher": "Publisher",
    "dc.language.iso": "Language",
    "dc.rights": "Rights",
    "dc.format.extent": "Format",
  } as Record<string, string>,

  // Authentication
  auth: {
    tokenKey: "authToken",
    userIdKey: "userId",
    isAdminKey: "isAdmin",
    csrfCookieName: "DSPACE-XSRF-COOKIE",
    csrfHeaderName: "X-XSRF-TOKEN",
  },

  // Collection Grouping
  collectionGrouping: {
    enabled: true,
    separator: "_",
  },

  // Features
  features: {
    batchImport: true,
    workflow: true,
    userManagement: true,
    groupManagement: true,
    metadataRegistry: true,
    processes: true,
  },

  // Navigation Items (configurable)
  navigation: {
    main: [
      { name: "Dashboard", href: "/", icon: "LayoutDashboard" },
      { name: "Search", href: "/search", icon: "Search" },
      { name: "Import", href: "/import", icon: "Upload" },
      { name: "Collections", href: "/collections", icon: "FolderOpen" },
      { name: "Documents", href: "/documents", icon: "FileText" },
      { name: "Tasks", href: "/tasks", icon: "CheckSquare" },
      { name: "Billing", href: "/billing", icon: "Receipt" },
    ],
    admin: [
      { name: "Create Item", href: "/items/create", icon: "FileText" },
      { name: "Create Collection", href: "/collections/create", icon: "FolderOpen" },
      { name: "Users", href: "/users", icon: "Users" },
      { name: "Groups", href: "/groups", icon: "Users" },
      { name: "Workflow", href: "/workflow", icon: "GitBranch" },
      { name: "Processes", href: "/processes", icon: "Activity" },
      { name: "Metadata", href: "/metadata", icon: "Database" },
    ],
    bottom: [
      { name: "Settings", href: "/settings", icon: "Settings" },
    ],
  },
};

// Export type for siteConfig
export type SiteConfig = typeof siteConfig;
