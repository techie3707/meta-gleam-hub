/**
 * Process Monitoring Page
 * Monitor batch import processes and system processes
 */

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Activity,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  FileText,
} from "lucide-react";
import {
  fetchProcessesByStatus,
  fetchProcessById,
  deleteProcess,
  downloadProcessFile,
  fetchProcessOutput,
  Process as ApiProcess,
} from "@/api/processApi";

interface Process {
  id: string;
  processId: number;
  scriptName: string;
  userId: string;
  startTime?: string;
  endTime?: string;
  processStatus: string;
  parameters?: { name: string; value: string }[];
  files?: any[];
}

const ProcessMonitoring = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("running");
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [processOutput, setProcessOutput] = useState("");

  useEffect(() => {
    loadProcesses();
    const interval = setInterval(loadProcesses, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [activeTab, page]);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const status = activeTab.toUpperCase() as "SCHEDULED" | "RUNNING" | "COMPLETED" | "FAILED";
      const response = await fetchProcessesByStatus(status, page, 20);

      const processesData = response.processes.map((proc: any) => ({
        id: proc.processId?.toString() || proc.id,
        processId: proc.processId,
        scriptName: proc.scriptName || "Unknown",
        userId: proc.userId || "System",
        startTime: proc.startTime || "",
        endTime: proc.endTime || "",
        processStatus: proc.processStatus || "UNKNOWN",
        parameters: proc.parameters || [],
        files: proc._embedded?.files?._embedded?.files || [],
      }));

      setProcesses(processesData);
      setTotalPages(response.page.totalPages);
    } catch (error) {
      console.error("Load processes error:", error);
      toast({
        title: "Error",
        description: "Failed to load processes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (processId: string) => {
    try {
      const process = await fetchProcessById(parseInt(processId));
      if (process) {
        setSelectedProcess({
          id: process.processId.toString(),
          processId: process.processId,
          scriptName: process.scriptName,
          userId: process.userId,
          startTime: process.startTime,
          endTime: process.endTime,
          processStatus: process.processStatus,
          parameters: process.parameters,
          files: process._embedded?.files?._embedded?.files,
        });
        setShowDetailsDialog(true);
      }
    } catch (error) {
      console.error("Load process details error:", error);
      toast({
        title: "Error",
        description: "Failed to load process details",
        variant: "destructive",
      });
    }
  };

  const handleViewOutput = async (processId: string) => {
    try {
      const output = await fetchProcessOutput(parseInt(processId));
      setProcessOutput(output);
      setShowOutputDialog(true);
    } catch (error) {
      console.error("Load process output error:", error);
      toast({
        title: "Error",
        description: "Failed to load process output",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (processId: string, fileType: string) => {
    try {
      await downloadProcessFile(processId, fileType);
      toast({
        title: "Success",
        description: "Download started",
      });
    } catch (error) {
      console.error("Download file error:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProcess = async (processId: string) => {
    try {
      await deleteProcess(parseInt(processId));
      toast({
        title: "Success",
        description: "Process deleted",
      });
      loadProcesses();
    } catch (error) {
      console.error("Delete process error:", error);
      toast({
        title: "Error",
        description: "Failed to delete process",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "RUNNING":
        return "bg-blue-100 text-blue-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "SCHEDULED":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Process Monitoring
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor batch imports and system processes
            </p>
          </div>
          <Button onClick={loadProcesses} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="running">Running</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Process ID</TableHead>
                    <TableHead>Script Name</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading processes...
                      </TableCell>
                    </TableRow>
                  ) : processes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No processes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    processes.map((process) => (
                      <TableRow key={process.id}>
                        <TableCell className="font-mono text-sm">
                          {process.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {process.scriptName}
                        </TableCell>
                        <TableCell>{formatDate(process.startTime)}</TableCell>
                        <TableCell>{formatDate(process.endTime)}</TableCell>
                        <TableCell>
                          <Badge
                            className={getStatusColor(process.processStatus)}
                          >
                            {process.processStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(process.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewOutput(process.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {process.files && process.files.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDownloadFile(process.id, "output")
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {(process.processStatus === "COMPLETED" ||
                              process.processStatus === "FAILED") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProcess(process.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

      {/* Process Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Details</DialogTitle>
            <DialogDescription>
              Detailed information about process {selectedProcess?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedProcess && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Script Name
                  </div>
                  <div className="text-sm mt-1">{selectedProcess.scriptName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Status
                  </div>
                  <Badge className={`mt-1 ${getStatusColor(selectedProcess.processStatus)}`}>
                    {selectedProcess.processStatus}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Start Time
                  </div>
                  <div className="text-sm mt-1">
                    {formatDate(selectedProcess.startTime)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    End Time
                  </div>
                  <div className="text-sm mt-1">
                    {formatDate(selectedProcess.endTime)}
                  </div>
                </div>
              </div>

              {selectedProcess.parameters.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Parameters
                  </div>
                  <div className="border rounded-md p-3 bg-muted/50">
                    {selectedProcess.parameters.map((param, index) => (
                      <div key={index} className="text-sm py-1">
                        <span className="font-medium">{param.name}:</span>{" "}
                        {param.value || "—"}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProcess.files && selectedProcess.files.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Output Files
                  </div>
                  <div className="border rounded-md divide-y">
                    {selectedProcess.files.map((file: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 flex items-center justify-between"
                      >
                        <span className="text-sm">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleDownloadFile(selectedProcess.id, file.type)
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Output Dialog */}
      <Dialog open={showOutputDialog} onOpenChange={setShowOutputDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Process Output</DialogTitle>
            <DialogDescription>
              Log output from the process
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <pre className="bg-muted p-4 rounded-md text-xs font-mono whitespace-pre-wrap">
              {processOutput || "No output available"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ProcessMonitoring;
