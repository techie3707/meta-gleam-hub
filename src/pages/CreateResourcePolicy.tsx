/**
 * Create Resource Policy Page
 * Create resource policy for items (EPerson-based)
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, ArrowLeft, Users, UserCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  createResourcePolicyForEPerson,
  createResourcePolicyForGroup,
  ResourcePolicyData,
  ACTION_TYPES,
  POLICY_TYPES,
} from "@/api/policyApi";
import { fetchUsers, EPerson } from "@/api/userApi";
import { fetchGroups, Group } from "@/api/groupApi";

const CreateResourcePolicy = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<ResourcePolicyData>({
    name: "",
    description: null,
    policyType: "",
    action: "",
    startDate: null,
    endDate: null,
    type: { value: "resourcepolicy" },
  });

  // Selection state
  const [selectedEperson, setSelectedEperson] = useState<string>("");
  const [selectedEpersonName, setSelectedEpersonName] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");

  // Users state
  const [users, setUsers] = useState<EPerson[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [userLoading, setUserLoading] = useState<boolean>(false);
  const [userPage, setUserPage] = useState<number>(1);
  const [userTotalPages, setUserTotalPages] = useState<number>(1);

  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>("");
  const [groupLoading, setGroupLoading] = useState<boolean>(false);
  const [groupPage, setGroupPage] = useState<number>(1);
  const [groupTotalPages, setGroupTotalPages] = useState<number>(1);

  const size = 10;
  const [activeTab, setActiveTab] = useState<"eperson" | "group">("eperson");

  // Load users on mount
  useEffect(() => {
    if (activeTab === "eperson") {
      loadUsers(userPage, size, userSearchQuery);
    }
  }, [userPage, activeTab]);

  // Load groups when tab changes
  useEffect(() => {
    if (activeTab === "group") {
      loadGroups(groupPage, size, groupSearchQuery);
    }
  }, [groupPage, activeTab]);

  // Load users with pagination and search
  const loadUsers = async (page: number, size: number, query: string) => {
    setUserLoading(true);
    try {
      const data = await fetchUsers(page - 1, size, query);
      setUsers(data.epersons);
      setUserTotalPages(data.page.totalPages);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setUserLoading(false);
    }
  };

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

  // Handle user search
  const handleUserSearch = () => {
    setUserPage(1);
    loadUsers(1, size, userSearchQuery);
  };

  // Handle group search
  const handleGroupSearch = () => {
    setGroupPage(1);
    loadGroups(1, size, groupSearchQuery);
  };

  // Handle form field changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle EPerson selection
  const handleSelectEperson = (eperson: EPerson) => {
    setSelectedEperson(eperson.uuid);
    const firstName =
      eperson.metadata["eperson.firstname"]?.[0]?.value || "";
    const lastName =
      eperson.metadata["eperson.lastname"]?.[0]?.value || "";
    const name = `${firstName} ${lastName}`.trim() || eperson.email;
    setSelectedEpersonName(name);
    // Clear group selection
    setSelectedGroup("");
    setSelectedGroupName("");
  };

  // Handle Group selection
  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group.uuid);
    setSelectedGroupName(group.name);
    // Clear EPerson selection
    setSelectedEperson("");
    setSelectedEpersonName("");
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

    if (!selectedEperson && !selectedGroup) {
      toast({
        title: "Validation Error",
        description: "Please select either an EPerson or a Group",
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
      if (selectedEperson) {
        await createResourcePolicyForEPerson(uuid, selectedEperson, formData);
      } else if (selectedGroup) {
        await createResourcePolicyForGroup(uuid, selectedGroup, formData);
      }

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

  // Get EPerson display name
  const getEpersonName = (eperson: EPerson): string => {
    const firstName =
      eperson.metadata["eperson.firstname"]?.[0]?.value || "";
    const lastName =
      eperson.metadata["eperson.lastname"]?.[0]?.value || "";
    return `${firstName} ${lastName}`.trim() || eperson.email;
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
            Grant permissions to a user or group
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name || ""}
                onChange={handleInputChange}
                placeholder="Enter policy name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleInputChange}
                placeholder="Enter policy description"
                rows={3}
              />
            </div>

            {/* Policy Type */}
            <div className="space-y-2">
              <Label htmlFor="policyType">Policy Type *</Label>
              <Select
                value={formData.policyType}
                onValueChange={(value) =>
                  handleSelectChange("policyType", value)
                }
              >
                <SelectTrigger id="policyType">
                  <SelectValue placeholder="Select the policy type" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action */}
            <div className="space-y-2">
              <Label htmlFor="action">Action *</Label>
              <Select
                value={formData.action}
                onValueChange={(value) => handleSelectChange("action", value)}
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
            </div>

            {/* Selected Assignee Display */}
            <div className="space-y-2">
              <Label>Selected Assignee</Label>
              <div className="flex gap-2">
                <Input
                  value={selectedEpersonName || selectedGroupName}
                  readOnly
                  placeholder="No assignee selected"
                />
                {selectedEperson && (
                  <span className="flex items-center px-3 py-2 bg-primary/10 text-primary rounded text-sm">
                    <UserCircle className="w-4 h-4 mr-1" />
                    EPerson
                  </span>
                )}
                {selectedGroup && (
                  <span className="flex items-center px-3 py-2 bg-secondary text-secondary-foreground rounded text-sm">
                    <Users className="w-4 h-4 mr-1" />
                    Group
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignee Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Assignee</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "eperson" | "group")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="eperson">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Search for EPerson
                </TabsTrigger>
                <TabsTrigger value="group">
                  <Users className="w-4 h-4 mr-2" />
                  Search for Group
                </TabsTrigger>
              </TabsList>

              {/* EPerson Tab */}
              <TabsContent value="eperson" className="space-y-4">
                {/* Search */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Search users by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUserSearch()}
                  />
                  <Button onClick={handleUserSearch}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {/* Users Table */}
                {userLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.uuid}>
                          <TableCell className="font-mono text-sm">
                            {user.uuid}
                          </TableCell>
                          <TableCell>{getEpersonName(user)}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={
                                selectedEperson === user.uuid
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => handleSelectEperson(user)}
                            >
                              {selectedEperson === user.uuid
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
                {userTotalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={userPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4">
                      Page {userPage} of {userTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setUserPage((p) => Math.min(userTotalPages, p + 1))
                      }
                      disabled={userPage >= userTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Group Tab */}
              <TabsContent value="group" className="space-y-4">
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.action ||
              !formData.policyType ||
              (!selectedEperson && !selectedGroup)
            }
          >
            Create Resource Policy
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreateResourcePolicy;
