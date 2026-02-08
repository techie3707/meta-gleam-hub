# Batch Import Implementation - Complete Guide

## Overview

Updated the Batch Import functionality to support **validation mode** and **workflow mode** as per DSpace 7.x REST API documentation. Users can now test SAF packages before importing and route items through workflow for review.

## Changes Summary

### 1. API Layer Updates (`src/api/processApi.ts`)

**Enhanced `uploadBatchImport` function:**
- Added optional `options` parameter with `validate` and `workflow` flags
- Dynamically builds properties array based on selected options
- Supports `--validate` flag for testing without importing
- Supports `--workflow` flag for routing to workflow queue

**Function Signature:**
```typescript
export const uploadBatchImport = async (
  file: File,
  collectionId: string,
  options?: {
    validate?: boolean;
    workflow?: boolean;
  }
): Promise<Process>
```

**Properties Logic:**
- Base: `--add`, `--zip`, `--collection`
- If `validate: true` → adds `--validate`
- If `workflow: true` AND NOT validating → adds `--workflow`
- Validation mode takes precedence (workflow ignored when validating)

---

### 2. UI Layer Updates (`src/pages/Import.tsx`)

#### Interface Changes

**Updated `BatchImportState` interface:**
```typescript
interface BatchImportState {
  csvFile: File | null;
  zipFile: File | null;
  collection: string;
  validateOnly: boolean;      // NEW
  sendToWorkflow: boolean;    // NEW
  status: "idle" | "uploading" | "processing" | "completed" | "error";
  progress: number;
  processId: number | null;
  itemsProcessed: number;
  totalItems: number;
  itemsSucceeded: number;
  itemsFailed: number;
  error?: string;
}
```

#### New UI Components

**1. Import Options Section**
Located between CSV format info and submit button:
- Two checkboxes with descriptions
- Validation checkbox
- Workflow checkbox (disabled when validation is checked)

**2. Validation Checkbox**
```tsx
<Checkbox
  id="validate-only"
  checked={batchState.validateOnly}
  onCheckedChange={(checked) =>
    setBatchState(prev => ({ ...prev, validateOnly: checked as boolean }))
  }
/>
```

**Features:**
- Label: "Validate only (test without importing)"
- Description: "Check the SAF package for errors without actually importing items"
- When checked, automatically disables workflow option

**3. Workflow Checkbox**
```tsx
<Checkbox
  id="send-workflow"
  checked={batchState.sendToWorkflow}
  disabled={batchState.validateOnly}
  onCheckedChange={(checked) =>
    setBatchState(prev => ({ ...prev, sendToWorkflow: checked as boolean }))
  }
/>
```

**Features:**
- Label: "Send to workflow (requires review before publication)"
- Description: "Items will be placed in the workflow queue for review and approval"
- Disabled when validation mode is active
- Visual opacity reduction when disabled

**4. Info Alerts**

**Validation Mode Alert** (blue theme):
```tsx
{batchState.validateOnly && (
  <Alert className="border-blue-200 bg-blue-50">
    <Info className="h-4 w-4 text-blue-600" />
    <AlertDescription className="text-blue-900">
      <strong>Validation mode:</strong> The SAF package will be checked for errors but no items will be imported. 
      Review the process output to see validation results.
    </AlertDescription>
  </Alert>
)}
```

**Workflow Mode Alert** (orange theme):
```tsx
{batchState.sendToWorkflow && !batchState.validateOnly && (
  <Alert className="border-orange-200 bg-orange-50">
    <Info className="h-4 w-4 text-orange-600" />
    <AlertDescription className="text-orange-900">
      <strong>Workflow mode:</strong> Items will be sent to the workflow queue and require approval before publication. 
      Navigate to the Workflow page to review and approve items.
    </AlertDescription>
  </Alert>
)}
```

