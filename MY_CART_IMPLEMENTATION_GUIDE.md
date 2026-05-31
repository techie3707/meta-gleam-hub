# My Cart Functionality: Implementation Guide

## Overview

This document provides a comprehensive guide for implementing the **My Cart** functionality in another instance. The feature allows authenticated users to maintain a shopping cart of documents (bitstreams) with the ability to download them individually with optional watermarking.

---

## Architecture Overview

### Cart Storage Model

Cart items are stored as **user metadata** in the DSpace backend under the `eperson.cart` field:

```
User (EPerson)
    └── metadata
        └── eperson.cart: [
            "itemId_bitstreamId_dateAdded_pageRange",
            "itemId_bitstreamId_dateAdded_pageRange",
            ...
        ]
```

### Cart Item Format

Each cart entry follows this pattern:

```
{itemUUID}_{bitstreamUUID}_{YYYY-MM-DD}_{pageRange}

Examples:
- "550e8400-e29b-41d4-a716-446655440000_660e8400-e29b-41d4-a716-446655440001_2026-03-30_"
- "550e8400-e29b-41d4-a716-446655440000_660e8400-e29b-41d4-a716-446655440001_2026-03-30_1-10,15-20"
```

**Components:**
- **itemUUID**: 36-character UUID of the source item
- **bitstreamUUID**: 36-character UUID of the document file
- **dateAdded**: Date cart item was added (YYYY-MM-DD format)
- **pageRange**: Optional page specification (empty or "1-10,15-20" format)

---

## API Endpoints and Data Structures

### 1. Update User Cart (Add Item)

**URL:** `PATCH /api/eperson/epersons/{userId}`

**Request Payload:**
```json
[
  {
    "op": "add",
    "path": "/metadata/eperson.cart",
    "value": "550e8400-e29b-41d4-a716-446655440000_660e8400-e29b-41d4-a716-446655440001_2026-03-30_"
  }
]
```

**Response:** HTTP 200 with updated user object

### 2. Fetch User Data (Including Cart)

**URL:** `GET /api/eperson/epersons/{userId}`

**Response:**
```json
{
  "id": "user-123",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "name": "john.doe@example.com",
  "email": "john.doe@example.com",
  "metadata": {
    "eperson.firstname": [{ "value": "John" }],
    "eperson.lastname": [{ "value": "Doe" }],
    "eperson.cart": [
      { "value": "550e8400-e29b-41d4-a716-446655440000_660e8400-e29b-41d4-a716-446655440001_2026-03-30_" },
      { "value": "550e8400-e29b-41d4-a716-446655440002_660e8400-e29b-41d4-a716-446655440003_2026-03-25_1-10" }
    ]
  }
}
```

### 3. Fetch Bitstream Details

**URL:** `GET /api/core/bitstreams/{bitstreamId}`

**Response:**
```json
{
  "id": "bitstream-456",
  "uuid": "660e8400-e29b-41d4-a716-446655440001",
  "name": "document.pdf",
  "metadata": {
    "dc.title": [{ "value": "Medical Report" }],
    "dc.description": [{ "value": "Patient medical report" }]
  }
}
```

### 4. Download Bitstream Content

**URL:** `GET /api/core/bitstreams/{bitstreamId}/content`

**Response:** PDF file binary content

---

## Implementation Details

### Step 1: Cart API Module (`cart.ts`)

Create the cart API utility for cart operations:

```typescript
import { siteConfig } from "../data/data";
import axios from "axios";
import { showToast } from "../contexts/ToastProvider";

// Add item to user's cart
export const updateUserCart = async (
  userID: string,
  bitstreamUUID: string,
  itemUUID?: string,
  pageRange?: string
): Promise<void> => {
  const authToken = localStorage.getItem("authToken") || "";
  const csrfToken = localStorage.getItem("csrfToken") || "";

  // Format: itemUUID_bitstreamUUID_dateAdded_pageRange
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const cartValue = itemUUID
    ? `${itemUUID}_${bitstreamUUID}_${today}_${pageRange || ""}`
    : `${bitstreamUUID}_${today}_${pageRange || ""}`;

  const payload = [
    {
      op: "add",
      path: "/metadata/eperson.cart",
      value: cartValue,
    },
  ];

  try {
    await axios.patch(
      `${siteConfig.apiEndpoint}/api/eperson/epersons/${userID}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
          Authorization: authToken,
        },
        withCredentials: true,
      }
    );
    showToast("Item added to cart!", "success");
  } catch (error) {
    showToast("Failed to add item to cart", "error");
    throw error;
  }
};

