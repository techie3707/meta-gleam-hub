# Collection-Wise Permissions: Quick Implementation Guide

## TL;DR - What You Need

When a collection is created, **3 groups are automatically generated**:
- `{CollectionName}_Read` → View access
- `{CollectionName}_Admin` → Full control
- `{CollectionName}_Upload` → Submit items

---

## Quick Setup (5 Steps)

### Step 1: Copy Collection API Module

File: `src/api/collection.ts`

Key function: `AddCollection(parentId, title, description)`

**What it does:**
1. POSTs to `/api/core/collections?parent={parentId}` 
2. On success (HTTP 201), automatically creates 3 groups
3. Shows toast notifications for user feedback

### Step 2: Copy Group API Module

File: `src/api/group.ts`

Key functions:
- `addGroup(groupPayload)` - Creates a group
- `addMemberToGroup(groupId, epersonId)` - Adds user to group
- `fetchGroups()` - Lists all groups

### Step 3: Add Access Management Utilities

File: `src/api/accessManagement.ts`

Helper functions:
- `fetchCollections(communityId)` - Gets collections
- `fetchUserGroupsList(userId)` - Gets user's groups

### Step 4: Update Your UI Form

```typescript
import { AddCollection } from "./api/collection";

async function handleCreateCollection(parentId, title, description) {
  await AddCollection(parentId, title, description);
  // Groups created automatically!
}
```

### Step 5: Test the Flow

1. Create a collection
2. Check system - should see 3 new groups created
3. Add users to groups to assign permissions

---

## API Endpoints Used

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create Collection | POST | `/api/core/collections?parent={id}` |
| Create Group | POST | `/api/eperson/groups` |
| Add User to Group | POST | `/api/eperson/groups/{groupId}/epersons` |
| Fetch Groups | GET | `/api/eperson/groups` |

---

## Request/Response Examples

### Create Collection

**Request:**
```json
{
  "metadata": {
    "dc.title": [{"value": "My Collection"}],
    "dc.description": [{"value": "Description"}]
  }
}
```

**Response:** HTTP 201

### Create Group (Automatic)

**Request:**
```json
{
  "name": "My Collection_Read",
  "metadata": {
    "dc.description": [{"value": "Description"}]
  }
}
```

**Response:** HTTP 201

---

## Code Snippets Ready to Copy

### Collection Creation with Auto Groups

```typescript
export const AddCollection = async (parentId: string, title: string, description: string) => {
  const authToken = localStorage.getItem("authToken") || "";
  const csrfToken = localStorage.getItem("csrfToken") || "";

  const response = await axios.post(
    `${siteConfig.apiEndpoint}/api/core/collections?parent=${parentId}`,
    {
      metadata: {
        "dc.title": [{ value: title }],
        "dc.description": [{ value: description }],
      }
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": csrfToken,
        "Authorization": authToken
      },
      withCredentials: true
    }
  );

  if (response.status === 201) {
    setTimeout(async () => {
      const groupNames = [
        `${title}_Read`,
        `${title}_Admin`,
        `${title}_Upload`
      ];

      for (const name of groupNames) {
        await addGroup({ name, metadata: { "dc.description": [{ value: description }] } });
      }
    }, 1000);

    showToast("Collection created successfully!", "success");
  }
};
```

### Add User to Group

```typescript
export const addMemberToGroup = async (groupId: string, userId: string) => {
  const authToken = localStorage.getItem("authToken") || "";
  const csrfToken = localStorage.getItem("csrfToken") || "";

  await axios.post(
    `${siteConfig.apiEndpoint}/api/eperson/groups/${groupId}/epersons`,
    `${siteConfig.apiEndpoint}/api/eperson/epersons/${userId}`,
    {
      headers: {
        "Content-Type": "text/uri-list",
        "X-XSRF-TOKEN": csrfToken,
        "Authorization": authToken
      },
      withCredentials: true
    }
  );
};
```

---

## Important Notes

⚠️ **1 Second Delay**: Groups created 1 second after collection to ensure collection is persisted

⚠️ **CSRF Token Required**: All write operations need X-XSRF-TOKEN header

⚠️ **Auth Required**: All requests need Authorization header

⚠️ **Sequential Creation**: Groups created one at a time (not parallel) to avoid race conditions

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Groups not created | CSRF token missing | Ensure token in localStorage |
| 401 error | Auth token expired | Re-authenticate user |
| Group already exists | Duplicate creation attempt | Check group naming convention |
| Collection not found for groups | Groups created before collection persisted | 1-second delay is important |

---

## Permission Assignment Logic

Once groups are created, assign users:

```
Collection "Digital Archives" created
    ↓
    ├─ "Digital Archives_Read" group created
    ├─ "Digital Archives_Admin" group created
    ├─ "Digital Archives_Upload" group created
    ↓
    Assign Users:
    ├─ Add John → "Digital Archives_Read" (view only)
    ├─ Add Sarah → "Digital Archives_Admin" (full control)
    └─ Add Mike → "Digital Archives_Upload" (submit items)
```

---

## Next Steps

1. ✅ Copy the three API modules to your project
2. ✅ Update API endpoint configuration  
3. ✅ Integrate into collection creation form
4. ✅ Test collection + group creation
5. ✅ Implement group membership UI
6. ✅ Test permission enforcement