**5. Dynamic Submit Button**
```tsx
<Button
  onClick={handleBatchImport}
  disabled={!batchState.zipFile || !batchState.collection}
  className="mt-4"
>
  <Upload className="w-4 h-4 mr-2" />
  {batchState.validateOnly ? "Validate Package" : "Start Batch Import"}
</Button>
```

**Changes based on mode:**
- Validation mode: "Validate Package"
- Normal mode: "Start Batch Import"

#### Updated Handler Functions

**`handleBatchImport`:**
```typescript
const handleBatchImport = async () => {
  if (!batchState.zipFile || !batchState.collection) {
    toast({
      title: "Missing required files",
      description: "Please select a ZIP file and target collection",
      variant: "destructive",
    });
    return;
  }

  setBatchState(prev => ({ ...prev, status: "uploading", progress: 0 }));

  try {
    const process = await uploadBatchImport(
      batchState.zipFile, 
      batchState.collection,
      {
        validate: batchState.validateOnly,
        workflow: batchState.sendToWorkflow,
      }
    );
    
    setBatchState(prev => ({
      ...prev,
      status: "processing",
      processId: process.processId,
      progress: 10,
    }));

    let description = "Batch import process has been initiated";
    if (batchState.validateOnly) {
      description = "Validation started! Check processes page for results.";
    } else if (batchState.sendToWorkflow) {
      description = "Items will be sent to workflow queue for review.";
    }

    toast({
      title: batchState.validateOnly ? "Validation Started" : "Import Started",
      description,
    });

  } catch (error: any) {
    setBatchState(prev => ({
      ...prev,
      status: "error",
      error: error.message || "Failed to start import",
    }));
    toast({
      title: "Import Failed",
      description: error.message || "Failed to start batch import",
      variant: "destructive",
    });
  }
};
```

**Features:**
- Passes options object to API call
- Dynamic toast messages based on mode
- Different titles for validation vs. import

**`resetBatchImport`:**
```typescript
const resetBatchImport = () => {
  setBatchState({
    csvFile: null,
    zipFile: null,
    collection: "",
    validateOnly: false,    // Reset
    sendToWorkflow: false,  // Reset
    status: "idle",
    progress: 0,
    processId: null,
    itemsProcessed: 0,
    totalItems: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
  });
};
```

**New Imports:**
```typescript
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
```

---

## User Workflows

### Workflow 1: Standard Batch Import (Direct to Archive)

**Steps:**
1. Navigate to Import page
2. Click "Batch Import" tab
3. Select target collection
4. Upload ZIP file with SAF structure
5. Leave both checkboxes unchecked
6. Click "Start Batch Import"
7. Items are imported directly to archive
8. Items become immediately discoverable

**API Call:**
```javascript
properties: [
  { name: "--add" },
  { name: "--zip", value: "import.zip" },
  { name: "--collection", value: "uuid" }
]
```

---

### Workflow 2: Validation Only

**Steps:**
1. Navigate to Import page → Batch Import tab
2. Select target collection
3. Upload ZIP file
4. ✅ Check "Validate only (test without importing)"
5. Blue info alert appears
6. Click "Validate Package"
7. Process starts with validation mode
8. Navigate to Processes page to view validation results
9. No items are imported

**API Call:**
```javascript
properties: [
  { name: "--add" },
  { name: "--zip", value: "import.zip" },
  { name: "--collection", value: "uuid" },
  { name: "--validate" }
]
```

**Validation Results:**
- ✅ SAF structure validated
- ✅ Metadata files checked
- ✅ Bitstreams verified
- ✅ Errors listed in process output
- ❌ No items created

---

### Workflow 3: Import to Workflow Queue

**Steps:**
1. Navigate to Import page → Batch Import tab
2. Select target collection
3. Upload ZIP file
4. ✅ Check "Send to workflow (requires review before publication)"
5. Orange warning alert appears
6. Click "Start Batch Import"
7. Process starts with workflow mode
8. Items are created in workflow queue
9. Navigate to Workflow page to review items
10. Approve/reject each item
11. Approved items move to archive