// Remove item from user's cart
export const removeFromCart = async (
  userID: string,
  cartItemValue: string
): Promise<void> => {
  const authToken = localStorage.getItem("authToken") || "";
  const csrfToken = localStorage.getItem("csrfToken") || "";

  const payload = [
    {
      op: "remove",
      path: "/metadata/eperson.cart",
      value: cartItemValue,
    },
  ];

  try {
    await axios.patch(
      `${siteConfig.apiEndpoint}/api/eperson/epersons/${userID}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
          Authorization: authToken,
        },
        withCredentials: true,
      }
    );
    showToast("Item removed from cart", "success");
  } catch (error) {
    showToast("Failed to remove item from cart", "error");
    throw error;
  }
};

// Clear entire user cart
export const clearUserCart = async (userID: string): Promise<void> => {
  const authToken = localStorage.getItem("authToken") || "";
  const csrfToken = localStorage.getItem("csrfToken") || "";

  const payload = [
    {
      op: "remove",
      path: "/metadata/eperson.cart",
    },
  ];

  try {
    await axios.patch(
      `${siteConfig.apiEndpoint}/api/eperson/epersons/${userID}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
          Authorization: authToken,
        },
        withCredentials: true,
      }
    );
    showToast("Cart cleared successfully", "success");
  } catch (error) {
    showToast("Failed to clear cart", "error");
    throw error;
  }
};
```

### Step 2: Bitstream Download with Watermark (`bitstream.ts`)

Implement PDF download functionality with optional watermarking:

```typescript
import { PDFDocument, rgb } from 'pdf-lib';
import { showToast } from "../contexts/ToastProvider";
import { siteConfig } from "../data/data";
import { getAuthHeaders } from "./searchApi";

// Parse page string (e.g., "1-3,5,7-10" => [1,2,3,5,7,8,9,10])
function parsePages(pageString: string): number[] {
  const pages = new Set<number>();

  pageString.split(',').forEach((part) => {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          pages.add(i);
        }
      }
    } else {
      const page = Number(part);
      if (!isNaN(page)) {
        pages.add(page);
      }
    }
  });

  return Array.from(pages).sort((a, b) => a - b);
}

// Download PDF with optional watermark
export const downloadPDF = async (
  bitstreamId: string,
  fileName: string,
  itemId?: string | null,
  pagesStr?: string | null,
  includeWatermark: boolean = false
) => {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...getAuthHeaders(),
    };

    // Fetch the original PDF
    const pdfResp = await fetch(
      `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`,
      { method: 'GET', headers }
    );

    if (!pdfResp.ok) {
      throw new Error('Failed to fetch PDF');
    }

    const pdfBytes = await pdfResp.arrayBuffer();
    const sourcePdf = await PDFDocument.load(pdfBytes);
    const pageCount = sourcePdf.getPageCount();
    const outPdf = await PDFDocument.create();

    // Copy requested pages (or all if not specified)
    const requestedPages = pagesStr
      ? parsePages(pagesStr)
      : Array.from({ length: pageCount }, (_, i) => i + 1);

    for (const pageNum of requestedPages) {
      if (pageNum < 1 || pageNum > pageCount) continue;

      const pages = await outPdf.copyPages(sourcePdf, [pageNum - 1]);
      const page = pages[0];

      // Add watermark if requested
      if (includeWatermark) {
        const { width, height } = page.getSize();
        page.drawText('WATERMARK', {
          x: width / 2 - 100,
          y: height / 2,
          size: 60,
          color: rgb(0.8, 0.8, 0.8),
          opacity: 0.3,
          rotate: -45,
        });
      }

      outPdf.addPage(page);
    }

    const pdfData = await outPdf.save();
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.pdf`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('PDF downloaded successfully!', 'success');
  } catch (error) {
    console.error('PDF download error:', error);
    showToast('Failed to download PDF', 'error');
  }
};
```

### Step 3: My Cart UI Component (`MyCart.tsx`)

Create the cart display and management component:

```typescript
import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableHead, TableBody,
  TableCell, TableContainer, TableRow, CircularProgress, Button,
  Checkbox, IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { getUserById } from '../../api/usermanagement';
import { downloadPDF } from '../../api/bitstream';
import { removeFromCart, clearUserCart } from '../../api/cart';
import { siteConfig } from '../../data/data';
import { getAuthHeaders } from '../../api/searchApi';
import { showToast } from '../../contexts/ToastProvider';

type MyCartProps = { userId: string };

type CartItemInfo = {
  fullValue: string;
  itemId: string;
  bitstreamId: string;
  name: string;
  date: string;
  pages: string | null;
};

type SortKey = 'name' | 'date' | null;
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' };

const MyCart: React.FC<MyCartProps> = ({ userId }) => {
  const [cartItems, setCartItems] = useState<CartItemInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'date', 
    direction: 'desc' 
  });

  // Track watermark selection per row using fullValue as unique key
  const [watermarkSelections, setWatermarkSelections] = useState<{ 
    [key: string]: boolean 
  }>({});

  useEffect(() => {
    if (userId) fetchUserCart(userId);
  }, [userId]);

  // Parse cart item format: itemId_bitstreamId_date_pages
  const parseCartItem = (raw: string) => {
    const match = raw.match(
      /^([a-f0-9-]{36})_([a-f0-9-]{36})_([\d]{4}-[\d]{2}-[\d]{2})_(.+)?$/i
    );

    if (match) {
      return {
        itemId: match[1],
        bitstreamId: match[2],
        date: match[3],
        pages: match[4] || null,
      };
    }

    return { itemId: '', bitstreamId: '', date: 'N/A', pages: null };
  };

  // Fetch user's cart from backend
  const fetchUserCart = async (id: string) => {
    setLoading(true);

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const user = await getUserById(id, authToken);
      const rawValues: string[] = (
        user.metadata?.['eperson.cart'] ?? []
      ).map((e: any) => e.value);

      // Fetch bitstream details for each cart item
      const items: CartItemInfo[] = await Promise.all(
        rawValues.map(async (raw) => {
          const { itemId, bitstreamId, date, pages } = parseCartItem(raw);
          let name = 'Unknown';

          if (bitstreamId) {
            try {
              const resp = await fetch(
                `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}`,
                { headers: getAuthHeaders() }
              );

              if (resp.ok) {
                const data = await resp.json();
                name = data.metadata?.['dc.title']?.[0]?.value || name;
              }
            } catch (err) {
              console.error(`Failed to fetch bitstream ${bitstreamId}:`, err);
            }
          }

          return { fullValue: raw, itemId, bitstreamId, name, date, pages };
        })
      );

      setCartItems(items);

      // Initialize watermark selections
      const initialSelections: { [key: string]: boolean } = {};
      items.forEach((item) => {
        initialSelections[item.fullValue] = false;
      });
      setWatermarkSelections(initialSelections);
    } catch (err) {
      console.error('Failed to load cart', err);
      showToast('Failed to load cart', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle item deletion
  const handleRemoveItem = async (cartItemValue: string) => {
    try {
      await removeFromCart(userId, cartItemValue);
      setCartItems((prev) => prev.filter((item) => item.fullValue !== cartItemValue));
      setWatermarkSelections((prev) => {
        const updated = { ...prev };
        delete updated[cartItemValue];
        return updated;
      });
    } catch (error) {
      console.error('Failed to remove item', error);
    }
  };

  // Handle clearing entire cart
  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your entire cart?')) {
      try {
        await clearUserCart(userId);
        setCartItems([]);
        setWatermarkSelections({});
      } catch (error) {
        console.error('Failed to clear cart', error);
      }
    }
  };

  // Sorting logic
  const handleSort = (key: SortKey) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const sortedItems = [...cartItems].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortSymbol = (key: SortKey) =>
    sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : '';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', maxWidth: 1000, mx: 'auto', mt: 6, p: 3, borderRadius: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" gutterBottom>My Cart</Typography>
        {cartItems.length > 0 && (
          <Button variant="outlined" color="error" onClick={handleClearCart}>
            Clear Cart
          </Button>
        )}
      </Box>

      {cartItems.length === 0 ? (
        <Box textAlign="center" py={4}>
          <ShoppingCartOutlinedIcon sx={{ fontSize: 64, color: 'grey.500', mb: 2 }} />
          <Typography variant="h6" gutterBottom>Your cart is empty.</Typography>
          <Button variant="contained" color="primary">Browse Documents</Button>
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>#</strong></TableCell>
                <TableCell 
                  onClick={() => handleSort('name')} 
                  sx={{ cursor: 'pointer' }}
                >
                  <strong>Document Name{getSortSymbol('name')}</strong>
                </TableCell>
                <TableCell 
                  onClick={() => handleSort('date')} 
                  sx={{ cursor: 'pointer' }}
                >
                  <strong>Date Added{getSortSymbol('date')}</strong>
                </TableCell>
                <TableCell><strong>Pages</strong></TableCell>
                <TableCell><strong>Watermark</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedItems.map((item, idx) => (
                <TableRow key={item.fullValue}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{item.name || '-'}</TableCell>
                  <TableCell>{item.date || '-'}</TableCell>
                  <TableCell>{item.pages || 'All'}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={watermarkSelections[item.fullValue] || false}
                      onChange={(e) =>
                        setWatermarkSelections((prev) => ({
                          ...prev,
                          [item.fullValue]: e.target.checked,
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mr: 1 }}
                      onClick={() =>
                        downloadPDF(
                          item.bitstreamId,
                          item.name,
                          item.itemId,
                          item.pages,
                          watermarkSelections[item.fullValue] || false
                        )
                      }
                    >
                      Download
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(item.fullValue)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default MyCart;
```

