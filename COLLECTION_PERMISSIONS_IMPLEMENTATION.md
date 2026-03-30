# Collection-Wise Permissions & Automatic Group Creation - Implementation Summary

## Overview

This document summarizes the implementation of automatic collection-wise permissions and group creation in the DSpace repository system.

**Implementation Date**: March 29, 2026  
**Status**: ✅ Complete and Compiled Successfully

---

## What Was Implemented

### 1. **New API: `collectionPermissionsApi.ts`**

A comprehensive API module that handles all permission-related operations:

#### Key Functions:

##### `createCollectionPermissionGroups()`
- **Purpose**: Automatically creates three permission groups when a collection is created
- **Groups Created**:
  - `{CollectionName}_Read` - Read-only access
  - `{CollectionName}_Admin` - Administrative access  
  - `{CollectionName}_Upload` - Upload/Submit access
- **Returns**: Group objects with IDs and any errors encountered

##### `createDefaultResourcePolicies()`
- **Purpose**: Links created groups to resource actions
- **Policies Created**:
  - READ policy → `{CollectionName}_Read` group
  - WRITE policy → `{CollectionName}_Admin` group
  - SUBMIT policy → `{CollectionName}_Upload` group
- **Returns**: Policy objects with IDs

##### `setupCollectionPermissions()`
- **Purpose**: Complete one-stop setup function
- **Workflow**:
  1. Creates three permission groups
  2. Creates three default resource policies
  3. Logs all operations and errors
  4. Returns comprehensive result with IDs and error information

##### `createResourcePolicyForGroup()`
- Creates a resource policy linking a specific group to an action

##### `createResourcePolicyForUser()`
- Creates a resource policy linking a specific user to an action

##### `getCollectionResourcePolicies()`
- Fetches all resource policies for a collection

##### `updateResourcePolicy()`
- Updates an existing resource policy (change action, etc.)

##### `deleteResourcePolicy()`
- Deletes a resource policy

### 2. **Updated API: `collectionApi.ts`**

Enhanced the existing collection API to integrate automatic group creation:

#### Key Changes:

```typescript
// New parameter in createCollection function
autoCreateGroups: boolean = true

// Automatic workflow:
1. Creates collection via API
2. Waits 1 second for backend indexing (prevents race conditions)
3. Calls setupCollectionPermissions() automatically
4. Logs success/failure of permission setup
```

#### Integration Flow:

```
User Creates Collection
    ↓
createCollection() called with collection metadata
    ↓
Collection created in DSpace
    ↓
1-second timeout (backend indexing)
    ↓
setupCollectionPermissions() triggered automatically
    ↓
Three Groups Created:
  - CollectionName_Read
  - CollectionName_Admin
  - CollectionName_Upload
    ↓
Three Resource Policies Created:
  - READ policy
  - WRITE (ADMIN) policy
  - SUBMIT (UPLOAD) policy
    ↓
Collection fully setup with permissions
```

---

## File Changes

### New Files Created:

1. **`/src/api/collectionPermissionsApi.ts`** (New)
   - 450+ lines of code
   - Comprehensive permission management
   - Full error handling and logging

### Modified Files:

1. **`/src/api/collectionApi.ts`** (Updated)
   - Added import: `setupCollectionPermissions`
   - Added parameter: `autoCreateGroups: boolean = true`
   - Added permission setup logic with 1-second timeout
   - Added comprehensive logging

---

## Permission Group Types

### 1. Read Group (`{CollectionName}_Read`)

**Access Level**: View-Only

**Permissions Granted**:
- VIEW collection items
- READ item metadata
- BROWSE collection contents
- ACCESS item details (if published)

**Use Case**: 
- Students browsing course materials
- Public researchers viewing published studies
- Institutional members accessing collections

**Resource Policy**: READ action

---

### 2. Admin Group (`{CollectionName}_Admin`)

**Access Level**: Full Control

**Permissions Granted**:
- WRITE collection metadata
- EDIT all items
- DELETE items from collection
- MANAGE workflow configuration
- MODIFY resource policies
- ADMIN collection settings

**Use Case**:
- Collection curators managing all aspects
- Department heads administering their collections
- Repository managers overseeing content

**Resource Policy**: WRITE action

---

### 3. Upload Group (`{CollectionName}_Upload`)

**Access Level**: Submit/Upload

**Permissions Granted**:
- SUBMIT items to collection
- CREATE new items (draft/workspace)
- UPLOAD files/bitstreams
- EDIT own submissions (until approved)
- WITHDRAW submissions

