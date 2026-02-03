# DSpace Integration Implementation Guide
## Quick Start for Completing the Integration

This guide provides step-by-step instructions to complete the DSpace integration.

---

## Step 1: Install Missing Dependencies

```bash
npm install pdfjs-dist@3.11.174 react-dropzone@14.2.3
```

---

## Step 2: Update App.tsx with All Routes

Add these imports at the top of `App.tsx`:

```tsx
import UserManagement from "./pages/UserManagement";
import GroupManagement from "./pages/GroupManagement";
import WorkflowManagement from "./pages/WorkflowManagement";
import CreateItem from "./pages/CreateItem";
import EditItem from "./pages/EditItem";
import CreateCollection from "./pages/CreateCollection";
import ProcessMonitor from "./pages/ProcessMonitor";
import MetadataRegistry from "./pages/MetadataRegistry";
import PDFViewer from "./pages/PDFViewer";
```

Add these routes inside the `<Routes>` component:

```tsx
{/* Admin Routes */}
<Route
  path="/users"
  element={
    <ProtectedRoute adminOnly>
      <UserManagement />
    </ProtectedRoute>
  }
/>
<Route
  path="/groups"
  element={
    <ProtectedRoute adminOnly>
      <GroupManagement />
    </ProtectedRoute>
  }
/>
<Route
  path="/workflow"
  element={
    <ProtectedRoute>
      <WorkflowManagement />
    </ProtectedRoute>
  }
/>
<Route
  path="/items/create"
  element={
    <ProtectedRoute adminOnly>
      <CreateItem />
    </ProtectedRoute>
  }
/>
<Route
  path="/items/:id/edit"
  element={
    <ProtectedRoute>
      <EditItem />
    </ProtectedRoute>
  }
/>
<Route
  path="/collections/create"
  element={
    <ProtectedRoute adminOnly>
      <CreateCollection />
    </ProtectedRoute>
  }
/>
<Route
  path="/processes"
  element={
    <ProtectedRoute adminOnly>
      <ProcessMonitor />
    </ProtectedRoute>
  }
/>
<Route
  path="/metadata"
  element={
    <ProtectedRoute adminOnly>
      <MetadataRegistry />
    </ProtectedRoute>
  }
/>
<Route
  path="/pdf/:bitstreamId"
  element={
    <ProtectedRoute>
      <PDFViewer />
    </ProtectedRoute>
  }
/>
```

---

## Step 3: Create SecureImage Component

Create `src/components/bitstream/SecureImage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { fetchBitstreamContent } from "@/api/bitstreamApi";

interface SecureImageProps {
  bitstreamId: string;
  fileName: string;
  className?: string;
  alt?: string;
}

export const SecureImage = ({
  bitstreamId,
  fileName,
  className,
  alt,
}: SecureImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        const blob = await fetchBitstreamContent(bitstreamId);
        const url = URL.createObjectURL(blob);
        setImageSrc(url);
        setError(false);
      } catch (err) {
        console.error("Load image error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [bitstreamId]);

  if (loading) {
    return <div className="animate-pulse bg-muted rounded" />;
  }

  if (error) {
    return <div className="bg-muted rounded p-4 text-center">Failed to load image</div>;
  }

  return <img src={imageSrc} alt={alt || fileName} className={className} />;
};
```

---

## Step 4: Update ProtectedRoute Component

Update `src/components/auth/ProtectedRoute.tsx` to support admin-only routes:

```tsx
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
```

---

## Step 5: Update Index.tsx (Home Page) with DSpace Data

Update `src/pages/Index.tsx` to fetch collections:

