/**
 * Create/Edit Policy Page
 * Create or edit resource policies for collections/communities (Group-based)
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Search, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  getResourcePolicies,
  createResourcePolicyForGroup,
  updateResourcePolicyGroup,
  updateResourcePolicyMetadata,
  ResourcePolicyData,
  ACTION_TYPES,
  POLICY_TYPES,
} from "@/api/policyApi";
import { fetchGroups, Group } from "@/api/groupApi";

const CreatePolicy = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const policyId = searchParams.get("edit");

  // Form state
  const [formData, setFormData] = useState<ResourcePolicyData>({
    policyType: "",
    action: "",
    type: { value: "resourcepolicy" },
  });

  // Group selection state
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const size = 10;

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [originalPolicyData, setOriginalPolicyData] =
    useState<ResourcePolicyData | null>(null);
  const [originalGroup, setOriginalGroup] = useState<string>("");

  // Check if editing on mount
  useEffect(() => {
    if (policyId && uuid) {
      setIsEditMode(true);
      fetchPolicyData(uuid);
    } else {
      setIsEditMode(false);
    }
  }, [policyId, uuid]);

  // Load groups on mount
  useEffect(() => {
    loadGroups(page, size, searchQuery);
  }, [page]);

  // Fetch existing policy data for edit mode
  const fetchPolicyData = async (resourceUuid: string) => {
    try {
      const response = await getResourcePolicies(resourceUuid);
      const policies = response._embedded?.resourcepolicies || [];

      const policy = policies.find((p) => p.id.toString() === policyId);

      if (policy) {
        const policyData = {
          policyType: policy.policyType || "",
          action: policy.action,
          type: { value: "resourcepolicy" },
        };

        setFormData(policyData);
        setOriginalPolicyData(policyData);

        if (policy._embedded?.group) {
          setSelectedGroup(policy._embedded.group.uuid);
          setSelectedGroupName(policy._embedded.group.name);
          setOriginalGroup(policy._embedded.group.uuid);
        }
      }
    } catch (error) {
      console.error("Error fetching policy data:", error);
      toast({
        title: "Error",
        description: "Failed to load policy data",
        variant: "destructive",
      });
    }
  };

  // Load groups with pagination and search
  const loadGroups = async (page: number, size: number, query: string) => {
    setLoading(true);
    try {
      const data = await fetchGroups(page - 1, size, query);
      setGroups(data.groups);
      setTotalPages(data.page.totalPages);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    setPage(1);
    loadGroups(1, size, searchQuery);
  };

  // Handle form field changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle group selection
  const handleSelectGroup = (groupId: string, groupName: string) => {
    setSelectedGroup(groupId);
    setSelectedGroupName(groupName);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!uuid || !selectedGroup) {
      toast({
        title: "Validation Error",
        description: "Please select an action and a group",
        variant: "destructive",
      });
      return;
    }

    if (!formData.action) {
      toast({
        title: "Validation Error",
        description: "Please select an action",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditMode && policyId) {
        // Update mode
        const needsGroupUpdate = selectedGroup !== originalGroup;
        const needsMetadataUpdate =
          formData.action !== originalPolicyData?.action ||
          formData.policyType !== originalPolicyData?.policyType;

        if (needsGroupUpdate && needsMetadataUpdate) {
          await updateResourcePolicyGroup(policyId, selectedGroup);
          await updateResourcePolicyMetadata(policyId, formData);
        } else if (needsGroupUpdate) {
          await updateResourcePolicyGroup(policyId, selectedGroup);
        } else if (needsMetadataUpdate) {
          await updateResourcePolicyMetadata(policyId, formData);
        }

        toast({
          title: "Success",
          description: "Policy updated successfully",
        });
      } else {
        // Create mode
        await createResourcePolicyForGroup(uuid, selectedGroup, formData);
        toast({
          title: "Success",
          description: "Policy created successfully",
        });
      }

      navigate(`/policies/${uuid}`);
    } catch (error) {
      console.error("Error saving policy:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? "update" : "create"} policy`,
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Policies
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditMode ? "Edit Resource Policy" : "Create New Resource Policy"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isEditMode
                ? "Update policy permissions for this resource"
                : "Grant permissions to a group for this resource"}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Action */}
              <div className="space-y-2">
                <Label htmlFor="action" className="text-sm font-medium">
                  Action <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.action}
                  onValueChange={(value) => handleSelectChange("action", value)}
                >
                  <SelectTrigger id="action" className="w-full">
                    <SelectValue placeholder="Select the action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((action) => (
                      <SelectItem key={action.id} value={action.id}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Permission level to grant (READ, WRITE, ADMIN, etc.)
                </p>
              </div>

              {/* Policy Type (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="policyType" className="text-sm font-medium">
                  Policy Type
                </Label>
                <Select
                  value={formData.policyType}
                  onValueChange={(value) =>
                    handleSelectChange("policyType", value)
                  }
                >
                  <SelectTrigger id="policyType" className="w-full">
                    <SelectValue placeholder="Select policy type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {POLICY_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Optional: Categorize the policy type
                </p>
              </div>
            </div>

            {/* Selected Group Display */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Selected Group <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={selectedGroupName} 
                  readOnly 
                  placeholder="No group selected - search below to select one" 
                  className={selectedGroupName ? "bg-muted" : ""}
                />
                {selectedGroupName && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedGroup("");
                      setSelectedGroupName("");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The group that will be granted the permission
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Group Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Group</span>
              {selectedGroupName && (
                <span className="text-sm font-normal text-muted-foreground">
                  {groups.length} groups available
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary">
                Search
              </Button>
            </div>

            {/* Groups Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading groups...</p>
                </div>
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  {searchQuery ? "No groups found matching your search" : "No groups available"}
                </p>
                {searchQuery && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery("");
                      handleSearch();
                    }}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[40%]">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow 
                        key={group.uuid}
                        className={selectedGroup === group.uuid ? "bg-primary/5" : ""}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {group.uuid.substring(0, 20)}...
                        </TableCell>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={
                              selectedGroup === group.uuid ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              handleSelectGroup(group.uuid, group.name)
                            }
                          >
                            {selectedGroup === group.uuid ? "✓ Selected" : "Select"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            {!formData.action && !selectedGroup && (
              <span>Please select an action and a group to continue</span>
            )}
            {!formData.action && selectedGroup && (
              <span>Please select an action to continue</span>
            )}
            {formData.action && !selectedGroup && (
              <span>Please select a group to continue</span>
            )}
            {formData.action && selectedGroup && (
              <span className="text-green-600 font-medium">✓ Ready to {isEditMode ? "update" : "create"} policy</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.action || !selectedGroup}
              size="lg"
            >
              {isEditMode ? "Update Policy" : "Create Policy"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreatePolicy;