**Use Case**:
- Authors submitting their work
- Researchers uploading datasets
- Faculty members depositing research outputs

**Resource Policy**: SUBMIT action

---

## How It Works

### Automatic Group Creation Process

**Step 1: Collection Created**
```bash
POST /api/core/collections?parent={parentId}
Body: {
  metadata: {
    "dc.title": [{ value: "Collection Name" }],
    "dc.description": [{ value: "Description" }]
  }
}
```

**Step 2: Wait for Indexing**
- 1-second delay ensures collection is fully indexed
- Prevents race conditions in the backend

**Step 3: Groups Auto-Created**
```
CollectionName_Read
CollectionName_Admin
CollectionName_Upload
```

**Step 4: Resource Policies Created**
- Links each group to specific actions (READ, WRITE, SUBMIT)

**Step 5: Complete**
- Collection is ready with full permission structure

### User Permission Inheritance

```
User Role Assignment
    ↓
User Added to Group
    ↓
User Inherits Group Permissions
    ↓
Via Resource Policies
    ↓
User Can Perform Associated Actions
```

**Example Flow**:
1. User "alice@example.com" is added to "Research Papers_Read" group
2. The group has READ resource policy on the collection
3. Alice can now view all items in the Research Papers collection

---

## API Integration

### Using the New Functions

#### Create Collection (Automatic Group Creation)

```typescript
import { createCollection } from "@/api/collectionApi";

const newCollection = await createCollection(
  communityId,
  {
    "dc.title": [{ value: "My Collection" }],
    "dc.description": [{ value: "Collection for research papers" }]
  },
  "My Collection",
  true // autoCreateGroups enabled
);

// Result:
// 1. Collection created
// 2. Three groups automatically created
// 3. Three resource policies automatically linked
// 4. Ready for use
```

#### Setup Permissions Manually (if needed)

```typescript
import { setupCollectionPermissions } from "@/api/collectionPermissionsApi";

const result = await setupCollectionPermissions(
  collectionId,
  "My Collection",
  "Collection for research papers"
);

console.log(result);
// {
//   success: true,
//   groupIds: {
//     readGroupId: "...",
//     adminGroupId: "...",
//     uploadGroupId: "..."
//   },
//   policyIds: {
//     readPolicyId: "...",
//     writePolicyId: "...",
//     submitPolicyId: "..."
//   },
//   errors: []
// }
```

#### Fetch Resource Policies

```typescript
import { getCollectionResourcePolicies } from "@/api/collectionPermissionsApi";

const policies = await getCollectionResourcePolicies(collectionId);

policies.forEach(policy => {
  console.log({
    action: policy.action,
    groupName: policy._embedded?.group?.name,
    groupId: policy._embedded?.group?.id
  });
});
```

#### Add User to Permission Group

```typescript
import { addMemberToGroup } from "@/api/groupApi";

// Add user to the Read group
await addMemberToGroup("groupId", "userId");

// User now has READ access to the collection
```

#### Create Custom Policy

```typescript
import { createResourcePolicyForUser } from "@/api/collectionPermissionsApi";

// Give specific user ADMIN access
await createResourcePolicyForUser(
  collectionId,
  userId,
  "ADMIN",
  "TYPE_CUSTOM"
);
```

---

## Collections Page Integration

### Where Buttons Appear

On the **Collections** page, for each collection card:

```
Collection Name
Description text...
┌─────────────────────────────────────┐
│ 📁 X items                          │
├─────────────────────────────────────┤
│ [🛡️ Assign Role] [🔒 Access Policy] │
└─────────────────────────────────────┘
```

**Buttons**:
- **🛡️ Assign Role** → Navigate to `/assignRole/{collectionId}`
- **🔒 Access Policy** → Navigate to `/policies/collection/{collectionId}`

### Edit Community Page Integration

In the **Edit Community** page, for each collection in the tree:

```
Community Name
├── Collection 1
│   [Edit] [Delete] [Policies] [Assign Role]
├── Collection 2
│   [Edit] [Delete] [Policies] [Assign Role]
└── Sub-Community
    ├── Collection 3
    │   [Edit] [Delete] [Policies] [Assign Role]
```

**New Lock Icon** (🔒) opens AssignRole page

---

## Permission Workflow Examples

### Example 1: Academic Journal Collection

**Collection**: "Journal of Computer Science"

**Auto-Generated Groups**:
- `Journal of Computer Science_Read` → All registered users
- `Journal of Computer Science_Admin` → Editors and managing editors
- `Journal of Computer Science_Upload` → Authors and researchers

