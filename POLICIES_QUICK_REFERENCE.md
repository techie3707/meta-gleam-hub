# Policies Management - Quick Reference

## Routes

| Route | Purpose | Access |
|-------|---------|--------|
| `/policies/:id` | View/manage policies for collection/community | Admin Only |
| `/policies/create/:uuid` | Create new policy | Admin Only |
| `/policies/create/:uuid?edit={policyId}` | Edit existing policy | Admin Only |
| `/resource-policy/:id` | View/manage resource policies for items | Admin Only |
| `/resource-policy/create/:uuid` | Create resource policy | Admin Only |

## API Functions

### Policy Operations
```typescript
import {
  getResourcePolicies,
  createResourcePolicyForGroup,
  createResourcePolicyForEPerson,
  updateResourcePolicyGroup,
  updateResourcePolicyMetadata,
  deleteResourcePolicy,
  ACTION_TYPES,
  POLICY_TYPES
} from '@/api/policyApi';
```

### Usage Examples

#### Get all policies for a resource
```typescript
const policies = await getResourcePolicies(resourceUuid);
// Returns: { _embedded: { resourcepolicies: [...] }, page: {...} }
```

#### Create policy for group
```typescript
await createResourcePolicyForGroup(
  resourceUuid,
  groupUuid,
  {
    policyType: "TYPE_CUSTOM",
    action: "READ",
    type: { value: "resourcepolicy" }
  }
);
```

#### Create policy for user
```typescript
await createResourcePolicyForEPerson(
  resourceUuid,
  epersonUuid,
  {
    name: "Read Access",
    description: "Allows reading",
    policyType: "TYPE_CUSTOM",
    action: "READ",
    type: { value: "resourcepolicy" }
  }
);
```

#### Update policy group
```typescript
await updateResourcePolicyGroup(policyId, newGroupUuid);
```

#### Update policy action
```typescript
await updateResourcePolicyMetadata(policyId, {
  action: "WRITE",
  policyType: "TYPE_WORKFLOW"
});
```

#### Delete policy
```typescript
await deleteResourcePolicy(policyId);
```

## Policy Types

- `TYPE_SUBMISSION` - Policies for submission process
- `TYPE_WORKFLOW` - Policies for workflow management
- `TYPE_INHERITED` - Policies inherited from parent
- `TYPE_CUSTOM` - Custom policies

## Action Types

- `READ` - View the resource
- `WRITE` - Modify the resource
- `REMOVE` - Remove items from resource
- `ADMIN` - Administrative access
- `DELETE` - Delete the resource
- `WITHDRAWN_READ` - Read withdrawn items
- `DEFAULT_BITSTREAM_READ` - Default read for files
- `DEFAULT_ITEM_READ` - Default read for items

## Component Props

### Navigation to Policies

#### From Edit Community Page
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// For collection policies
const handleCollectionPolicies = (collectionUuid: string) => {
  navigate(`/policies/${collectionUuid}`);
};

// For community policies
const handleCommunityPolicies = (communityUuid: string) => {
  navigate(`/policies/${communityUuid}`);
};
```

#### From Workflow Page
```typescript
// For items (resource policy)
navigate(`/resource-policy/${itemUuid}`);

