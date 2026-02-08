/**
 * Policies Management Page
 * Displays and manages resource policies for collections/communities
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, Plus, Edit } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  getResourcePolicies,
  deleteResourcePolicy,
  Policy,
} from "@/api/policyApi";

const Policies = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [allSelected, setAllSelected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch policies on mount
  useEffect(() => {
    if (id) {
      fetchResourcePolicies();
    }
  }, [id]);

  // Fetch all policies for the resource
  const fetchResourcePolicies = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await getResourcePolicies(id);
      setPolicies(response._embedded?.resourcepolicies || []);
    } catch (error) {
      console.error("Error fetching policies:", error);
      toast({
        title: "Error",
        description: "Failed to load policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle individual policy selection
  const handleSelectPolicy = (policyId: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(policyId)
        ? prev.filter((id) => id !== policyId)
        : [...prev, policyId]
    );
  };

  // Toggle all policies selection
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedPolicies([]);
    } else {
      setSelectedPolicies(policies.map((policy) => policy.id));
    }
    setAllSelected(!allSelected);
  };

  // Open delete confirmation
  const handleDeleteClick = () => {
    if (selectedPolicies.length > 0) {
      setDeleteModalOpen(true);
    }
  };

  // Confirm and delete selected policies
  const handleConfirmDelete = async () => {
    try {
      // Delete all selected policies in parallel
      await Promise.all(
        selectedPolicies.map((policyId) => deleteResourcePolicy(policyId))
      );

      toast({
        title: "Success",
        description: `${selectedPolicies.length} policy deleted successfully`,
      });

      // Refresh the list
      await fetchResourcePolicies();

      // Reset selection
      setSelectedPolicies([]);
      setAllSelected(false);
      setDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting policies:", error);
      toast({
        title: "Error",
        description: "Failed to delete policies",
        variant: "destructive",
      });
    }
  };

  // Navigate to create policy page
  const handleAddPolicy = () => {
    navigate(`/policies/create/${id}`);
  };

  // Navigate to edit policy page
  const handleEditPolicy = (policyId: string) => {
    navigate(`/policies/create/${id}?edit=${policyId}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Policies Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage resource policies and permissions
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={selectedPolicies.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedPolicies.length})
            </Button>
            <Button onClick={handleAddPolicy}>
              <Plus className="w-4 h-4 mr-2" />
              Add Policy
            </Button>
          </div>
        </div>

        {/* Policies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Policies</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading policies...</div>
            ) : policies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No policies found. Click "Add Policy" to create one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => {
                    const groupName = policy._embedded?.group?.name || "N/A";

                    return (
                      <TableRow key={policy.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPolicies.includes(policy.id)}
                            onCheckedChange={() =>
                              handleSelectPolicy(policy.id)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {policy.id}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                            {policy.action}
                          </span>
                        </TableCell>
                        <TableCell>{groupName}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPolicy(policy.id)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedPolicies.length}{" "}
                selected policy? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Policies;
