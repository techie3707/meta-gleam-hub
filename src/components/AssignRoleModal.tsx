import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
} from '@/api/assignRole';

interface AssignRoleModalProps {
  collectionId: string;
  collectionName?: string;
  onClose?: () => void;
}

const roleConfig = [
  { key: 'submitter', label: 'Submitter', color: 'bg-blue-100 text-blue-800' },
  { key: 'reviewer', label: 'Reviewer', color: 'bg-purple-100 text-purple-800' },
  { key: 'editor', label: 'Editor', color: 'bg-green-100 text-green-800' },
  { key: 'finalEditor', label: 'Final Editor', color: 'bg-orange-100 text-orange-800' },
];

const AssignRoleModal = ({ collectionId, collectionName = 'Collection', onClose }: AssignRoleModalProps) => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Record<string, any>>({
    submitter: null,
    reviewer: null,
    editor: null,
    finalEditor: null,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, [collectionId]);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        fetchSubmitterGroup(collectionId),
        fetchReviewerGroup(collectionId),
        fetchEditorGroup(collectionId),
        fetchFinalEditorGroup(collectionId),
      ]);

      const newRoles: Record<string, any> = {
        submitter: null,
        reviewer: null,
        editor: null,
        finalEditor: null,
      };

      const roleKeys = ['submitter', 'reviewer', 'editor', 'finalEditor'];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.data) {
          newRoles[roleKeys[index]] = result.value.data;
        }
      });

      setRoles(newRoles);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setError('Failed to fetch roles');
      toast({
        title: 'Error',
        description: 'Failed to fetch roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (roleKey: string) => {
    setActionLoading(roleKey);
    try {
      const description = `${roleKey.charAt(0).toUpperCase() + roleKey.slice(1)} group for ${collectionName}`;

      switch (roleKey) {
        case 'submitter':
          await createSubmitterGroup(collectionId, description);
          break;
        case 'reviewer':
          await createReviewerGroup(collectionId, description);
          break;
        case 'editor':
          await createEditorGroup(collectionId, description);
          break;
        case 'finalEditor':
          await createFinalEditorGroup(collectionId, description);
          break;
      }

      const roleName = roleConfig.find(r => r.key === roleKey)?.label;
      toast({
        title: 'Success',
        description: `${roleName} role created successfully!`,
      });

      await fetchRoles();
    } catch (err) {
      console.error('Failed to create group:', err);
      toast({
        title: 'Error',
        description: 'Failed to create role group',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (roleKey: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${roleKey} role?`)) return;

    setActionLoading(roleKey);
    try {
      switch (roleKey) {
        case 'submitter':
          await deleteSubmitterGroup(collectionId);
          break;
        case 'reviewer':
          await deleteReviewerGroup(collectionId);
          break;
        case 'editor':
          await deleteEditorGroup(collectionId);
          break;
        case 'finalEditor':
          await deleteFinalEditorGroup(collectionId);
          break;
      }

      const roleName = roleConfig.find(r => r.key === roleKey)?.label;
      toast({
        title: 'Success',
        description: `${roleName} role deleted successfully!`,
      });

      await fetchRoles();
    } catch (err) {
      console.error('Failed to delete group:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete role group',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Assign Roles to Collection</h3>
        <p className="text-sm text-muted-foreground">
          Configure workflow roles for <strong>{collectionName}</strong>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {roleConfig.map((role) => {
          const roleData = roles[role.key as keyof typeof roles];
          const isLoading = actionLoading === role.key;

          return (
            <div
              key={role.key}
              className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Badge className={role.color}>{role.label}</Badge>
                {roleData ? (
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Group: <span className="text-primary">{roleData.name || roleData.id}</span>
                    </p>
                    {roleData.description && (
                      <p className="text-xs text-muted-foreground mt-1">{roleData.description}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not assigned</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {roleData ? (
                  <>
                    <Badge variant="outline" className="bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Assigned
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(role.key)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreate(role.key)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AssignRoleModal;