```tsx
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { fetchAllCollections } from "@/api/collectionApi";
import { Card } from "@/components/ui/card";

const Index = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<any[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const response = await fetchAllCollections(0, 50);
      const items = response.collections;

      // Group by category (first word before underscore)
      const categoryMap: Record<string, any[]> = {};
      const standalone: any[] = [];

      items.forEach((collection) => {
        const name = collection.name;
        const parts = name.split("_");

        if (parts.length > 1) {
          const category = parts[0].charAt(0) + parts[0].slice(1).toLowerCase();
          if (!categoryMap[category]) {
            categoryMap[category] = [];
          }
          categoryMap[category].push(collection);
        } else {
          standalone.push(collection);
        }
      });

      setCategoryGroups(
        Object.entries(categoryMap).map(([category, collections]) => ({
          category,
          collections,
          isExpanded: false,
        }))
      );
    } catch (error) {
      console.error("Load collections error:", error);
    }
  };

  const handleCollectionClick = (collectionId: string) => {
    navigate(`/search?scope=${collectionId}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-muted-foreground">Browse document collections</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryGroups.map((group) => (
            <div key={group.category} className="space-y-2">
              <h2 className="text-lg font-semibold">{group.category}</h2>
              {group.collections.map((collection: any) => (
                <Card
                  key={collection.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleCollectionClick(collection.id)}
                >
                  <h3 className="font-medium">{collection.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {collection.metadata["dc.description"]?.[0]?.value || "No description"}
                  </p>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
```

---

## Step 6: Update Search.tsx with DSpace Integration

Add search API integration to `src/pages/Search.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { searchObjects, fetchFacetValues } from "@/api/searchApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const scope = searchParams.get("scope") || "";

  useEffect(() => {
    if (query || scope) {
      performSearch();
    }
  }, [page, scope]);

  const performSearch = async () => {
    try {
      setLoading(true);
      const response = await searchObjects({
        query,
        page,
        size: 20,
        scope,
        configuration: "default",
        dsoType: "item",
      });

      const objects = response.searchResult._embedded?.objects || [];
      setResults(
        objects.map((obj: any) => obj._embedded?.indexableObject || {})
      );
      setTotalPages(response.searchResult.page?.totalPages || 0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    performSearch();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Search</h1>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Search documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((item) => (
              <Card
                key={item.uuid}
                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/documents/${item.uuid}`)}
              >
                <h3 className="font-medium">
                  {item.metadata["dc.title"]?.[0]?.value || "Untitled"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.metadata["dc.contributor.author"]?.[0]?.value || "Unknown author"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {item.metadata["dc.date.issued"]?.[0]?.value || ""}
                </p>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="py-2 px-4">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Search;
```

---

## Step 7: Update DocumentDetail.tsx with Bitstreams

Add bitstream display to `src/pages/DocumentDetail.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchItemById, fetchItemBundles } from "@/api/itemApi";
import { fetchBundleBitstreams, downloadBitstream } from "@/api/bitstreamApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";
import { SecureImage } from "@/components/bitstream/SecureImage";

const DocumentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [bitstreams, setBitstreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const itemData = await fetchItemById(id!, ["thumbnail"]);
      setItem(itemData);

      // Fetch bundles and bitstreams
      const bundlesResponse = await fetchItemBundles(id!);
      const originalBundle = bundlesResponse.bundles.find(
        (b) => b.name === "ORIGINAL"
      );

      if (originalBundle) {
        const bitstreamsResponse = await fetchBundleBitstreams(originalBundle.id);
        setBitstreams(bitstreamsResponse.bitstreams);
      }
    } catch (error) {
      console.error("Load item error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (bitstream: any) => {
    try {
      await downloadBitstream(bitstream.id, bitstream.name);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div>Loading...</div>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <div>Item not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {item.metadata["dc.title"]?.[0]?.value || "Untitled"}
          </h1>
          <p className="text-muted-foreground">
            {item.metadata["dc.contributor.author"]?.[0]?.value || "Unknown author"}
          </p>
        </div>

        {item.thumbnail && (
          <Card className="p-4">
            <SecureImage
              bitstreamId={item.thumbnail.id}
              fileName={item.thumbnail.name}
              className="max-w-md mx-auto"
            />
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Metadata</h2>
          <dl className="space-y-2">
            {Object.entries(item.metadata).map(([key, values]: [string, any]) => (
              <div key={key}>
                <dt className="font-medium text-sm text-muted-foreground">{key}</dt>
                <dd className="mt-1">
                  {(values as any[]).map((v, i) => (
                    <div key={i}>{v.value}</div>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        {bitstreams.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Files</h2>
            <div className="space-y-2">
              {bitstreams.map((bitstream) => (
                <div
                  key={bitstream.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    <div>
                      <div className="font-medium">{bitstream.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(bitstream.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(bitstream)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default DocumentDetail;
```

---

## Step 8: Configure Backend Connection

Update `src/config/siteConfig.ts` with your DSpace backend URL:

```typescript
export const siteConfig = {
  // ... existing config ...
  
  // Update this to point to your DSpace backend
  apiEndpoint: "http://your-dspace-server:8080/server",
  
  // Update this to your frontend URL
  uiUrl: "http://localhost:5173",
  
  // ... rest of config ...
};
```

---

## Step 9: Test the Integration

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test authentication:**
   - Go to `/login`
   - Enter DSpace credentials
   - Verify redirect to dashboard

3. **Test search:**
   - Navigate to `/search`
   - Enter search query
   - Verify results display

4. **Test user management:**
   - Navigate to `/users` (admin only)
   - Try creating a user
   - Test edit and delete

5. **Test document viewing:**
   - Click on a search result
   - Verify metadata displays
   - Test file download

---

## Step 10: Backend CORS Configuration

Ensure your DSpace backend has CORS enabled. Add to `[dspace]/config/local.cfg`:

```properties
# CORS configuration
rest.cors.allowed-origins = http://localhost:5173
rest.cors.allowed-methods = GET, POST, PUT, PATCH, DELETE, OPTIONS
rest.cors.allowed-headers = *
rest.cors.exposed-headers = Authorization, DSPACE-XSRF-TOKEN
rest.cors.allow-credentials = true
```

Restart DSpace after making changes.

---

## Troubleshooting

### Issue: 401 Unauthorized
- **Solution:** Check CSRF token is being sent
- Verify `withCredentials: true` in axios config
- Check backend CORS settings

### Issue: CORS errors
- **Solution:** Add frontend URL to `rest.cors.allowed-origins`
- Ensure `withCredentials: true`
- Check backend is running

### Issue: No results in search
- **Solution:** Verify items exist in DSpace
- Check search scope parameter
- Verify API endpoint URL

### Issue: Files won't download
- **Solution:** Check auth token in request
- Verify bitstream permissions
- Check Content-Disposition headers

---

## Next Steps

After completing these steps:

1. Create remaining pages (GroupManagement, WorkflowManagement, etc.)
2. Add form validation
3. Implement error boundaries
4. Add loading states
5. Create comprehensive test suite
6. Add analytics/monitoring
7. Create deployment documentation

---

## Resources

- DSpace 7 REST API Documentation: https://wiki.lyrasis.org/display/DSDOC7x/REST+API
- DSpace Documentation: https://wiki.lyrasis.org/display/DSDOC7x
- React Router Docs: https://reactrouter.com/
- TanStack Query Docs: https://tanstack.com/query/latest

---

**Last Updated:** February 1, 2026
