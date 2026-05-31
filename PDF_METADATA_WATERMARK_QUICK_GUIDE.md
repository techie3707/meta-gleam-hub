# PDF with Metadata Page & Watermarking: Quick Reference Guide

## TL;DR - What Happens

When a user downloads a PDF:

1. ✅ **Metadata Cover Page** added as page 1 with logo and item details
2. ✅ **Original PDF pages** added after metadata page
3. ✅ **Watermark Logo** overlaid on each page (optional, 50% opacity)
4. ✅ **Final PDF** generated and downloaded

```
Final PDF Structure:
┌─────────────────────┐
│ PAGE 1: METADATA    │ ← Logo + Item Info (HTML converted to image)
│ (Cover Page)        │
└─────────────────────┘
┌─────────────────────┐
│ PAGE 2-N: ORIGINAL  │ ← Original PDF pages
│ WITH WATERMARK      │ ← Logo centered, 50% opacity (optional)
└─────────────────────┘
```

---

## Three Main Components

### 1️⃣ Metadata Cover Page

**What it contains:**
- Organization logo (top)
- Table with item metadata (name, patient info, doctor, dates, etc.)
- Professional styling (borders, colors, shadows)

**How it's created:**
```
Build HTML Table → Convert to Image (html2canvas) → Embed in PDF
```

**Size:** A4 (450px × 800px)

### 2️⃣ Logo Watermarking

**What it does:**
- Adds semi-transparent logo to center of each page
- Only applied if user selects watermark option

**Properties:**
- Size: 30% of original logo
- Opacity: 50% (see-through)
- Position: Center of page
- On all pages: EXCEPT the metadata cover page

### 3️⃣ Page Selection

**Format options:**
- `"1-3"` → pages 1, 2, 3
- `"1-3,5"` → pages 1, 2, 3, 5
- `"1-3,5,10-12"` → pages 1, 2, 3, 5, 10-12
- `""` or empty → all pages

---

## Complete Step-by-Step Flow

```
USER CLICKS DOWNLOAD
        ↓
downloadPDF({
  bitstreamId: "PDF file ID",
  fileName: "document.pdf",
  itemId: "item ID for metadata",
  pagesStr: "1-3,5",
  includeWatermark: true
})
        ↓
        ├─ STEP 1: Fetch original PDF from API
        │   GET /api/core/bitstreams/{bitstreamId}/content
        │   ↓ Get PDF bytes
        │
        ├─ STEP 2: Create metadata page (if itemId)
        │   GET /api/core/items/{itemId}
        │   ↓ Fetch item metadata
        │   ├─ Build HTML table with logo
        │   ├─ Convert HTML → PNG image (html2canvas)
        │   └─ Embed PNG as page 1 of output PDF
        │
        ├─ STEP 3: Parse page selection
        │   pagesStr: "1-3,5" → indices: [0, 1, 2, 4]
        │   Filter valid pages from PDF
        │
        ├─ STEP 4: Apply watermark (if selected)
        │   ├─ Fetch logo image
        │   ├─ Scale to 30%
        │   └─ For each page: draw at center with 50% opacity
        │
        ├─ STEP 5: Merge all pages
        │   [ Metadata Page ] + [ Watermarked Pages ]
        │
        └─ STEP 6: Download
            Save as PDF blob
            Create download link
            Trigger browser download
            Show "Downloaded" toast
```

---

## Code Snippets

### Parse Page String

```typescript
function parsePages(pageString: string): number[] {
  const pages = new Set<number>();
  
  pageString.split(',').forEach((part) => {
    if (part.includes('-')) {
      // "1-3" → add 1, 2, 3
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) pages.add(i);
    } else {
      // "5" → add 5
      pages.add(Number(part));
    }
  });
  
  return Array.from(pages).sort((a, b) => a - b);
}

// Usage:
parsePages("1-3,5,10-12") // → [1, 2, 3, 5, 10, 11, 12]
```

### Build Metadata Table

```typescript
const map = {
  "dc.patientname": "Patient Name",
  "dc.doctorname": "Doctor Name",
  "dc.uhidno": "UHID Number",
  "dc.speciality": "Speciality",
};

const rows = Object.entries(map).reduce((html, [key, label]) => {
  const value = itemData?.metadata?.[key]?.[0]?.value;
  if (!value) return html;
  
  return html + `
    <tr>
      <th style="background:#e6e6e6;padding:12px;width:200px;">${label}</th>
      <td style="background:#fff;padding:12px;">${value}</td>
    </tr>
  `;
}, "");
```