### Step 4: Add to MyList Button (In Item/Document Components)

Use this anywhere you want to add an item to cart:

```typescript
import { updateUserCart } from '../../api/cart';
import { getAuthStatus } from '../../api/authApi';
import { showToast } from '../../contexts/ToastProvider';

const handleAddToCart = async (
  bitstreamId: string,
  itemId: string,
  pageRange?: string
) => {
  try {
    const userId = await getAuthStatus();
    if (!userId) {
      showToast('Please login to add items to cart', 'error');
      return;
    }

    await updateUserCart(userId, bitstreamId, itemId, pageRange);
  } catch (error) {
    console.error('Error adding to cart:', error);
  }
};

// Usage in JSX
<Button
  variant="contained"
  color="primary"
  onClick={() => handleAddToCart(bitstreamId, itemId)}
>
  Add to MyList
</Button>
```

---

## Integration Steps

### Prerequisites

- Authentication system with `authToken` in localStorage
- CSRF token management in localStorage
- Toast notification system
- Axios HTTP client
- Material-UI components library
- pdf-lib and html2canvas packages
- Site configuration with API endpoint

### Implementation Checklist

1. **Install Dependencies**
   - [ ] `npm install pdf-lib`
   - [ ] `npm install html2canvas`
   - [ ] Ensure Material-UI installed: `npm install @mui/material @mui/icons-material`

2. **Copy API Modules**
   - [ ] Copy `cart.ts` to `src/api/`
   - [ ] Update/merge `bitstream.ts` with download function
   - [ ] Copy `usermanagement.ts` (if not already present)

3. **Create UI Components**
   - [ ] Create `src/pages/my-cart/MyCart.tsx`
   - [ ] Create route: `/my-cart` → `MyCart` component
   - [ ] Add cart link to navigation/header

4. **Add Cart Buttons**
   - [ ] Add "Add to MyList" button in item/document detail pages
   - [ ] Import and call `updateUserCart()` function
   - [ ] Show success/error toasts

5. **Update Navigation**
   - [ ] Add "My Cart" link to sidebar/header
   - [ ] Pass `userId` prop to MyCart component
   - [ ] Handle unauthenticated users gracefully

6. **Test the Flow**
   - [ ] Login as test user
   - [ ] Add items to cart
   - [ ] Verify cart persists (refresh page)
   - [ ] Test sorting (by name, date)
   - [ ] Test PDF download
   - [ ] Test watermark functionality
   - [ ] Test remove item
   - [ ] Test clear cart

---

## Data Flow Diagram

```
User Action: "Add to MyList"
        ↓
    getUserId()
        ↓
    Validate Auth
        ↓
    Format cart value: itemId_bitstreamId_date_pages
        ↓
    PATCH /api/eperson/epersons/{userId}
         • op: "add"
         • path: "/metadata/eperson.cart"
        ↓
    HTTP 200 + Toast "Added to cart!"
        ↓
    User Opens "My Cart"
        ↓
    GET /api/eperson/epersons/{userId}
        ↓
    Parse eperson.cart metadata array
        ↓
    For each cart item:
         • Extract itemId, bitstreamId, date, pages
         • GET bitstream details for name
        ↓
    Display in Table (sortable, selectable)
        ↓
    User clicks "Download"
        ↓
    GET /api/core/bitstreams/{bitstreamId}/content
        ↓
    Apply watermark (if selected)
        ↓
    Create PDF blob
        ↓
    Trigger browser download
        ↓
    Show success toast
```

---

## Key Features Explained

### 1. Watermarking

- **Optional per-item**: Users select which items to watermark
- **Non-destructive**: Original PDF untouched, watermark added to download only
- **Tracking**: Selection stored in component state using `fullValue` as key
- **Text overlay**: 60px "WATERMARK" text at 30% opacity, -45° rotation

### 2. Sorting

- **By Name**: Alphabetical order of documents
- **By Date**: Chronological order (newest first by default)
- **Toggle Direction**: Click column header to switch asc/desc
- **Visual Indicator**: 🔼/🔽 symbols show sort direction

### 3. Page Selection

