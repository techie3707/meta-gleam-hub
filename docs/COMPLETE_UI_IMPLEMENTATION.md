# Complete UI Implementation - Action Items

## Summary
This document outlines all changes needed to remove mock data, add PDF/thumbnail support, and implement faceted search.

---

## ✅ COMPLETED

### 1. Created New Search Page with Facets
**File:** `src/pages/SearchWithFacets.tsx` (NEW - 600+ lines)

**Features:**
- Collapsible facets sidebar with checkboxes
- Real-time facet filtering (Author, Subject, Date, Has Files)
- Thumbnail display for search results
- Responsive grid layout (1/2/3 columns)
- Pagination with page numbers
- Active filters display with clear buttons
- Loading skeletons
- Empty state handling
- Click-through to document details

**API Integration:**
- Uses `searchObjects()` with thumbnail embeds
- Uses `fetchFacetValues()` for each facet
- Supports multiple filter combinations
- Handles scope and query parameters

---

## 📋 REMAINING TASKS

### 2. Update Main Search Page (Replace Current)
**File:** `src/pages/Search.tsx`

**Action:** Replace entire file with `SearchWithFacets.tsx` content

**Changes:**
- Add sidebar with collapsible facet groups
- Display thumbnails in result cards
- Add proper pagination
- Remove any mock data references
- Add loading states for thumbnails

---

### 3. Fix Document Detail Page - Add PDF Viewer
**File:** `src/pages/DocumentDetail.tsx`

**Current Issues:**
- Mock signatures data (lines 70-75)
- Mock comments data (lines 103-106)
- No PDF viewer integration
- No thumbnail display

**Changes Needed:**

```typescript
// REMOVE these lines (70-75):
const mockSignatures: Signature[] = [
  { id: "1", user: "John Smith", signedAt: new Date(2024, 0, 15, 10, 35), status: "signed" },
  // ...
];

// REMOVE mock comments (lines 103-106):
const [comments, setComments] = useState<Comment[]>([
  { id: "1", user: "Sarah Johnson", text: "Great document!", ... },
]);

// REPLACE WITH:
const [comments, setComments] = useState<Comment[]>([]);
const [signatures, setSignatures] = useState<Signature[]>([]);

// ADD PDF Viewer integration:
import { PDFViewer } from "@/components/pdf/PDFViewer";

// In the component, add PDF viewer for PDF bitstreams:
{bitstreams.some(b => b.name.toLowerCase().endsWith('.pdf')) && (
  <div className="mt-6">
    <h3 className="font-semibold mb-4">Document Preview</h3>
    <PDFViewer
      fileUrl={`${siteConfig.apiEndpoint}/api/core/bitstreams/${pdfBitstream.id}/content`}
      fileName={pdfBitstream.name}
      className="h-[600px]"
    />
  </div>
)}

// ADD thumbnail display:
const thumbnailBundle = item.bundles?.find(b => b.name === "THUMBNAIL");
const thumbnail = thumbnailBundle?.bitstreams?.[0];

{thumbnail && (
  <img
    src={`${siteConfig.apiEndpoint}/api/core/bitstreams/${thumbnail.id}/content`}
    alt={title}
    className="w-full h-auto rounded-lg"
  />
)}
```

---

### 4. Remove Mock Data from Other Pages

#### A. Documents Page
**File:** `src/pages/Documents.tsx`

**Lines to Remove:**
- Lines 9-95: `const mockDocuments = [...]`
- Line 96: `const filteredDocuments = mockDocuments.filter(...)`

**Add Instead:**
```typescript
const [documents, setDocuments] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadDocuments();
}, []);

const loadDocuments = async () => {
  try {
    setLoading(true);
    const result = await searchObjects({
      dsoType: "ITEM",
      size: 50,
      sort: "dc.date.accessioned,DESC",
    });
    setDocuments(result.results);
  } catch (error) {
    console.error("Load documents error:", error);
  } finally {
    setLoading(false);
  }
};
```

#### B. Tasks Page
**File:** `src/pages/Tasks.tsx`