### Convert HTML to Image

```typescript
import html2canvas from 'html2canvas';

const html = document.createElement("div");
html.innerHTML = `<img src="${logo}" /><table>${rows}</table>`;
document.body.appendChild(html);

// Convert to PNG
const canvas = await html2canvas(html, { backgroundColor: "#fff" });
const imgBytes = await fetch(canvas.toDataURL("image/png"))
  .then(r => r.arrayBuffer());

document.body.removeChild(html);
```

### Embed as PDF Page

```typescript
import { PDFDocument } from 'pdf-lib';

const outPdf = await PDFDocument.create();

// Embed PNG as image
const imgEmbed = await outPdf.embedPng(imgBytes);

// Create page with image dimensions
const page = outPdf.addPage([imgEmbed.width, imgEmbed.height]);

// Draw image on page
page.drawImage(imgEmbed, {
  x: 0,
  y: 0,
  width: imgEmbed.width,
  height: imgEmbed.height
});
```

### Apply Watermark to Page

```typescript
// Scale logo to 30% of original
const wmScaled = wmImg.scale(0.3);

// For each page
pages.forEach(page => {
  const { width, height } = page.getSize();
  
  // Center position
  const x = (width - wmScaled.width) / 2;
  const y = (height - wmScaled.height) / 2;
  
  // Draw watermark
  page.drawImage(wmImg, {
    x: x,
    y: y,
    width: wmScaled.width,
    height: wmScaled.height,
    opacity: 0.5  // 50% transparency
  });
  
  outPdf.addPage(page);
});
```

---

## Metadata Fields Supported

### Medical Records
```
dc.uhidno          → UHID Number
dc.patientname     → Patient Name
dc.doctorname      → Doctor Name
dc.mrdno           → MRD NO
dc.mlc             → MLC
dc.date.created    → Date Of Admission
dc.dod             → Date Of Discharge
dc.filetype        → File Type
dc.speciality      → Speciality
```

### HR Records
```
dc.employeecode    → Employee ID
dc.employeename    → Employee Name
dc.employeetype    → Employee Type
dc.joiningyear     → Joining Year
dc.post            → Post
dc.joiningdate     → Date Of Joining
dc.companycode     → Company Code
dc.unitcode        → Unit Code
dc.departmentname  → Department
dc.employeecategory → Employee Category
```

**Adding custom fields:**
```typescript
const map = {
  // ... existing fields
  "dc.customfield": "Custom Label",
};
```

---

## Function Signature

```typescript
downloadPDF(
  bitstreamId: string,        // PDF file ID (UUID)
  fileName: string,           // Download filename
  itemId?: string | null,     // Item ID for metadata (optional)
  pagesStr?: string | null,   // Page range (optional, default: all)
  includeWatermark: boolean = false  // Add watermark? (default: false)
): Promise<void>
```

### Example Usage

```typescript
// Download specific pages with watermark
downloadPDF(
  "550e8400-e29b-41d4-a716-446655440000",
  "medical_report.pdf",
  "660e8400-e29b-41d4-a716-446655440001",
  "1-3,5-10",
  true
);

// Download all pages without watermark
downloadPDF(
  "550e8400-e29b-41d4-a716-446655440000",
  "full_document.pdf"
);

// Download with metadata page but no watermark
downloadPDF(
  "550e8400-e29b-41d4-a716-446655440000",
  "document.pdf",
  "660e8400-e29b-41d4-a716-446655440001"
);
```

---

## API Endpoints Required

| Endpoint | Method | Used For |
|----------|--------|----------|
| `/api/core/bitstreams/{id}/content` | GET | Download PDF file |
| `/api/core/items/{id}` | GET | Fetch item metadata |

**Headers required:**
```
Authorization: Bearer {authToken}
Accept: application/json
```

---

## Dependencies

```json
{
  "pdf-lib": "^1.17.0",
  "html2canvas": "^1.4.1"
}
```

Install:
```bash
npm install pdf-lib html2canvas
```

---

## Styling Reference

### Metadata Page HTML