**Workflow Roles** (Optional, setup via Assign Role):
- **Submitter**: Authors submitting manuscripts
- **Reviewer**: Peer reviewers evaluating submissions
- **Editor**: Copy editors preparing for publication
- **Final Editor**: Editor-in-Chief approving publications

---

### Example 2: Institutional Repository

**Collection**: "Faculty Research Outputs"

**Auto-Generated Groups**:
- `Faculty Research Outputs_Read` → Everyone (public)
- `Faculty Research Outputs_Admin` → Repository managers
- `Faculty Research Outputs_Upload` → Faculty members

**Access Levels**:
- Public users: Can read and browse
- Faculty: Can submit their work
- Managers: Can manage all aspects

---

## Testing the Implementation

### Manual Testing Checklist

- [ ] Create a new collection
- [ ] Verify three groups are created automatically:
  - [ ] `{CollectionName}_Read`
  - [ ] `{CollectionName}_Admin`
  - [ ] `{CollectionName}_Upload`
- [ ] Verify three resource policies exist in the collection:
  - [ ] READ policy linked to Read group
  - [ ] WRITE policy linked to Admin group
  - [ ] SUBMIT policy linked to Upload group
- [ ] Navigate to Collections page
- [ ] Verify "Assign Role" button appears on collection cards
- [ ] Verify "Access Policy" button appears on collection cards
- [ ] Click "Access Policy" and verify policies are displayed
- [ ] Click "Assign Role" and verify role management interface opens
- [ ] Add a user to the Read group via group management
- [ ] Verify user can now access the collection

### Browser Console Testing

```javascript
// Check groups were created
const groups = await fetch('/api/eperson/groups/search/byMetadata?query=CollectionName')
  .then(r => r.json());
console.log('Groups created:', groups._embedded?.groups?.length);

// Check resource policies
const policies = await fetch('/api/authz/resourcepolicies/search/resource?uuid={collectionId}')
  .then(r => r.json());
console.log('Policies created:', policies._embedded?.resourcepolicies?.length);
```

---

## Error Handling

### Common Errors and Solutions

#### Error: "Failed to create {GroupName}_Read group"

**Cause**: Group creation failed (likely authentication or permissions)

**Solution**:
```typescript
// Check logs
console.error(error);

// Verify auth tokens
console.log('Auth token:', !!localStorage.getItem('authToken'));
console.log('CSRF token:', !!localStorage.getItem('csrfToken'));

// Retry manually
await setupCollectionPermissions(collectionId, collectionName);
```

#### Error: "Failed to create resource policies"

**Cause**: Policy creation failed (likely group IDs not valid)

**Solution**:
```typescript
// Verify groups exist
const groups = await searchGroups(collectionName);
console.log('Groups found:', groups);

// Check group IDs
console.log('Group IDs:', {
  readGroupId: groups[0].id,
  adminGroupId: groups[1].id,
  uploadGroupId: groups[2].id
});
```

#### Groups Created But Policies Failed

**Cause**: Partial failure - groups exist but policies weren't created

**Solution**:
```typescript
// Get group IDs
const groups = await searchGroups(collectionName);

// Create policies manually
const groupIds = {
  readGroupId: groups[0].id,
  adminGroupId: groups[1].id,
  uploadGroupId: groups[2].id
};

const policies = await createDefaultResourcePolicies(collectionId, groupIds);
console.log('Policies created:', policies);
```

---

## Logging & Debugging

### Console Logs Added

The implementation includes comprehensive logging:

```
[Collection] Creating new collection { parentId, name }
[Collection] Collection created successfully { collection }
[Collection] Starting automatic permission group creation
[CollectionPermissions] Creating groups for collection: {name}
[CollectionPermissions] Group creation completed { readGroup, adminGroup, uploadGroup, errors }
[CollectionPermissions] Creating resource policies for collection: {id}
[CollectionPermissions] Resource policy creation completed { readPolicy, writePolicy, submitPolicy, errors }
[CollectionPermissions] Collection permissions setup completed successfully
```

### Enable Debug Mode