**API Call:**
```javascript
properties: [
  { name: "--add" },
  { name: "--zip", value: "import.zip" },
  { name: "--collection", value: "uuid" },
  { name: "--workflow" }
]
```

**Item Lifecycle:**
```
Upload → Import Process → Workflow Queue (Step 1) → 
Review → Workflow (Step 2) → Approve → Archive → Discoverable
```

---

### Workflow 4: Two-Step Validation + Workflow

**Best practice for untrusted content:**

**Step 1: Validate**
1. Upload ZIP file
2. Check "Validate only"
3. Click "Validate Package"
4. Review process output for errors
5. Fix any issues in SAF package

**Step 2: Import to Workflow**
1. Upload corrected ZIP file
2. Uncheck "Validate only"
3. Check "Send to workflow"
4. Click "Start Batch Import"
5. Items go to workflow for human review
6. Review and approve items
7. Items published after approval

---

## Visual Features

### Layout Structure

```
Import Page
├── Tabs
│   ├── Single Upload (unchanged)
│   └── Batch Import
│       ├── Target Collection (dropdown)
│       ├── CSV Metadata File (optional)
│       ├── ZIP File with Documents (required)
│       ├── CSV Format Info (help text)
│       ├── ══════════════════════════════
│       ├── Import Options (NEW)
│       │   ├── ☐ Validate only
│       │   │   └── Description text
│       │   └── ☐ Send to workflow
│       │       └── Description text
│       ├── ══════════════════════════════
│       ├── Info Alerts (conditional)
│       │   ├── Blue alert (if validating)
│       │   └── Orange alert (if workflow)
│       └── Submit Button (dynamic text)
```

### Checkbox States

| Validate | Workflow | Workflow Enabled | Result |
|----------|----------|------------------|--------|
| ❌ | ❌ | ✅ | Direct to archive |
| ✅ | ❌ | ❌ (disabled) | Validation only |
| ✅ | ✅ | ❌ (disabled) | Validation only (workflow ignored) |
| ❌ | ✅ | ✅ | Import to workflow |

### Alert Colors

- **Validation Alert**: Blue (`border-blue-200`, `bg-blue-50`, `text-blue-900`)
- **Workflow Alert**: Orange (`border-orange-200`, `bg-orange-50`, `text-orange-900`)

---

## DSpace API Integration

### Endpoint
`POST /api/system/scripts/import/processes`

### Request Format
```http
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="properties"

[{"name":"--add"},{"name":"--zip","value":"import.zip"},{"name":"--collection","value":"uuid"},{"name":"--validate"}]
--boundary
Content-Disposition: form-data; name="file"; filename="import.zip"
Content-Type: application/zip

[Binary ZIP content]
--boundary--
```

### Response
```json
{
  "processId": 12345,
  "scriptName": "import",
  "processStatus": "SCHEDULED",
  "parameters": [
    { "name": "-a", "value": null },
    { "name": "-c", "value": "collection-uuid" },
    { "name": "-z", "value": "import.zip" },
    { "name": "-t", "value": null }
  ],
  "_links": {
    "self": { "href": "/api/system/processes/12345" },
    "output": { "href": "/api/system/processes/12345/output" }
  }
}
```

### Process Statuses
- `SCHEDULED` → Waiting to run
- `RUNNING` → Currently executing
- `COMPLETED` → Finished successfully
- `FAILED` → Finished with errors

---

## Toast Notifications

### Validation Mode
- **Title**: "Validation Started"
- **Description**: "Validation started! Check processes page for results."

### Workflow Mode
- **Title**: "Import Started"
- **Description**: "Items will be sent to workflow queue for review."

### Normal Mode
- **Title**: "Import Started"
- **Description**: "Batch import process has been initiated"

### Error
- **Title**: "Import Failed"
- **Description**: Error message from API
- **Variant**: "destructive"

---

## Testing Checklist

