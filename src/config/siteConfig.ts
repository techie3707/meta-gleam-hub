/**
 * Site Configuration
 * Centralized configuration for the DSpace DMS application
 */

export const siteConfig = {
  // Application name
  name: "EasySmartDocs",
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
  // NOTE: Use Solr indexFieldName values (not DC metadata field names)
  sidebarFacets: [
    { name: "author", label: "Author", size: 5 },
    { name: "assetid", label: "Asset ID", size: 5 },
    { name: "invoiceNumber", label: "Invoice Number", size: 5 },
    { name: "VendorName", label: "Vendor Name", size: 5 },
    { name: "empid", label: "Employee ID", size: 5 },
    { name: "ContractStatus", label: "Contract Status", size: 5 },
    { name: "ContractOwner", label: "Contract Owner", size: 5 },
    { name: "organization", label: "Organization", size: 5 },
    { name: "DocType", label: "Document Type", size: 5 },
    { name: "Material", label: "Material", size: 5 },
    { name: "Status", label: "Status", size: 5 },
    { name: "EmpName", label: "Employee Name", size: 5 },
    { name: "subject", label: "Subject", size: 5 },
    { name: "dc.date.issued", label: "Issued Date", size: 5 },
    { name: "entityType", label: "Entity Type", size: 5 },
    { name: "has_content_in_original_bundle", label: "Has Files", size: 2 },
  ],

  // View Configuration
  viewOptions: {
    defaultView: "grid" as "grid" | "list",
    thumbnailSize: { width: 200, height: 200 },
    showMetadataFields: [
      "dc.contributor.author",
      "dc.DocType",
      "dc.Status",
      "dc.organization",
      "dc.date.issued",
      "dspace.entity.type",
      "dc.description.abstract",
      "dc.assetid",
      "dc.invoiceNumber",
    ],
  },

  // Metadata Fields for Display
  metadataLabels: {
    "dc.contributor.author": "Author",
    "dc.assetid": "Asset ID",
    "dc.invoiceNumber": "Invoice Number",
    "dc.VendorName": "Vendor Name",
    "dc.empid": "Employee ID",
    "dc.ContractStatus": "Contract Status",
    "dc.ContractOwner": "Contract Owner",
    "dc.ContractValue": "Contract Value",
    "dc.organization": "Organization",
    "dc.DocType": "Document Type",
    "dc.Material": "Material",
    "dc.PaymentTerms": "Payment Terms",
    "dc.Quantity": "Quantity",
    "dc.Status": "Status",
    "dc.TotalValue": "Total Value",
    "dc.UnitPrice": "Unit Price",
    "dc.hrDocNo": "HR Document Number",
    "dc.EmpName": "Employee Name",
    "dc.description.abstract": "Diagnosis",
    "dc.subject": "Subject",
    "dc.date.issued": "Issued Date",
    "dspace.entity.type": "Entity Type",
    "dc.date.created": "Date Created",
    "dc.filenumber": "File Number",
    "dc.publisher": "Publisher",
    "dc.title": "Title",
    "dc.description": "Description",
    "dc.type": "Type",
    "dc.identifier.uri": "URI",
    "dc.identifier.doi": "DOI",
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
    enabled: false,
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
      { name: "My Cart", href: "/my-cart", icon: "ShoppingCart" },
      { name: "Supervision", href: "/workflowSearch", icon: "GitBranch" },
      { name: "Workflow Task", href: "/workflowTask", icon: "CheckSquare" },
    ],
    admin: [
      { name: "Create Item", href: "/items/create", icon: "FileText" },
      { name: "Edit Community", href: "/communities/edit", icon: "FolderTree" },
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
