/**
 * Create Resource Policy Page
 * Create resource policy for items (EPerson-based)
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  createResourcePolicyForGroup,
  ResourcePolicyData,
  ACTION_TYPES,
} from "@/api/policyApi";
import { fetchGroups, Group } from "@/api/groupApi";

const CreateResourcePolicy = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<ResourcePolicyData>({
    action: "",
    type: { value: "resourcepolicy" },
  });

  // Group selection state
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");

  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>("");
  const [groupLoading, setGroupLoading] = useState<boolean>(false);
  const [groupPage, setGroupPage] = useState<number>(1);
  const [groupTotalPages, setGroupTotalPages] = useState<number>(1);

  const size = 10;

  // Load groups on mount
  useEffect(() => {
    loadGroups(groupPage, size, groupSearchQuery);
  }, [groupPage]);

  // Load groups with pagination and search
  const loadGroups = async (page: number, size: number, query: string) => {
    setGroupLoading(true);
    try {
      const data = await fetchGroups(page - 1, size, query);
      setGroups(data.groups);
      setGroupTotalPages(data.page.totalPages);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setGroupLoading(false);
    }
  };

  // Handle group search
  const handleGroupSearch = () => {
    setGroupPage(1);
    loadGroups(1, size, groupSearchQuery);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle Group selection
  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group.uuid);
    setSelectedGroupName(group.name);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!uuid) {
      toast({
        title: "Validation Error",
        description: "Resource UUID is missing",
        variant: "destructive",
      });
      return;
    }

    if (!selectedGroup) {
      toast({
        title: "Validation Error",
        description: "Please select a group",
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
      await createResourcePolicyForGroup(uuid, selectedGroup, formData);

      toast({
        title: "Success",
        description: "Resource policy created successfully",
      });

      navigate(`/resource-policy/${uuid}`);
    } catch (error) {
      console.error("Error creating resource policy:", error);
      toast({
        title: "Error",
        description: "Failed to create resource policy",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resource Policies
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Create New Resource Policy
          </h1>
          <p className="text-muted-foreground mt-1">
            Grant permissions to a group
          </p>
        </div>

        {/* Action Field */}
        <Card>
          <CardHeader>
            <CardTitle>Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action */}
            <div className="space-y-2">
              <Label htmlFor="action">Action *</Label>
              <Select
                value={formData.action}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, action: value }))}
              >
                <SelectTrigger id="action">
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
          </CardContent>
        </Card>

        {/* Group Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Group</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                {/* Search */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Search groups..."
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGroupSearch()}
                  />
                  <Button onClick={handleGroupSearch}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

            {/* Groups Table */}
            {groupLoading ? (
              <div className="text-center py-8">Loading groups...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.uuid}>
                      <TableCell className="font-mono text-sm">
                        {group.uuid}
                      </TableCell>
                      <TableCell>{group.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={
                            selectedGroup === group.uuid
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => handleSelectGroup(group)}
                        >
                          {selectedGroup === group.uuid
                            ? "Selected"
                            : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {groupTotalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setGroupPage((p) => Math.max(1, p - 1))}
                  disabled={groupPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {groupPage} of {groupTotalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setGroupPage((p) => Math.min(groupTotalPages, p + 1))
                  }
                  disabled={groupPage >= groupTotalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.action || !selectedGroup}
          >
            Create Resource Policy
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreateResourcePolicy;
