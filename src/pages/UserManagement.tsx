/**
 * User Management Page
 * Manage users (EPerson) - create, edit, delete, search
 * Includes role assignment for collections (Submitter, Reviewer, Editor, Final Editor)
 */

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, Edit, Trash2, Users, Shield } from "lucide-react";
import {
  searchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "@/api/userApi";
import { fetchCollections } from "@/api/collectionApi";
import { addMemberToGroup, removeGroupMember, searchGroups } from "@/api/groupApi";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  canLogIn: boolean;
  groups?: string[];
}

interface Collection {
  id: string;
  uuid: string;
  name: string;
  handle: string;
  metadata: Record<string, Array<{ value: string }>>;
}

interface RoleAssignment {
  collectionId: string;
  collectionName: string;
  submitter: boolean;
  reviewer: boolean;
  editor: boolean;
  finalEditor: boolean;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    canLogIn: true,
  });

  useEffect(() => {
    loadUsers();
    loadCollections();
  }, [page, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await searchUsers(searchQuery, page, 20);
      
      const usersData = response.users.map((user: any) => ({
        id: user.id,
        email: user.email,
        firstName: user.metadata["eperson.firstname"]?.[0]?.value || "",
        lastName: user.metadata["eperson.lastname"]?.[0]?.value || "",
        canLogIn: user.canLogIn,
      }));

      setUsers(usersData);
      setTotalPages(response.page.totalPages);
    } catch (error) {
      console.error("Load users error:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      const response = await fetchCollections(0, 100);
      setCollections(response.collections);
    } catch (error) {
      console.error("Load collections error:", error);
    }
  };

  const initializeRoleAssignments = () => {
    const assignments = collections.map((col) => ({
      collectionId: col.id || col.uuid,
      collectionName: col.metadata?.["dc.title"]?.[0]?.value || col.name,
      submitter: false,
      reviewer: false,
      editor: false,
      finalEditor: false,
    }));
    setRoleAssignments(assignments);
  };

  const handleAddUser = async () => {
    try {
      if (!formData.email || !formData.firstName || !formData.lastName) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      const createdUser = await createUser({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        canLogIn: formData.canLogIn,
      });

      // Assign roles to the created user
      await assignRolesToUser(createdUser.id);

      toast({
        title: "Success",
        description: "User created and roles assigned successfully",
      });

      setShowAddDialog(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error("Create user error:", error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      if (!formData.email || !formData.firstName || !formData.lastName) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      const operations = [
        {
          op: "replace" as const,
          path: "/email",
          value: formData.email,
        },
        {
          op: "replace" as const,
          path: "/metadata/eperson.firstname/0/value",
          value: formData.firstName,
        },
        {
          op: "replace" as const,
          path: "/metadata/eperson.lastname/0/value",
          value: formData.lastName,
        },
      ];

      await updateUser(selectedUser.id, operations);

      // Update roles for the user
      await assignRolesToUser(selectedUser.id);

      toast({
        title: "Success",
        description: "User updated and roles assigned successfully",
      });

      setShowEditDialog(false);
      setSelectedUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error("Update user error:", error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const assignRolesToUser = async (userId: string) => {
    try {
      for (const assignment of roleAssignments) {
        const roles = [];

        if (assignment.submitter) {
          roles.push(`${assignment.collectionName}_Upload`);
        }
        if (assignment.reviewer) {
          roles.push(`${assignment.collectionName}_Reviewer`);
        }
        if (assignment.editor) {
          roles.push(`${assignment.collectionName}_Editor`);
        }
        if (assignment.finalEditor) {
          roles.push(`${assignment.collectionName}_FinalEditor`);
        }

        // Add user to each selected role group
        for (const roleName of roles) {
          try {
            const groupsResult = await searchGroups(roleName, 0, 10);
            if (groupsResult.groups && groupsResult.groups.length > 0) {
              const group = groupsResult.groups[0];
              await addMemberToGroup(group.id || group.uuid, userId);
            }
          } catch (error) {
            console.error(`Failed to add user to group ${roleName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Assign roles error:", error);
      throw error;
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser.id);

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error("Delete user error:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const openAddDialog = () => {
    resetForm();
    initializeRoleAssignments();
    setShowAddDialog(true);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: "",
      canLogIn: user.canLogIn,
    });
    initializeRoleAssignments();
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      canLogIn: true,
    });
    setRoleAssignments([]);
  };

  const toggleRole = (collectionId: string, role: keyof Omit<RoleAssignment, 'collectionId' | 'collectionName'>) => {
    setRoleAssignments((prev) =>
      prev.map((assignment) =>
        assignment.collectionId === collectionId
          ? { ...assignment, [role]: !assignment[role] }
          : assignment
      )
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage system users and assign collection roles
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.firstName}</TableCell>
                    <TableCell>{user.lastName}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          user.canLogIn
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.canLogIn ? "Active" : "Disabled"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          title="Edit user and assign roles"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="py-2 px-4">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account and assign collection roles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* User Information Section */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Information
              </h3>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="user@example.com"
                />
                {!formData.email && (
                  <p className="text-red-500 text-sm mt-1">
                    Email is required.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                  />
                  {!formData.firstName && (
                    <p className="text-red-500 text-sm mt-1">
                      First name is required.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                  />
                  {!formData.lastName && (
                    <p className="text-red-500 text-sm mt-1">
                      Last name is required.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Role Assignment Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Assign Collection Roles
              </h3>

              {roleAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No collections available
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {roleAssignments.map((assignment) => (
                    <div
                      key={assignment.collectionId}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <p className="font-medium text-sm">
                        {assignment.collectionName}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${assignment.collectionId}-submitter`}
                            checked={assignment.submitter}
                            onCheckedChange={() =>
                              toggleRole(assignment.collectionId, "submitter")
                            }
                          />
                          <Label
                            htmlFor={`${assignment.collectionId}-submitter`}
                            className="text-xs cursor-pointer"
                          >
                            Submitter
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${assignment.collectionId}-reviewer`}
                            checked={assignment.reviewer}
                            onCheckedChange={() =>
                              toggleRole(assignment.collectionId, "reviewer")
                            }
                          />
                          <Label
                            htmlFor={`${assignment.collectionId}-reviewer`}
                            className="text-xs cursor-pointer"
                          >
                            Reviewer
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${assignment.collectionId}-editor`}
                            checked={assignment.editor}
                            onCheckedChange={() =>
                              toggleRole(assignment.collectionId, "editor")
                            }
                          />
                          <Label
                            htmlFor={`${assignment.collectionId}-editor`}
                            className="text-xs cursor-pointer"
                          >
                            Editor
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${assignment.collectionId}-finalEditor`}
                            checked={assignment.finalEditor}
                            onCheckedChange={() =>
                              toggleRole(assignment.collectionId, "finalEditor")
                            }
                          />
                          <Label
                            htmlFor={`${assignment.collectionId}-finalEditor`}
                            className="text-xs cursor-pointer"
                          >
                            Final Editor
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={!formData.email || !formData.firstName || !formData.lastName}
            >
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and assign collection roles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* User Information Section */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Information
              </h3>

              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
                {!formData.email && (
                  <p className="text-red-500 text-sm mt-1">
                    Email is required.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName">First Name *</Label>
                  <Input
                    id="edit-firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                  />
                  {!formData.firstName && (
                    <p className="text-red-500 text-sm mt-1">
                      First name is required.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-lastName">Last Name *</Label>
                  <Input
                    id="edit-lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                  />
                  {!formData.lastName && (
                    <p className="text-red-500 text-sm mt-1">
                      Last name is required.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Role Assignment Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Assign Collection Roles
              </h3>

              {roleAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No collections available
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {roleAssignments.map((assignment) => (
                    <div
                      key={assignment.collectionId}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <p className="font-medium text-sm">
                        {assignment.collectionName}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${assignment.collectionId}-submitter`}
                            checked={assignment.submitter}
                            onCheckedChange={() =>
                              toggleRole(assignment.collectionId, "submitter")
                            }
                          />
                          <Label
                            htmlFor={`edit-${assignment.collectionId}-submitter`}
                            className="text-xs cursor-pointer"
                          >
                            Submitter
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${assignment.collectionId}-reviewer`}
                            checked={assignment.reviewer}
                            onCheckedChange={() =>
                              toggleRole(assignment.collectionId, "reviewer")
                            }
                          />
                          <Label
                            htmlFor={`edit-${assignment.collectionId}-reviewer`}
                            className="text-xs cursor-pointer"
                          >
                            Reviewer
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${assignment.collectionId}-editor`}
                            checked={assignment.editor}
                            onCheckedChange={() =>
                              toggleRole(assignment.collectionId, "editor")
                            }
                          />
                          <Label
                            htmlFor={`edit-${assignment.collectionId}-editor`}
                            className="text-xs cursor-pointer"
                          >
                            Editor
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${assignment.collectionId}-finalEditor`}
                            checked={assignment.finalEditor}
                            onCheckedChange={() =>
                              toggleRole(assignment.collectionId, "finalEditor")
                            }
                          />
                          <Label
                            htmlFor={`edit-${assignment.collectionId}-finalEditor`}
                            className="text-xs cursor-pointer"
                          >
                            Final Editor
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={!formData.email || !formData.firstName || !formData.lastName}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for{" "}
              <strong>{selectedUser?.email}</strong>. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default UserManagement;
