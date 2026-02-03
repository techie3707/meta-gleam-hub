/**
 * Workflow Management Page
 * Manage workflow items - view, claim, approve, reject tasks
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, CheckCircle2, XCircle, Eye, RefreshCw } from "lucide-react";
import {
  fetchWorkflowItems,
  claimWorkflowTask,
  approveWorkflowItem,
  rejectWorkflowItem,
  WorkflowItem,
} from "@/api/workflowApi";

interface WorkflowTask {
  id: string;
  itemId: string;
  itemTitle: string;
  submitterEmail: string;
  submissionDate: string;
  workflowStep: string;
  claimed: boolean;
}

const WorkflowManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    loadTasks();
  }, [activeTab, page]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetchWorkflowItems(page, 20);

      const tasksData = response.items.map((item: any) => ({
        id: item.id,
        itemId: item.item?.id || "",
        itemTitle: item.item?.metadata?.["dc.title"]?.[0]?.value || "Untitled",
        submitterEmail: item.submitter?.email || "Unknown",
        submissionDate: new Date().toISOString(),
        workflowStep: "Review",
        claimed: false,
      }));

      setTasks(tasksData);
      setTotalPages(response.page?.totalPages || 1);
    } catch (error) {
      console.error("Load tasks error:", error);
      toast({
        title: "Error",
        description: "Failed to load workflow tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimTask = async (taskId: string) => {
    try {
      await claimWorkflowTask(taskId);
      toast({
        title: "Success",
        description: "Task claimed successfully",
      });
      loadTasks();
    } catch (error) {
      console.error("Claim task error:", error);
      toast({
        title: "Error",
        description: "Failed to claim task",
        variant: "destructive",
      });
    }
  };

  const handleApproveTask = async () => {
    if (!selectedTask) return;

    try {
      await approveWorkflowItem(selectedTask.id, comment);
      toast({
        title: "Success",
        description: "Item approved successfully",
      });
      setShowApproveDialog(false);
      setComment("");
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      console.error("Approve task error:", error);
      toast({
        title: "Error",
        description: "Failed to approve item",
        variant: "destructive",
      });
    }
  };

  const handleRejectTask = async () => {
    if (!selectedTask) return;

    try {
      await rejectWorkflowItem(selectedTask.id, comment || "Rejected");
      toast({
        title: "Success",
        description: "Item rejected",
      });
      setShowRejectDialog(false);
      setComment("");
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      console.error("Reject task error:", error);
      toast({
        title: "Error",
        description: "Failed to reject item",
        variant: "destructive",
      });
    }
  };

  const handleViewItem = (itemId: string) => {
    navigate(`/documents/${itemId}`);
  };

  const openApproveDialog = (task: WorkflowTask) => {
    setSelectedTask(task);
    setShowApproveDialog(true);
  };

  const openRejectDialog = (task: WorkflowTask) => {
    setSelectedTask(task);
    setShowRejectDialog(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <GitBranch className="h-6 w-6" />
              Workflow Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and manage submission workflows
            </p>
          </div>
          <Button onClick={loadTasks} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="pooled">Pooled Tasks</TabsTrigger>
            <TabsTrigger value="claimed">My Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Title</TableHead>
                    <TableHead>Submitter</TableHead>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading tasks...
                      </TableCell>
                    </TableRow>
                  ) : tasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No workflow tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.itemTitle}
                        </TableCell>
                        <TableCell>{task.submitterEmail}</TableCell>
                        <TableCell>{formatDate(task.submissionDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{task.workflowStep}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={task.claimed ? "default" : "secondary"}
                          >
                            {task.claimed ? "Claimed" : "Pooled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewItem(task.itemId)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!task.claimed ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleClaimTask(task.id)}
                              >
                                Claim
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openApproveDialog(task)}
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openRejectDialog(task)}
                                >
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            )}
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
              <div className="flex justify-center gap-2 mt-6">
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Submission</DialogTitle>
            <DialogDescription>
              Approve this item for publication: <strong>{selectedTask?.itemTitle}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Comment (Optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment for the submitter..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveTask}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Reject this item: <strong>{selectedTask?.itemTitle}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Reason (Required)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectTask}
              disabled={!comment.trim()}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default WorkflowManagement;