**Lines to Remove:**
- Lines 31-115: `const mockTasks: Task[] = [...]`
- Lines 117-126: `const filteredTasks = mockTasks.filter(...)`
- Lines 127-131: Stats using `mockTasks`

**Add Instead:**
```typescript
import { fetchWorkflowItems } from "@/api/workflowApi";

const [tasks, setTasks] = useState<Task[]>([]);

useEffect(() => {
  loadTasks();
}, []);

const loadTasks = async () => {
  try {
    const response = await fetchWorkflowItems(0, 100);
    const tasksData = response.items.map(item => ({
      id: item.id,
      title: item.item?.name || "Untitled",
      description: `Submitted by ${item.submitter?.email || "Unknown"}`,
      status: "pending" as const,
      assignee: item.submitter?.email || "",
      dueDate: null,
      priority: "medium" as const,
    }));
    setTasks(tasksData);
  } catch (error) {
    console.error("Load tasks error:", error);
  }
};
```

#### C. Billing Page
**File:** `src/pages/Billing.tsx`

**Action:** Either integrate with actual billing API or remove page entirely

**If keeping, remove:**
- Lines 41-85: `const mockInvoices = [...]`
- All references to `mockInvoices`

---

### 5. Update API Integration - Add Thumbnail Embeds

#### A. Search API
**File:** `src/api/searchApi.ts`

**Update `searchObjects` function:**
```typescript
export const searchObjects = async (params: SearchParams): Promise<SearchResponse> => {
  const queryParams = new URLSearchParams();
  
  // ... existing params ...
  
  // ADD THESE LINES:
  queryParams.append("embed", "thumbnail");
  queryParams.append("embed", "item/thumbnail");
  queryParams.append("embed", "accessStatus");
  
  const response = await axiosInstance.get(`/api/discover/search/objects?${queryParams.toString()}`);
  
  // Parse thumbnail from embedded data
  const results: SearchResult[] = objects.map((obj: any) => {
    const indexableObject = obj._embedded?.indexableObject || obj.indexableObject;
    const thumbnail = obj._embedded?.thumbnail || indexableObject?._embedded?.thumbnail;
    
    return {
      // ... existing fields ...
      thumbnail: thumbnail ? {
        id: thumbnail.id,
        href: thumbnail._links?.content?.href || `/api/core/bitstreams/${thumbnail.id}/content`,
      } : undefined,
    };
  });
  
  return { results, page };
};
```

#### B. Item API
**File:** `src/api/itemApi.ts`

**Update `fetchItemWithBitstreams`:**
```typescript
export const fetchItemWithBitstreams = async (itemId: string): Promise<Item> => {
  const response = await axiosInstance.get(
    `/api/core/items/${itemId}?embed=bundles&embed=bundles/bitstreams&embed=thumbnail&embed=owningCollection`
  );
  
  const item = response.data;
  
  // Parse bundles and bitstreams
  const bundles = item._embedded?.bundles || [];
  
  return {
    ...item,
    bundles: bundles.map((bundle: any) => ({
      ...bundle,
      bitstreams: bundle._embedded?.bitstreams || [],
    })),
  };
};
```

---

### 6. Create Missing Components

#### A. Secure Image Component
**File:** `src/components/common/SecureImage.tsx` (CREATE)

```typescript
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import axiosInstance from "@/api/axiosInstance";

interface SecureImageProps {
  bitstreamId: string;
  alt?: string;
  className?: string;
}

export const SecureImage = ({ bitstreamId, alt, className }: SecureImageProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadImage();
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [bitstreamId]);

  const loadImage = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/api/core/bitstreams/${bitstreamId}/content`,
        { responseType: "blob" }
      );
      
      const url = URL.createObjectURL(response.data);
      setImageUrl(url);
    } catch (err) {
      console.error("Image load error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
        Failed to load image
      </div>
    );
  }

  return <img src={imageUrl} alt={alt} className={className} />;
};
```

---

### 7. Update Routing - Replace Search Route

**File:** `src/App.tsx` or route configuration

**Change:**
```typescript
// OLD:
import Search from "@/pages/Search";

