/**
 * Resource Policy List Page
 * Displays and manages resource policies for items (with EPerson support)
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

const ResourcePolicy = () => {
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
        description: "Failed to load resource policies",
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
        description: `${selectedPolicies.length} resource policy deleted successfully`,
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
        description: "Failed to delete resource policies",
        variant: "destructive",
      });
    }
  };

  // Navigate to create resource policy page
  const handleAddPolicy = () => {
    navigate(`/resource-policy/create/${id}`);
  };

  // Get EPerson or Group name
  const getAssigneeName = (policy: Policy): string => {
    if (policy._embedded?.eperson) {
      const metadata = policy._embedded.eperson.metadata;
      const firstName =
        metadata["eperson.firstname"]?.[0]?.value || "";
      const lastName =
        metadata["eperson.lastname"]?.[0]?.value || "";
      return `${firstName} ${lastName}`.trim() || policy._embedded.eperson.email;
    }
    if (policy._embedded?.group) {
      return policy._embedded.group.name;
    }
    return "N/A";
  };

  // Get assignee type
  const getAssigneeType = (policy: Policy): string => {
    if (policy._embedded?.eperson) return "EPerson";
    if (policy._embedded?.group) return "Group";
    return "N/A";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Resource Policy
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage item-level resource policies
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
              Add Resource Policy
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
                No resource policies found. Click "Add Resource Policy" to create one.
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Assignee Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => {
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
                        <TableCell>{policy.name || "N/A"}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm">
                            {policy.policyType || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                            {policy.action}
                          </span>
                        </TableCell>
                        <TableCell>{getAssigneeName(policy)}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-sm">
                            {getAssigneeType(policy)}
                          </span>
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
                selected resource policy? This action cannot be undone.
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

export default ResourcePolicy;