```typescript
// In collectionPermissionsApi.ts, all operations are logged
// Enable browser DevTools to see detailed logs:

// Open DevTools (F12)
// Go to Console tab
// Filter by "[CollectionPermissions]" or "[Collection]"
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     DSpace Instance                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Communities                                               │
│  ├── Community A                                           │
│  │   └── Collections                                       │
│  │       ├── Research Papers                              │
│  │       │   ├── Auto-Generated Groups:                   │
│  │       │   │   ├── Research Papers_Read                │
│  │       │   │   ├── Research Papers_Admin               │
│  │       │   │   └── Research Papers_Upload              │
│  │       │   └── Resource Policies:                       │
│  │       │       ├── READ → Read group                    │
│  │       │       ├── WRITE → Admin group                  │
│  │       │       └── SUBMIT → Upload group               │
│  │       │                                                │
│  │       └── Theses                                       │
│  │           ├── Auto-Generated Groups:                   │
│  │           │   ├── Theses_Read                         │
│  │           │   ├── Theses_Admin                        │
│  │           │   └── Theses_Upload                       │
│  │           └── Resource Policies: [...]                │
│  │                                                        │
│  └── Community B                                          │
│      └── Collections                                      │
│          └── [...]                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

         Permission System Flow
         ↓
    User Management
    ├── Add users to groups
    ├── Users inherit group permissions
    └── Permissions enforced via resource policies
    ↓
    Action Authorization
    ├── READ: Browse collections
    ├── WRITE: Edit/manage items
    └── SUBMIT: Submit new items
```

---

## Performance Considerations

### 1-Second Timeout

- **Why**: Allows DSpace backend to fully index the collection
- **Effect**: Prevents race conditions and ensures groups are created successfully
- **User Experience**: Transparent - happens in background after collection creation

### Parallel Group Creation

- All three groups are created in parallel using `Promise.all()`
- Reduces total time needed for group creation
- If one fails, others continue

### Async Permission Setup

- Permission setup runs asynchronously after collection creation
- User sees "Collection created" message immediately
- Permissions are set up in background
- Errors logged to console (non-blocking)

---

## Best Practices

### 1. Always Check Success Status

```typescript
const result = await setupCollectionPermissions(...);

if (result.success) {
  console.log("Setup successful", result.groupIds);
} else {
  console.error("Setup failed", result.errors);
  // Handle error appropriately
}
```

### 2. Log Errors for Debugging

```typescript
if (result.errors.length > 0) {
  result.errors.forEach(error => {
    console.error("[CollectionSetup]", error);
    // Send to error tracking service
    trackError(error);
  });
}
```

### 3. Disable Auto-Creation If Needed

```typescript
// Manually control group creation
const collection = await createCollection(
  parentId,
  metadata,
  name,
  false // autoCreateGroups disabled
);

// Later, manually setup permissions
await setupCollectionPermissions(collection.id, name);
```

### 4. Handle Partial Failures

```typescript
const result = await setupCollectionPermissions(...);

// Check if all components were created
const isFullySetup = 
  result.groupIds.readGroupId &&
  result.groupIds.adminGroupId &&
  result.groupIds.uploadGroupId &&
  result.policyIds.readPolicyId &&
  result.policyIds.writePolicyId &&
  result.policyIds.submitPolicyId;

if (!isFullySetup) {
  // Retry or notify user
  console.warn("Incomplete setup", result);
}
```

---

## Summary

### What You Get

✅ **Automatic Group Creation**
- Three permission groups created automatically when a collection is created
- No manual group creation needed
- Follows DSpace naming conventions

✅ **Resource Policies**
- Three default resource policies automatically created
- Groups linked to specific actions (READ, WRITE, SUBMIT)
- Permissions enforced at collection level

✅ **Easy Integration**
- One-line collection creation with built-in permissions
- Comprehensive API for manual control if needed
- Full error handling and logging

✅ **User Interface**
- "Assign Role" button on each collection (Collections page)
- "Access Policy" button on each collection (Edit Community page)
- Easy permission management interface

✅ **Logging & Debugging**
- Comprehensive console logging
- Error messages with context
- Easy to troubleshoot issues

---

## Next Steps

1. **Test Collection Creation**
   - Create a collection via the UI
   - Verify groups are created
   - Verify policies are linked

2. **Test Permission Management**
   - Use "Assign Role" button
   - Manage workflow roles
   - Add users to groups

3. **Test Access Control**
   - Add user to Read group
   - Verify user can access collection
   - Test with different group memberships

4. **Monitor Logs**
   - Watch browser console during collection creation
   - Check for any error messages
   - Report issues with error details

---

**Implementation Status**: ✅ Complete  
**Compilation Status**: ✅ Successful  
**Testing Status**: Ready for manual testing  
**Documentation**: Complete

---

**For Support**: Check logs with `[Collection]` and `[CollectionPermissions]` tags