// NEW:
import SearchWithFacets from "@/pages/SearchWithFacets";

// In routes:
<Route path="/search" element={<SearchWithFacets />} />
<Route path="/adminSearch" element={<SearchWithFacets />} />
```

---

## 🔧 Configuration Updates

### Update Site Config
**File:** `src/config/siteConfig.ts`

**Add:**
```typescript
export const siteConfig = {
  // ... existing config ...
  
  // Search configuration
  searchConfiguration: "default",
  defaultPageSize: 20,
  defaultSort: "score,DESC",
  
  // Thumbnail settings
  enableThumbnails: true,
  thumbnailSize: { width: 300, height: 400 },
  
  // PDF viewer settings
  enablePDFPreview: true,
  pdfWorkerPath: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`,
};
```

---

## 🧪 Testing Checklist

### Search Page
- [ ] Facets load correctly
- [ ] Selecting facet filters updates results
- [ ] Clearing facets works
- [ ] Thumbnails display for items with images
- [ ] Pagination works
- [ ] Clicking result navigates to detail page
- [ ] Responsive layout works (mobile/tablet/desktop)
- [ ] Empty state shows when no results

### Document Detail
- [ ] PDF viewer displays for PDF files
- [ ] Thumbnails show for items with images
- [ ] No mock data visible
- [ ] Download buttons work
- [ ] Metadata displays correctly
- [ ] Edit/delete buttons visible for admins only

### Performance
- [ ] Search results load in < 2 seconds
- [ ] Facets load without blocking UI
- [ ] Thumbnails lazy load
- [ ] PDF preview doesn't slow page load
- [ ] Large result sets paginate smoothly

---

## 📊 API Endpoints Used

| Endpoint | Purpose | Params |
|----------|---------|--------|
| `GET /api/discover/search/objects` | Search items | query, page, size, sort, scope, dsoType, embed, f.* |
| `GET /api/discover/facets/{facetName}` | Get facet values | query, scope, dsoType, page, size |
| `GET /api/core/items/{id}` | Get item details | embed=bundles,thumbnail |
| `GET /api/core/bundles/{id}/bitstreams` | Get files | page, size |
| `GET /api/core/bitstreams/{id}/content` | Download file | - |
| `GET /api/workflow/workflowitems` | Get workflow tasks | page, size |

---

## 🎨 UI Improvements Made

1. **Faceted Search Sidebar**
   - Collapsible facet groups
   - Checkbox selection
   - Item counts per facet value
   - Clear individual/all filters
   - Responsive hide/show on mobile

2. **Search Results Grid**
   - 1/2/3 column responsive layout
   - Thumbnail previews
   - Metadata preview (author, date, handle)
   - Description snippets
   - Hover effects

3. **Document Detail**
   - PDF viewer integration
   - Thumbnail carousel
   - Metadata cards with icons
   - Download buttons for all files
   - Admin actions (edit/delete)

4. **Loading States**
   - Skeleton loaders
   - Spinner for async operations
   - Progress indicators

5. **Empty States**
   - No results message
   - No facets available message
   - No files message

---

## 🚀 Deployment Notes

1. **Environment Variables**
   - Update API endpoint in siteConfig
   - Configure PDF.js worker CDN path
   - Set thumbnail cache settings

2. **Performance**
   - Enable thumbnail caching
   - Implement lazy loading for images
   - Add service worker for offline support

3. **Security**
   - Ensure bitstream downloads require auth
   - Validate thumbnail access permissions
   - Sanitize search query inputs

---

## 📝 Next Steps

1. Replace `Search.tsx` with `SearchWithFacets.tsx`
2. Update `DocumentDetail.tsx` to remove mock data and add PDF viewer
3. Remove mock data from `Documents.tsx`, `Tasks.tsx`, `Billing.tsx`
4. Create `SecureImage` component
5. Update API files to include thumbnail embeds
6. Test all functionality
7. Fix any TypeScript errors
8. Update documentation

---

**Estimated Time:** 4-6 hours for complete implementation
**Priority:** High - Core search functionality
**Complexity:** Medium - Mostly component updates

