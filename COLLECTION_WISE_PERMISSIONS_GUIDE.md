# Collection-Wise Permissions System - Implementation Guide

## Overview

This document provides a comprehensive guide to the collection-wise permissions system in DSpace. When a collection is created, three default groups are automatically generated, and resource policies are managed through these groups to control access and permissions at the collection level.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Collection Creation & Auto-Generated Groups](#collection-creation--auto-generated-groups)
3. [Permission Group Types](#permission-group-types)
4. [Resource Policies](#resource-policies)
5. [Role Management](#role-management)
6. [API Integration](#api-integration)
7. [UI Components](#ui-components)
8. [Implementation Steps](#implementation-steps)
9. [Permission Workflow](#permission-workflow)
10. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Permission Layer Structure

```
DSpace Instance
├── Communities
│   └── Collections
│       ├── Auto-Generated Groups (Upon Creation)
│       │   ├── Collection_Read Group
│       │   ├── Collection_Admin Group
│       │   └── Collection_Upload Group
│       │
│       ├── Workflow-Specific Groups (Manual Setup)
│       │   ├── Submitter Group
│       │   ├── Reviewer Group
│       │   ├── Editor Group
│       │   └── Final Editor Group
│       │
│       └── Resource Policies
│           ├── READ policies (via _Read group)
│           ├── WRITE policies (via _Admin group)
│           ├── SUBMIT policies (via _Upload group)
│           └── ADMIN policies
│
├── Resource Policy Management
│   ├── Policies tied to Groups
│   ├── Policies tied to EPerson
│   └── Policies with specific Actions (READ, WRITE, DELETE, ADMIN, SUBMIT)
│
└── User Groups
    ├── Collection-specific groups
    ├── Members (EPerson)
    └── Permissions inherited through group membership
```

### Data Flow Diagram

```
1. Collection Creation
   ↓
2. System Automatically Creates Three Groups:
   - CollectionName_Read
   - CollectionName_Admin
   - CollectionName_Upload
   ↓
3. Default Resource Policies Created:
   - READ policy → CollectionName_Read group
   - WRITE policy → CollectionName_Admin group
   - SUBMIT policy → CollectionName_Upload group
   ↓
4. Administrators Add Users to Groups
   ↓
5. Users Get Permissions Based on Group Membership
   ↓
6. Optional: Setup Workflow-Specific Roles
   - Submitter, Reviewer, Editor, Final Editor
```

---

## Collection Creation & Auto-Generated Groups

### How It Works

When a collection is created in DSpace, the system automatically generates three groups to manage permissions:

#### Backend Process (API)

```typescript
// Collection Creation Flow in collection.ts
POST /api/core/collections?parent={communityId}
├── Create Collection Resource
├── Wait 1 second (setTimeout)
└── Create Three Groups:
    ├── Group 1: {CollectionTitle}_Read
    ├── Group 2: {CollectionTitle}_Admin
    └── Group 3: {CollectionTitle}_Upload
```

#### Code Implementation

**File**: `src/api/collection.ts`

```typescript
export const AddCollection = async (parentId: string, title: string, description: string) => {
  try {
    // Step 1: Create the collection
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
      // Step 2: Wait 1 second for collection to be fully indexed
      setTimeout(async () => {
        const groupBaseName = title;
        // Step 3: Define three group names
        const groupNames = [
          `${groupBaseName}_Read`,
          `${groupBaseName}_Admin`,
          `${groupBaseName}_Upload`
        ];

        // Step 4: Create each group
        for (const groupName of groupNames) {
          const payload: GroupPayload = {
            name: groupName,
            metadata: {
              "dc.description": [{ value: description }],
            },
          };

          try {
            const success = await addGroup(payload);
            if (success) {
              showToast(`Group '${groupName}' created successfully!`, "success");
            }
          } catch (groupError: any) {
            console.error(`Failed to create group '${groupName}':`, groupError);
            showToast(`Failed to create group '${groupName}'`, "error");
          }
        }
      }, 1000);

      showToast("Collection created successfully!", "success");
    }
  } catch (error: any) {
    // Error handling
  }
}
```

### Group Naming Convention

The three auto-generated groups follow this naming pattern:

```
{CollectionTitle}_{GroupType}

Examples:
- Research Papers_Read      → Read-only access
- Research Papers_Admin     → Administrative access
- Research Papers_Upload    → Upload/Submit access
```

### Group Creation API

**File**: `src/api/group.ts`

```typescript
export const addGroup = async (groupData: GroupPayload): Promise<boolean> => {
  try {
    const apiUrl = `${siteConfig.apiEndpoint}/api/eperson/groups`;

    const response = await axios.post(apiUrl, groupData, {
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": csrfToken,
        "Authorization": authToken,
      },
      withCredentials: true,
    });

    if (response.status === 201) {
      showToast("Group created successfully!", "success");
      return true;
    }
    return false;
  } catch (error: any) {
    // Error handling and redirection
    return false;
  }
};
```

---

## Permission Group Types

### 1. Read Group (`{CollectionName}_Read`)

**Purpose**: Controls who can view/read items in the collection

**Permissions Granted**:
- VIEW collection items
- READ item metadata
- ACCESS item content (if within publication policy)
- BROWSE collection

**Use Case**:
- Students can read course materials
- Public researchers can view published studies
- Institutional members can browse collections

**API Reference**:
```typescript
// Fetch existing submitter group (which becomes the read group)
GET /api/core/collections/{uuid}/submittersGroup

// Create READ policy
POST /api/authz/resourcepolicies?resource={uuid}&group={groupId}
{
  "action": "READ",
  "policyType": "TYPE_SUBMISSION"
}
```

### 2. Admin Group (`{CollectionName}_Admin`)

**Purpose**: Controls who can manage and modify the collection

**Permissions Granted**:
- WRITE collection metadata
- DELETE items from collection
- ADMIN collection settings
- MANAGE resource policies
- CREATE new items in collection (admin)
- MODIFY item metadata
- MANAGE workflow configurations

**Use Case**:
- Collection curators can manage all aspects
- Department heads can administer their collections
- System administrators can oversee multiple collections

**API Reference**:
```typescript
// Fetch existing editor group (which becomes the admin group)
GET /api/core/collections/{uuid}/workflowGroups/editor

// Create WRITE/ADMIN policy
POST /api/authz/resourcepolicies?resource={uuid}&group={groupId}
{
  "action": "WRITE",
  "policyType": "TYPE_CUSTOM"
}
```

### 3. Upload Group (`{CollectionName}_Upload`)

**Purpose**: Controls who can submit/upload items to the collection

**Permissions Granted**:
- SUBMIT items to collection
- CREATE new items (draft/workspace)
- UPLOAD bitstreams (files)
- EDIT own submissions (until approved)
- WITHDRAW submissions

**Use Case**:
- Authors can submit their work
- Researchers can upload datasets
- Faculty members can deposit research outputs

**API Reference**:
```typescript
// Fetch existing reviewer group (becomes upload group)
GET /api/core/collections/{uuid}/workflowGroups/reviewer

// Create SUBMIT policy
POST /api/authz/resourcepolicies?resource={uuid}&group={groupId}
{
  "action": "SUBMIT",
  "policyType": "TYPE_SUBMISSION"
}
```

---

## Resource Policies

### What are Resource Policies?

Resource Policies are the core permission mechanism in DSpace. They define:
- **WHO** can perform an action (user/group)
- **WHAT** action they can perform (READ, WRITE, DELETE, ADMIN, SUBMIT)
- **WHERE** they can perform it (specific resource/object)
- **WHEN** the policy is valid (start/end dates - optional)

### Resource Policy Structure

```typescript
interface ResourcePolicy {
  id: string;
  uuid: string;
  type: string;
  action: string;              // READ, WRITE, ADMIN, DELETE, SUBMIT
  startDate?: string;           // Optional: when policy becomes active
  endDate?: string;             // Optional: when policy expires
  policyType: string;          // TYPE_SUBMISSION, TYPE_CUSTOM, etc.
  
  _embedded?: {
    eperson?: EPerson;         // If policy is for a specific user
    group?: Group;             // If policy is for a group
  };
  
  _links: {
    self: { href: string };
    resource: { href: string };
  };
}
```

### Available Actions

| Action | Permission Level | Use Case |
|--------|------------------|----------|
| **READ** | View-Only | Browse and read items |
| **WRITE** | Edit | Modify metadata and content |
| **DELETE** | Delete | Remove items from collection |
| **ADMIN** | Full Control | Manage collection and policies |
| **SUBMIT** | Submit | Deposit new items |

### Policy Management API

**File**: `src/api/workflow.ts`

#### Fetch Resource Policies

```typescript
export const getResourcePolicies = async (id: string) => {
  try {
    const response = await axios.get<ResourcePolicy>(
      `${siteConfig.apiEndpoint}/api/authz/resourcepolicies/search/resource?uuid=${id}&embed=eperson&embed=group`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
          "Authorization": authToken,
        },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error: any) {
    showToast("Failed to fetch resource policies.", "error");
  }
}
```

#### Create Resource Policy for Group

```typescript
export const AddResourcePolicyForGroup = async (
  uuid: string,           // Collection UUID
  selectedId: string,     // Group ID
  formData: string        // Policy data (JSON)
) => {
  try {
    const response = await axios.post(
      `${siteConfig.apiEndpoint}/api/authz/resourcepolicies?resource=${uuid}&group=${selectedId}`,
      formData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken,
          'Authorization': authToken
        },
        withCredentials: true
      }
    );
    
    if (response.status === 201) {
      showToast("Resource policy created successfully!", "success");
    }
  } catch (error) {
    console.error("Error creating resource policy:", error);
  }
}
```

#### Create Resource Policy for EPerson

```typescript
export const AddResourcePolicyForEperson = async (
  uuid: string,           // Collection UUID
  selectedId: string,     // EPerson ID
  formData: string        // Policy data (JSON)
) => {
  try {
    const response = await axios.post(
      `${siteConfig.apiEndpoint}/api/authz/resourcepolicies?resource=${uuid}&eperson=${selectedId}`,
      formData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken,
          'Authorization': authToken
        },
        withCredentials: true
      }
    );
    
    if (response.status === 201) {
      showToast("Resource policy created successfully!", "success");
    }
  } catch (error) {
    console.error("Error creating resource policy:", error);
  }
}
```

#### Update Resource Policy

```typescript
export const updateResourcePolicyMetadata = async (
  policyId: string,
  data: ResourcePolicyData
) => {
  const patchOperations = [
    {
      op: "replace",
      path: "/action",
      value: data.action  // Change action (READ, WRITE, etc.)
    }
  ];

  await axios.patch(
    `${siteConfig.apiEndpoint}/api/authz/resourcepolicies/${policyId}`,
    patchOperations,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrfToken,
        'Authorization': authToken,
      },
      withCredentials: true,
    }
  );
};
```

#### Update Policy Group

```typescript
export const updateResourcePolicyGroup = async (
  policyId: string,
  groupId: string
) => {
  await axios.put(
    `${siteConfig.apiEndpoint}/api/authz/resourcepolicies/${policyId}/group`,
    `${siteConfig.apiEndpoint}/api/eperson/groups/${groupId}`,
    {
      headers: {
        'Content-Type': 'text/uri-list',
        'X-XSRF-TOKEN': csrfToken,
        'Authorization': authToken,
      },
      withCredentials: true,
    }
  );
};
```

#### Delete Resource Policy

```typescript
export const removeResourcePolicy = async (id: string) => {
  try {
    const response = await axios.delete(
      `${siteConfig.apiEndpoint}/api/authz/resourcepolicies/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
          "Authorization": authToken,
        },
        withCredentials: true,
      }
    );
    
    if (response.status === 204) {
      showToast("Resource policy deleted successfully!", "success");
    }
  } catch (error: any) {
    showToast("Failed to delete resource policy.", "error");
  }
}
```

---

## Role Management

### Workflow-Specific Roles

Beyond the three default collection groups, you can assign workflow-specific roles:

#### 1. Submitter Role

**Endpoint**: `/api/core/collections/{uuid}/submittersGroup`

**Responsibility**:
- Submit items to the collection
- Upload files/bitstreams
- Complete submission forms
- Track their submissions

**Typical Users**: Authors, Researchers, Faculty Members

#### 2. Reviewer Role

**Endpoint**: `/api/core/collections/{uuid}/workflowGroups/reviewer`

**Responsibility**:
- Review submitted items
- Provide feedback/comments
- Approve or reject submissions
- Recommend changes

**Typical Users**: Subject Matter Experts, Senior Researchers

#### 3. Editor Role

**Endpoint**: `/api/core/collections/{uuid}/workflowGroups/editor`

**Responsibility**:
- Edit submission metadata
- Format items
- Enhance item records
- Prepare for publication

**Typical Users**: Collection Curators, Library Staff

#### 4. Final Editor Role

**Endpoint**: `/api/core/collections/{uuid}/workflowGroups/finaleditor`

**Responsibility**:
- Provide final approval
- Publish items to repository
- Archive completed items
- Manage final workflows

**Typical Users**: Collection Managers, Senior Librarians

### Role Assignment API

**File**: `src/api/assignRole.ts`

```typescript
// Fetch role groups
export const fetchSubmitterGroup = async (uuid: string) => {
  const response = await axios.get(
    `${siteConfig.apiEndpoint}/api/core/collections/${uuid}/submittersGroup`,
    { /* headers */ }
  );
  return response.data;
};

// Create role groups
export const createSubmitterGroup = async (uuid: string, description: string) => {
  const response = await axios.post(
    `${siteConfig.apiEndpoint}/api/core/collections/${uuid}/submittersGroup`,
    {
      metadata: {
        "dc.description": [{ value: description }],
      },
    },
    { /* headers */ }
  );
  return response.data;
};

// Delete role groups
export const deleteSubmitterGroup = async (uuid: string) => {
  await axios.delete(
    `${siteConfig.apiEndpoint}/api/core/collections/${uuid}/submittersGroup`,
    { /* headers */ }
  );
};
```

---

## API Integration

### Authentication & Headers

All API requests require:

```typescript
const csrfToken = localStorage.getItem("csrfToken") || "";
const authToken = localStorage.getItem("authToken") || "";

headers: {
  "Content-Type": "application/json",
  "X-XSRF-TOKEN": csrfToken,
  "Authorization": authToken
}
```

### Site Configuration

**File**: `src/data/data.ts`

```typescript
export const siteConfig = {
  apiEndpoint: "https://your-dspace-instance/server"  // Update with your DSpace instance
};
```

### API Base URLs

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Create Collection | `/api/core/collections?parent={parentId}` | POST |
| Create Group | `/api/eperson/groups` | POST |
| Get Policies | `/api/authz/resourcepolicies/search/resource?uuid={id}` | GET |
| Create Policy (Group) | `/api/authz/resourcepolicies?resource={uuid}&group={groupId}` | POST |
| Create Policy (EPerson) | `/api/authz/resourcepolicies?resource={uuid}&eperson={epersonId}` | POST |
| Update Policy | `/api/authz/resourcepolicies/{policyId}` | PATCH |
| Delete Policy | `/api/authz/resourcepolicies/{policyId}` | DELETE |
| Add Group Member | `/api/eperson/groups/{groupId}/epersons` | POST |
| Remove Group Member | `/api/eperson/groups/{groupId}/epersons/{epersonId}` | DELETE |

---

## UI Components

### Collection Creation Component

**File**: `src/pages/collection/createCollection.tsx`

This component handles the creation of collections, which automatically triggers group creation.

```typescript
interface CreateCollectionModalProps {
  open: boolean;
  onClose: () => void;
  communityId: string;
  titleText: string;
}

const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  open,
  onClose,
  communityId,
  titleText,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // This automatically creates the three groups
      await AddCollection(communityId, title, description);
      setTitle('');
      setDescription('');
      showToast("Collection created successfully!", "success");
      onClose(); 
    } catch (error) {
      showToast("Error creating collection", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Form UI */
  );
};
```

### Policy Management Component

**File**: `src/pages/collection/policy.tsx`

Displays and manages resource policies for a collection.

```typescript
const Policies = () => {
  const { id } = useParams<{ id: string }>();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  const fetchResourcePolicy = async () => {
    if (!id) return;
    const response = await getResourcePolicies(id);
    // Process and display policies
  };

  const handleDeleteClick = () => {
    // Handle policy deletion
  };

  return (
    /* Policy Management UI with table of policies */
  );
};
```

### Assign Role Component

**File**: `src/pages/assignRole/AssignRole.tsx`

Manages workflow-specific roles for a collection.

```typescript
function AssignRole({ description = "Default group" }: AssignRoleProps) {
  const [submitterGroup, setSubmitterGroup] = useState<Group | null>(null);
  const [reviewerGroup, setReviewerGroup] = useState<Group | null>(null);
  const [editorGroup, setEditorGroup] = useState<Group | null>(null);
  const [finalEditorGroup, setFinalEditorGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (id) {
      fetchAllGroups();
    }
  }, [id]);

  const fetchAllGroups = async () => {
    // Fetch all workflow roles
  };

  return (
    /* Role Management UI */
  );
}
```

---

## Implementation Steps

### Step 1: Understand the Flow

1. **Collection Created** → API endpoint creates collection resource
2. **System Waits** → 1-second delay to ensure collection is indexed
3. **Groups Created** → Three groups automatically generated:
   - `{CollectionName}_Read`
   - `{CollectionName}_Admin`
   - `{CollectionName}_Upload`
4. **Default Policies** → Resource policies linked to these groups
5. **Admin Setup** → Administrators add users to groups

### Step 2: Add Users to Groups

```typescript
// File: src/api/group.ts

export const addMemberToGroup = async (
  groupId: string,
  epersonId: string
) => {
  try {
    const payload = `${siteConfig.apiEndpoint}/api/eperson/epersons/${epersonId}`;
    
    const response = await axios.post(
      `${siteConfig.apiEndpoint}/api/eperson/groups/${groupId}/epersons`,
      payload,
      {
        headers: {
          "Content-Type": "text/uri-list",
          "X-XSRF-TOKEN": csrfToken,
          "Authorization": authToken,
        },
        withCredentials: true,
      }
    );
    
    return response.data;
  } catch (error: any) {
    throw error;
  }
};
```

### Step 3: Manage Permissions

1. **View Policies**: Fetch and display current policies
2. **Create Policies**: Assign policies to groups/users
3. **Update Policies**: Change action levels (READ → WRITE, etc.)
4. **Delete Policies**: Remove access as needed

### Step 4: Setup Workflow Roles (Optional)

1. Navigate to collection policies
2. Click "Assign Role" button
3. Create workflow-specific groups:
   - Submitter
   - Reviewer
   - Editor
   - Final Editor
4. Add users to these groups

---

## Permission Workflow

### Typical Permission Hierarchy

```
System Administrator
├── Full access to all collections
├── Can create/modify policies
└── Can manage all groups

Community Administrator
├── Access to community collections
├── Can manage collection admin group
└── Can assign roles to users

Collection Admin (via _Admin group)
├── Can manage collection policies
├── Can add/remove users from groups
├── Can edit item metadata
└── Can configure workflow

Submitter (via Submitter role)
├── Can submit items
├── Can upload files
├── Can edit own submissions
└── Cannot see others' submissions

Reviewer (via Reviewer role)
├── Can view submitted items
├── Can provide feedback
├── Can approve/reject
└── Cannot modify items

General User (via _Read group)
├── Can browse collection
├── Can view published items
├── Can read metadata
└── No edit or submit access
```

### Example Permission Scenarios

#### Scenario 1: Journal Collection

```
Collection: Academic Papers Journal

Groups Created:
- Academic Papers Journal_Read      → All users
- Academic Papers Journal_Admin     → Editor-in-Chief, Managing Editor
- Academic Papers Journal_Upload    → Registered authors

Workflow Roles:
- Submitter: Authors
- Reviewer: Peer reviewers
- Editor: Copy editors
- Final Editor: Editor-in-Chief
```

#### Scenario 2: Thesis Repository

```
Collection: Graduate Theses

Groups Created:
- Graduate Theses_Read              → Faculty, staff, students
- Graduate Theses_Admin             → Graduate coordinators
- Graduate Theses_Upload            → Graduate students

Workflow Roles:
- Submitter: PhD/Master students
- Reviewer: Committee members
- Editor: Department staff
- Final Editor: Department head
```

#### Scenario 3: Institutional Repository

```
Collection: Faculty Publications

Groups Created:
- Faculty Publications_Read          → Everyone (public)
- Faculty Publications_Admin         → Repository managers
- Faculty Publications_Upload        → Faculty members

Workflow Roles:
- Submitter: Faculty
- Reviewer: Senior faculty
- Editor: Librarians
- Final Editor: Repository director
```

---

## Troubleshooting

### Issue 1: Groups Not Created After Collection Creation

**Symptoms**:
- Collection created but groups missing
- "Failed to create group" messages appear

**Causes**:
- API endpoint unavailable
- CSRF token invalid
- Insufficient permissions
- Network timeout during 1-second wait

**Solutions**:

```typescript
// Check 1: Verify CSRF token
const csrfToken = localStorage.getItem("csrfToken");
console.log("CSRF Token present:", !!csrfToken);

// Check 2: Verify authentication
const authToken = localStorage.getItem("authToken");
console.log("Auth Token present:", !!authToken);

// Check 3: Increase timeout delay
setTimeout(async () => {
  // Create groups
}, 2000); // Increase to 2 seconds

// Check 4: Add error logging
.catch((groupError: any) => {
  console.error("Group creation error:", {
    status: groupError.response?.status,
    message: groupError.response?.statusText,
    data: groupError.response?.data
  });
});
```

### Issue 2: Cannot Add Users to Groups

**Symptoms**:
- "Failed to add member to group" error
- User not appearing in group

**Causes**:
- User (EPerson) doesn't exist
- Wrong group ID
- Insufficient permissions
- Content-Type header incorrect

**Solutions**:

```typescript
// Verify user exists
const users = await fetchNonMembers(groupId);
console.log("Available users:", users);

// Check group ID
console.log("Group ID:", groupId);

// Verify header is correct
headers: {
  "Content-Type": "text/uri-list",  // Critical for this endpoint
  "X-XSRF-TOKEN": csrfToken,
  "Authorization": authToken,
}

// Construct URL correctly
const payload = `${siteConfig.apiEndpoint}/api/eperson/epersons/${epersonId}`;
```

### Issue 3: Resource Policies Not Working

**Symptoms**:
- Users don't have expected permissions
- "Access Denied" errors
- Policies appear but don't grant access

**Causes**:
- Policy created but not linked to group
- Wrong action type specified
- Group has no members
- Policy has expiration date

**Solutions**:

```typescript
// Verify policy linked to group
const policies = await getResourcePolicies(collectionId);
console.log("Policies:", policies._embedded?.resourcepolicies);

// Check each policy
policies._embedded?.resourcepolicies?.forEach(policy => {
  console.log({
    action: policy.action,
    groupName: policy._embedded?.group?.name,
    groupId: policy._embedded?.group?.id,
    hasEndDate: !!policy.endDate
  });
});

// Verify group has members
const members = await fetchGroupMembers(groupId);
console.log("Group members:", members._embedded?.epersons);

// Check policy action
const validActions = ["READ", "WRITE", "DELETE", "ADMIN", "SUBMIT"];
console.log("Valid action?", validActions.includes(policy.action));
```

### Issue 4: UI Components Not Loading

**Symptoms**:
- "Collection ID is missing" error
- Empty policy list
- No role sections displayed

**Causes**:
- Route parameter not passed correctly
- Collection ID undefined
- API endpoint misconfigured

**Solutions**:

```typescript
// Check route parameter
const { id } = useParams<{ id: string }>();
console.log("Collection ID from params:", id);

// Verify navigation
navigate(`/assignRole/${collectionId}`)  // Correct
navigate(`/assignRole/`)  // Wrong - missing ID

// Check site config
console.log("API Endpoint:", siteConfig.apiEndpoint);

// Verify tokens
console.log({
  authToken: !!localStorage.getItem("authToken"),
  csrfToken: !!localStorage.getItem("csrfToken")
});
```

---

## Best Practices

### 1. Group Naming Convention

```typescript
// Use clear, descriptive names
❌ Bad:  "group1", "temp", "test"
✓ Good: "Research Papers_Admin", "Theses_Upload"

// Include collection name for clarity
❌ Bad:  "readers", "admins"
✓ Good: "Journal Collection_Read", "Journal Collection_Admin"
```

### 2. Permission Management

```typescript
// Principle of Least Privilege
- Assign only necessary permissions
- Use _Read for public access
- Reserve _Admin for trusted curators
- Set _Upload for active contributors

// Regular audits
- Review group membership quarterly
- Remove inactive users
- Update permissions as needed
- Document permission changes
```

### 3. Error Handling

```typescript
// Always provide feedback
showToast(
  "Collection created successfully!",
  "success"
);

// Log errors for debugging
console.error("Detailed error info:", {
  endpoint: url,
  status: error.response?.status,
  message: error.message,
  timestamp: new Date().toISOString()
});

// Graceful degradation
try {
  // Primary action
} catch (error) {
  // Fallback action
}
```

### 4. Performance Optimization

```typescript
// Use Promise.all for parallel requests
const [groups] = await Promise.all([
  fetchSubmitterGroup(id),
  fetchReviewerGroup(id),
  fetchEditorGroup(id),
  fetchFinalEditorGroup(id)
]);

// Implement pagination for large groups
const members = await fetchGroupMembers(
  groupId,
  page: 0,      // Page number
  size: 10      // Items per page
);

// Cache frequently accessed data
const cachedGroups = localStorage.getItem("collectionGroups");
```

---

## Advanced Configuration

### Custom Permission Levels

```typescript
// Create additional groups for specific needs
const customGroups = [
  "Collection_Reviewers",
  "Collection_QualityAssurance",
  "Collection_SpecialAccess"
];

// Assign specific resource policies
await AddResourcePolicyForGroup(
  collectionId,
  groupId,
  {
    action: "READ",
    policyType: "TYPE_CUSTOM",
    startDate: "2026-01-01",    // Optional
    endDate: "2026-12-31"       // Optional
  }
);
```

### Automated Workflows

```typescript
// Auto-assign users to groups based on criteria
async function autoAssignRoles(userId: string, role: string) {
  const groups = await fetchGroups();
  
  const targetGroup = groups.find(
    g => g.name.includes(role)
  );
  
  if (targetGroup) {
    await addMemberToGroup(targetGroup.id, userId);
  }
}
```

### Batch Operations

```typescript
// Create multiple policies at once
async function createBatchPolicies(
  collectionId: string,
  groupIds: string[],
  action: string
) {
  return Promise.all(
    groupIds.map(groupId =>
      AddResourcePolicyForGroup(
        collectionId,
        groupId,
        { action }
      )
    )
  );
}
```

---

## References & Resources

- **DSpace REST API**: https://wiki.dspace.org/display/DSPACE/REST+API
- **Resource Policies**: https://wiki.dspace.org/display/DSPACE/Authorization
- **Group Management**: https://wiki.dspace.org/display/DSPACE/Groups
- **Collection Management**: https://wiki.dspace.org/display/DSPACE/Collections
- **Workflow Configuration**: https://wiki.dspace.org/display/DSPACE/Workflow

---

## Summary

The collection-wise permissions system in DSpace operates through:

1. **Automatic Group Creation**: Three groups created with every collection
2. **Resource Policies**: Fine-grained control over who can do what
3. **Role Assignment**: Optional workflow-specific roles for complex processes
4. **Group Membership**: Users gain permissions through group membership
5. **Policy Management**: Administrators control access through policy UI

This hierarchical approach allows flexible, scalable permission management across the entire DSpace instance while maintaining security and data integrity.

---

**Document Version**: 1.0  
**Last Updated**: March 29, 2026  
**Compatible With**: DSpace 8.x, React 18.x, Material-UI 5.x+