| Component | Property | Value |
|-----------|----------|-------|
| Container | Width | 450px (A4) |
| Container | Height | 800px (A4) |
| Container | Padding | 40px |
| Container | Font | Arial, sans-serif |
| Container | Background | #fff (white) |
| Logo Section | Text-align | center |
| Logo Section | Margin-bottom | 32px |
| Logo Image | Max-height | 100px |
| Table | Width | 100% |
| Table | Font-size | 16px |
| Table | Box-shadow | 0 0 10px rgba(0,0,0,0.1) |
| Header Cell | Background | #e6e6e6 (light gray) |
| Header Cell | Width | 200px |
| Header Cell | Padding | 12px 16px |
| Header Cell | Font-weight | 600 |
| Data Cell | Background | #fff (white) |
| Data Cell | Padding | 12px 16px |
| Link Color | Color | #3f51b5 (blue) |

---

## Watermark Properties

```typescript
{
  size: 0.3,           // 30% of original logo
  opacity: 0.5,        // 50% transparency
  position: "center",  // Horizontal: center
                       // Vertical: center
  excludePage: 1       // Don't watermark page 1 (metadata)
}
```

---

## Error Handling

```typescript
try {
  await downloadPDF(bitstreamId, fileName, itemId, pagesStr, includeWatermark);
  // Success toast shown automatically
} catch (error) {
  showToast("Failed to download PDF", "error");
  console.error(error);
}
```

**Possible errors:**
- ❌ "Failed to fetch PDF" → PDF not found or auth issue
- ❌ "No valid pages to extract" → Page range invalid
- ❌ "Failed to download PDF" → General error (check console)

---

## Performance Tips

⚡ **Fast path:** Don't include metadata page (no itemId)
```typescript
downloadPDF(bitstreamId, fileName);  // Skip metadata fetch
```

⚡ **Selective pages:** Request only needed pages
```typescript
downloadPDF(bitstreamId, fileName, itemId, "1-10");  // Not all pages
```

❌ **Slow path:** Large PDF + metadata + watermark on all pages
```typescript
downloadPDF(bitstreamId, fileName, itemId, "", true);  // All pages + processing
```

---

## Customization Examples

### Remove Watermark
```typescript
// User doesn't select watermark
// Or always pass false:
downloadPDF(bitstreamId, fileName, itemId, pagesStr, false);
```

### Change Watermark Opacity
```typescript
// In bitstream.ts, change opacity value
opacity: 0.3,  // Changed from 0.5 (30% instead of 50%)
```

### Change Watermark Size
```typescript
// Scale to different percentage
const wmScaled = wmImg.scale(0.5);  // 50% instead of 30%
```

### Different Logo
```typescript
import customLogo from '../assets/logo.png';

// In watermark section:
const wmBytes = await fetch(customLogo).then(r => r.arrayBuffer());
```

### Different Metadata Fields Order
```typescript
const map = {
  "dc.patientname": "Name",        // Display first
  "dc.uhidno": "UHID",
  "dc.doctorname": "Doctor",       // Display last
};
```

---

## Deployment Checklist

- [ ] Copy bitstream.ts with all functions
- [ ] Verify logo image path (`personsImgs.brand_one`)
- [ ] Install pdf-lib and html2canvas
- [ ] Add auth headers to fetch calls
- [ ] Test with sample PDF
- [ ] Test with metadata present
- [ ] Test without metadata (itemId = null)
- [ ] Test watermark toggle
- [ ] Test page ranges (single, range, multiple)
- [ ] Test on mobile (download dialog)
- [ ] Verify file size reasonable
- [ ] Check memory usage on large PDFs

---

## Quick Integration

1. **Copy from:** `src/api/bitstream.ts` → `downloadPDF` function
2. **Create:** Button or link that calls downloadPDF
3. **Pass params:** bitstreamId, fileName, itemId, pages, watermark
4. **Handle:** Success/error toasts automatically shown
5. **Result:** User gets enhanced PDF download

---

## File Structure

```
src/
├── api/
│   ├── bitstream.ts              ← Contains downloadPDF()
│   └── searchApi.ts              ← Contains getAuthHeaders()
├── assets/
│   ├── images/
│   │   ├── MEDANTA_main.png      ← Watermark logo
│   │   └── brand images
│   └── ...
├── utils/
│   └── images.ts                 ← personsImgs.brand_one
├── contexts/
│   └── ToastProvider.tsx          ← showToast()
└── ...
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Metadata page blank | itemId null or item not found | Pass valid itemId, check API |
| Watermark not visible | includeWatermark false or pdf encrypted | Set to true, check PDF format |
| Slow download | Large PDF or complex metadata | Reduce page count, optimize HTML |
| Logo not showing | Image path wrong | Check personsImgs.brand_one |
| 401 error | Auth token expired | User needs to login again |