### Validation Mode
- [ ] Check "Validate only" checkbox
- [ ] Workflow checkbox becomes disabled
- [ ] Blue info alert appears
- [ ] Button text changes to "Validate Package"
- [ ] Click submit → Process starts
- [ ] Toast shows "Validation Started"
- [ ] Navigate to Processes page
- [ ] View process output for validation results
- [ ] Confirm no items were created in DSpace

### Workflow Mode
- [ ] Check "Send to workflow" checkbox
- [ ] Orange warning alert appears
- [ ] Button text remains "Start Batch Import"
- [ ] Click submit → Process starts
- [ ] Toast shows workflow message
- [ ] Navigate to Workflow page
- [ ] Confirm items appear in workflow queue
- [ ] Items require approval before publication

### Combined Test
- [ ] Check "Validate only"
- [ ] Try to check "Send to workflow" → Should be disabled
- [ ] Uncheck "Validate only"
- [ ] "Send to workflow" becomes enabled
- [ ] Check "Send to workflow"
- [ ] Check "Validate only" again
- [ ] Orange alert disappears, blue alert appears
- [ ] Confirm API call includes only `--validate` flag

### Error Handling
- [ ] Try to submit without ZIP file → Error toast
- [ ] Try to submit without collection → Error toast
- [ ] Upload invalid ZIP → API error handled gracefully
- [ ] Check error redirects (400, 401, 403, 422, 500)

### UI/UX
- [ ] Checkboxes are visually clear
- [ ] Help text is readable
- [ ] Alerts are properly colored and visible
- [ ] Disabled checkbox has reduced opacity
- [ ] Button text changes appropriately
- [ ] Layout is responsive
- [ ] No console errors

---

## File Summary

### Modified Files

1. **`src/api/processApi.ts`**
   - Enhanced `uploadBatchImport` function
   - Added `options` parameter
   - Dynamic properties array building
   - Lines changed: ~25 lines

2. **`src/pages/Import.tsx`**
   - Updated `BatchImportState` interface
   - Added validation and workflow checkboxes
   - Added info alerts
   - Updated `handleBatchImport` function
   - Updated `resetBatchImport` function
   - Dynamic button text
   - New imports: Checkbox, Alert, Info
   - Lines changed: ~100 lines

### No New Files Created

All changes are modifications to existing files.

---

## Implementation Status

✅ **Completed:**
- API layer with validation and workflow support
- UI checkboxes for both modes
- Info alerts with appropriate colors
- Dynamic button text
- Updated handler functions
- Toast notifications
- State management
- TypeScript interfaces

✅ **Tested:**
- Build successful (0 errors)
- TypeScript compilation clean
- All imports resolved
- Checkbox logic working

📋 **Pending:**
- Runtime testing with real DSpace server
- End-to-end validation workflow test
- End-to-end workflow queue test
- Process output verification

---

## Quick Reference

### Enable Validation
```typescript
setBatchState(prev => ({ ...prev, validateOnly: true }))
```

### Enable Workflow
```typescript
setBatchState(prev => ({ ...prev, sendToWorkflow: true }))
```

### API Call Example
```typescript
await uploadBatchImport(file, collectionId, {
  validate: true,
  workflow: false
})
```

### Properties Sent to DSpace
```javascript
// Validation mode
{ name: "--validate" }

// Workflow mode
{ name: "--workflow" }

// Both (workflow ignored)
{ name: "--validate" }
```

---

## Support & Documentation

- **DSpace Documentation**: https://wiki.lyrasis.org/display/DSDOC7x/Batch+Import
- **REST API**: https://demo.dspace.org/server/api/system/scripts/import
- **SAF Format**: https://wiki.lyrasis.org/display/DSDOC7x/Importing+and+Exporting+Items+via+Simple+Archive+Format

---

**Implementation Date**: February 8, 2026  
**DSpace Version**: 7.x REST API  
**Status**: ✅ Complete and Ready for Testing