- **Flexible format**: "1-3,5,7-10" = pages 1,2,3,5,7,8,9,10
- **Stored in cart**: Persisted with each cart item
- **Optional**: Empty if all pages requested

### 4. Persistence

- **Backend storage**: Stored in user's `eperson.cart` metadata
- **Survives refresh**: Cart data fetched on component load
- **Multi-device**: Same cart across different sessions/devices (if using same account)

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Auth token expired | Re-authenticate user |
| CSRF token missing | Session expired | Fetch new CSRF token |
| PDF download fails | Invalid bitstream ID | Verify bitstream exists |
| Watermark not applied | pdf-lib error | Check PDF format compatibility |
| Cart not persisting | Backend update failed | Check user permissions |

---

## Performance Considerations

1. **Batch Bitstream Fetches**: Fetch all bitstream details in parallel using `Promise.all()`
2. **Lazy Loading**: Consider pagination for very large carts (100+ items)
3. **Caching**: Cache bitstream metadata to avoid repeated API calls
4. **PDF Processing**: Large PDFs may take time; show progress indicator
5. **Watermark**: Heavy operation; consider background processing for large files

---

## Security Considerations

1. **Authentication**: All operations require valid auth token
2. **CSRF Protection**: All write operations include CSRF token
3. **User Isolation**: Users can only access their own cart
4. **PDF Watermarking**: Happens client-side; doesn't modify server data
5. **Download Authorization**: Bitstream download respects DSpace permissions

---

## Testing Checklist

- [ ] Add item to cart (single item, multiple items)
- [ ] Cart persists after page refresh
- [ ] Fetch cart displays all items with correct names
- [ ] Sorting by name works (ascending/descending)
- [ ] Sorting by date works (ascending/descending)
- [ ] Watermark checkbox toggles per row
- [ ] Download PDF without watermark
- [ ] Download PDF with watermark
- [ ] Download specific page ranges
- [ ] Remove individual items
- [ ] Clear entire cart with confirmation
- [ ] Empty cart shows correct message
- [ ] Auth error handled gracefully
- [ ] CSRF token error handled
- [ ] Large cart (100+ items) performance acceptable
- [ ] Mobile responsive layout

---

## Usage Example

### Complete Integration Example

```typescript
// In your item detail page component

import { updateUserCart } from '../../api/cart';
import { getAuthStatus } from '../../api/authApi';
import { Button, Box } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

const ItemDetailPage: React.FC<{ itemId: string }> = ({ itemId }) => {
  const [bitstreams, setBitstreams] = useState<any[]>([]);

  const handleAddToCart = async (bitstreamId: string) => {
    try {
      const userId = await getAuthStatus();
      
      if (!userId) {
        showToast('Please login first', 'error');
        return;
      }

      // Add to MyList without page range (all pages)
      await updateUserCart(userId, bitstreamId, itemId);
      // Success toast shown by updateUserCart function
    } catch (error) {
      console.error('Failed to Add to MyList:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h5">{item.name}</Typography>
      
      {bitstreams.map((bitstream) => (
        <Box key={bitstream.id} display="flex" gap={2} my={2}>
          <Typography flex={1}>{bitstream.name}</Typography>
          <Button
            variant="contained"
            endIcon={<ShoppingCartIcon />}
            onClick={() => handleAddToCart(bitstream.id)}
          >
            Add to MyList
          </Button>
        </Box>
      ))}
    </Box>
  );
};
```

---

## Troubleshooting Guide

### Cart not persisting

**Symptom**: Items disappear after refresh

**Solution**:
- Check auth token is valid
- Verify CSRF token is being sent
- Check backend responds with 200 status
- Enable browser DevTools → Network tab to inspect requests

### Watermark not visible

**Symptom**: Downloaded PDF has no watermark

**Solution**:
- Verify checkbox is checked before download
- Check PDF is not encrypted (some encrypted PDFs don't support overlays)
- Verify pdf-lib is installed correctly
- Check browser console for errors

### Slow cart loading

**Symptom**: Takes long time to fetch cart items

**Solution**:
- Too many bitstream API calls; implement caching
- Large metadata payloads; optimize API response
- Network latency; consider pagination (20 items per page)

### Download fails with 401

**Symptom**: "Unauthorized" when downloading

**Solution**:
- Auth token expired; user needs to login again
- Verify bitstream access permissions in DSpace
- Check auth headers being sent in fetch request

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-30 | Initial implementation |

---

## References

- DSpace REST API Documentation
- pdf-lib Documentation: https://pdf-lib.js.org/
- Material-UI Components: https://mui.com/
- Cart Storage: EPerson metadata field `eperson.cart`

