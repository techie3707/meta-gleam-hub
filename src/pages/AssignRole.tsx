/**
 * Assign Role to Collection Page
 * Manages workflow roles for a specific collection
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  fetchSubmitterGroup,
  createSubmitterGroup,
  deleteSubmitterGroup,
  fetchReviewerGroup,
  createReviewerGroup,
  deleteReviewerGroup,
  fetchEditorGroup,
  createEditorGroup,
  deleteEditorGroup,
  fetchFinalEditorGroup,
  createFinalEditorGroup,
  deleteFinalEditorGroup,
  Group,
  RoleType,
} from '@/api/assignRole';

const AssignRole = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State for groups
  const [groups, setGroups] = useState<Record<RoleType, Group | null>>({
    submitter: null,
    reviewer: null,
    editor: null,
    finalEditor: null,
  });

  // Loading states
  const [loading, setLoading] = useState({
    submitter: true,
    reviewer: true,
    editor: true,
    finalEditor: true,
  });

  // Error states
  const [errors, setErrors] = useState<Record<RoleType, string | null>>({
    submitter: null,
    reviewer: null,
    editor: null,
    finalEditor: null,
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<RoleType | null>(null);

  // Fetch all groups on mount
  useEffect(() => {
    if (id) {
      console.log(`[AssignRole] Fetching roles for collection: ${id}`);
      fetchAllGroups();
    } else {
      toast({
        title: 'Error',
        description: 'Collection ID is missing',
        variant: 'destructive',
      });
      navigate('/collections');
    }
  }, [id, navigate]);

  // Fetch all role groups
  const fetchAllGroups = async () => {
    if (!id) return;

    const roles: RoleType[] = ['submitter', 'reviewer', 'editor', 'finalEditor'];

    for (const role of roles) {
      try {
        setLoading((prev) => ({ ...prev, [role]: true }));
        setErrors((prev) => ({ ...prev, [role]: null }));

        console.log(`[AssignRole] Fetching ${role} group for collection ${id}`);

        let group: Group | null = null;

        if (role === 'submitter') {
          group = await fetchSubmitterGroup(id);
        } else if (role === 'reviewer') {
          group = await fetchReviewerGroup(id);
        } else if (role === 'editor') {
          group = await fetchEditorGroup(id);
        } else if (role === 'finalEditor') {
          group = await fetchFinalEditorGroup(id);
        }

        console.log(`[AssignRole] ${role} group result:`, group);
        setGroups((prev) => ({ ...prev, [role]: group }));
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || `Failed to fetch ${role} group`;
        console.error(`[AssignRole] Error fetching ${role} group:`, error);
        setErrors((prev) => ({
          ...prev,
          [role]: errorMessage,
        }));
      } finally {
        setLoading((prev) => ({ ...prev, [role]: false }));
      }
    }
  };

  // Create a new group
  const handleCreateGroup = async (role: RoleType) => {
    if (!id) return;

    try {
      setLoading((prev) => ({ ...prev, [role]: true }));
      setErrors((prev) => ({ ...prev, [role]: null }));

      const description = `${role.charAt(0).toUpperCase() + role.slice(1)} Group for Collection`;
      
      console.log(`[AssignRole] Creating ${role} group with description: ${description}`);

      let newGroup: Group | null = null;

      if (role === 'submitter') {
        newGroup = await createSubmitterGroup(id, description);
      } else if (role === 'reviewer') {
        newGroup = await createReviewerGroup(id, description);
      } else if (role === 'editor') {
        newGroup = await createEditorGroup(id, description);
      } else if (role === 'finalEditor') {
        newGroup = await createFinalEditorGroup(id, description);
      }

      console.log(`[AssignRole] ${role} group created successfully:`, newGroup);
      
      setGroups((prev) => ({ ...prev, [role]: newGroup }));
      toast({
        title: 'Success',
        description: `${role.charAt(0).toUpperCase() + role.slice(1)} group created successfully`,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || `Failed to create ${role} group`;
      console.error(`[AssignRole] Error creating ${role} group:`, error);
      setErrors((prev) => ({ ...prev, [role]: errorMessage }));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading((prev) => ({ ...prev, [role]: false }));
    }
  };

  // Delete a group
  const handleDeleteGroup = async (role: RoleType) => {
    if (!id) return;

    try {
      setLoading((prev) => ({ ...prev, [role]: true }));
      setErrors((prev) => ({ ...prev, [role]: null }));

      console.log(`[AssignRole] Deleting ${role} group for collection ${id}`);

      if (role === 'submitter') {
        await deleteSubmitterGroup(id);
      } else if (role === 'reviewer') {
        await deleteReviewerGroup(id);
      } else if (role === 'editor') {
        await deleteEditorGroup(id);
      } else if (role === 'finalEditor') {
        await deleteFinalEditorGroup(id);
      }

      console.log(`[AssignRole] ${role} group deleted successfully`);
      
      setGroups((prev) => ({ ...prev, [role]: null }));
      setDeleteConfirm(null);
      toast({
        title: 'Success',
        description: `${role.charAt(0).toUpperCase() + role.slice(1)} group deleted successfully`,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || `Failed to delete ${role} group`;
      console.error(`[AssignRole] Error deleting ${role} group:`, error);
      setErrors((prev) => ({ ...prev, [role]: errorMessage }));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading((prev) => ({ ...prev, [role]: false }));
      setDeleteConfirm(null);
    }
  };

  // Render a role section
  const renderRoleSection = (role: RoleType, title: string) => {
    const group = groups[role];
    const isLoading = loading[role];
    const error = errors[role];

    return (
      <Card key={role} className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>Loading...</span>
            </div>
          ) : error ? (
            <div className="py-4">
              <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Notice</p>
                  <p className="text-sm text-yellow-700 mt-1">{error}</p>
                </div>
              </div>
              <Button
                onClick={() => handleCreateGroup(role)}
                size="sm"
                className="w-full"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
          ) : group ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Group Name</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {group.name}
                  </p>
                </div>
                {group.metadata?.['dc.description']?.[0]?.value && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700">Description</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {group.metadata['dc.description'][0].value}
                    </p>
                  </div>
                )}
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600">ID</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">{group.id}</p>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirm(role)}
                size="sm"
                className="w-full"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </Button>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-gray-600 mb-4">
                No {title.toLowerCase()} group exists yet.
              </p>
              <Button
                onClick={() => handleCreateGroup(role)}
                size="sm"
                className="w-full"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Assign Roles to Collection
            </h1>
            <p className="text-muted-foreground mt-1">
              Collection ID: <span className="font-mono text-xs">{id}</span>
            </p>
          </div>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderRoleSection('submitter', 'Submitter Role')}
          {renderRoleSection('reviewer', 'Reviewer Role')}
          {renderRoleSection('editor', 'Editor Role')}
          {renderRoleSection('finalEditor', 'Final Editor Role')}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => {
        if (!open) setDeleteConfirm(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteConfirm} group? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteGroup(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AssignRole;