// For collections/communities
navigate(`/policies/${collectionUuid}`);
```

## Data Structures

### Policy
```typescript
interface Policy {
  id: string;
  name: string | null;
  description: string | null;
  policyType: string;
  action: string;
  startDate: string | null;
  endDate: string | null;
  type: string;
  _embedded?: {
    eperson?: {
      uuid: string;
      email: string;
      metadata: {
        "eperson.firstname": [{ value: string }];
        "eperson.lastname": [{ value: string }];
      };
    };
    group?: {
      uuid: string;
      name: string;
      permanent: boolean;
    };
  };
}
```

### Resource Policy Data (for create/update)
```typescript
interface ResourcePolicyData {
  name?: string | null;
  description?: string | null;
  policyType: string;
  action: string;
  startDate?: string | null;
  endDate?: string | null;
  type: {
    value: string;
  };
}
```

## Common Patterns

### Bulk Delete
```typescript
const handleConfirmDelete = async () => {
  try {
    await Promise.all(
      selectedPolicies.map(id => deleteResourcePolicy(id))
    );
    // Refresh list
    await fetchResourcePolicies();
    setSelectedPolicies([]);
  } catch (error) {
    console.error('Delete failed:', error);
  }
};
```

### Extract EPerson Name
```typescript
const getEpersonName = (policy: Policy): string => {
  if (policy._embedded?.eperson) {
    const metadata = policy._embedded.eperson.metadata;
    const firstName = metadata["eperson.firstname"]?.[0]?.value || "";
    const lastName = metadata["eperson.lastname"]?.[0]?.value || "";
    return `${firstName} ${lastName}`.trim() || policy._embedded.eperson.email;
  }
  return "N/A";
};
```

### Smart Edit Mode
```typescript
const [searchParams] = useSearchParams();
const policyId = searchParams.get('edit');
const [isEditMode, setIsEditMode] = useState(false);

useEffect(() => {
  if (policyId && uuid) {
    setIsEditMode(true);
    // Load existing policy data
    fetchPolicyData(uuid);
  }
}, [policyId, uuid]);
```

## Toast Notifications

```typescript
import { toast } from '@/hooks/use-toast';

// Success
toast({
  title: "Success",
  description: "Policy created successfully",
});

// Error
toast({
  title: "Error",
  description: "Failed to create policy",
  variant: "destructive",
});

// Validation Error
toast({
  title: "Validation Error",
  description: "Please select an action and a group",
  variant: "destructive",
});
```

## URL Patterns

### View Policies
```
/policies/282164f5-d325-4740-8dd1-fa4d6d3e7200
```

### Create Policy
```
/policies/create/282164f5-d325-4740-8dd1-fa4d6d3e7200
```

### Edit Policy
```
/policies/create/282164f5-d325-4740-8dd1-fa4d6d3e7200?edit=30435
```

### View Resource Policies
```
/resource-policy/f94f88de-63ff-4f7a-a259-100dd585621a
```

### Create Resource Policy
```
/resource-policy/create/f94f88de-63ff-4f7a-a259-100dd585621a
```

## Styling with shadcn/ui

### Action Badge
```typescript
<span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
  {policy.action}
</span>
```

### Policy Type Badge
```typescript
<span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm">
  {policy.policyType}
</span>
```

### Assignee Type Badge (EPerson)
```typescript
<span className="flex items-center px-3 py-2 bg-primary/10 text-primary rounded text-sm">
  <UserCircle className="w-4 h-4 mr-1" />
  EPerson
</span>
```

### Assignee Type Badge (Group)
```typescript
<span className="flex items-center px-3 py-2 bg-secondary text-secondary-foreground rounded text-sm">
  <Users className="w-4 h-4 mr-1" />
  Group
</span>
```

## Error Handling

```typescript
try {
  await createResourcePolicyForGroup(uuid, groupId, formData);
  toast({
    title: "Success",
    description: "Policy created successfully",
  });
  navigate(`/policies/${uuid}`);
} catch (error) {
  console.error("Error creating policy:", error);
  toast({
    title: "Error",
    description: "Failed to create policy",
    variant: "destructive",
  });
}
```

## Testing Commands

```bash
# Start dev server
npm run dev

# Navigate to policies page
http://localhost:4000/policies/{uuid}

# Navigate to resource policy page
http://localhost:4000/resource-policy/{uuid}
```

## Checklist for New Features

When adding policies to a new resource type:

1. [ ] Add "Policies" button to the resource management page
2. [ ] Implement navigation to `/policies/{uuid}` or `/resource-policy/{uuid}`
3. [ ] Test CRUD operations
4. [ ] Verify permission checks
5. [ ] Test with different user roles
6. [ ] Verify embedded data loading (EPerson/Group)
7. [ ] Test pagination
8. [ ] Test search functionality
9. [ ] Verify toast notifications
10. [ ] Test error handling
