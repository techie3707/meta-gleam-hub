/**
 * Import Page
 * Supports batch import with ZIP files containing documents
 * Per User Manual: Batch import with ZIP files
 */

import { useState, useEffect } from "react";
import { Upload, X, Check, AlertCircle, Archive, Loader2, Info } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { fetchCollections, Collection } from "@/api/collectionApi";
import { uploadBatchImport, fetchProcessById } from "@/api/processApi";

interface BatchImportState {
  zipFile: File | null;
  collection: string;
  validateOnly: boolean;
  sendToWorkflow: boolean;
  status: "idle" | "uploading" | "processing" | "completed" | "error";
  progress: number;
  processId: number | null;
  itemsProcessed: number;
  totalItems: number;
  itemsSucceeded: number;
  itemsFailed: number;
  error?: string;
}

const Import = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const { toast } = useToast();

  // Batch import state
  const [batchState, setBatchState] = useState<BatchImportState>({
    zipFile: null,
    collection: "",
    validateOnly: false,
    sendToWorkflow: false,
    status: "idle",
    progress: 0,
    processId: null,
    itemsProcessed: 0,
    totalItems: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
  });

  useEffect(() => {
    loadCollections();
  }, []);

  // Poll for batch import progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (batchState.processId && batchState.status === "processing") {
      interval = setInterval(async () => {
        const process = await fetchProcessById(batchState.processId!);
        if (process) {
          const itemsProcessed = parseInt(
            process.parameters?.find(p => p.name === "itemsProcessed")?.value || "0"
          );
          const totalItems = parseInt(
            process.parameters?.find(p => p.name === "itemsTotal")?.value || "0"
          );
          const itemsSucceeded = parseInt(
            process.parameters?.find(p => p.name === "itemsSucceeded")?.value || "0"
          );
          const itemsFailed = parseInt(
            process.parameters?.find(p => p.name === "itemsFailed")?.value || "0"
          );

          const progress = totalItems > 0 ? (itemsProcessed / totalItems) * 100 : 0;

          setBatchState(prev => ({
            ...prev,
            progress,
            itemsProcessed,
            totalItems,
            itemsSucceeded,
            itemsFailed,
          }));

          if (process.processStatus === "COMPLETED") {
            setBatchState(prev => ({
              ...prev,
              status: "completed",
              progress: 100,
            }));
            toast({
              title: "Batch Import Complete",
              description: `Successfully imported ${itemsSucceeded} items. ${itemsFailed} failed.`,
            });
          } else if (process.processStatus === "FAILED") {
            setBatchState(prev => ({
              ...prev,
              status: "error",
              error: "Import process failed",
            }));
            toast({
              title: "Import Failed",
              description: "The batch import process encountered an error",
              variant: "destructive",
            });
          }
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [batchState.processId, batchState.status]);

  const loadCollections = async () => {
    try {
      const result = await fetchCollections(0, 100);
      setCollections(result.collections);
    } catch (error) {
      console.error("Failed to load collections:", error);
    }
  };

  // Batch import handlers
  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBatchState(prev => ({ ...prev, zipFile: e.target.files![0] }));
    }
  };

  const handleBatchImport = async () => {
    if (!batchState.zipFile || !batchState.collection) {
      toast({
        title: "Missing required files",
        description: "Please select a ZIP file and target collection",
        variant: "destructive",
      });
      return;
    }

    setBatchState(prev => ({ ...prev, status: "uploading", progress: 0 }));

    try {
      const process = await uploadBatchImport(
        batchState.zipFile, 
        batchState.collection,
        {
          validate: batchState.validateOnly,
          workflow: batchState.sendToWorkflow,
        }
      );
      
      setBatchState(prev => ({
        ...prev,
        status: "processing",
        processId: process.processId,
        progress: 10,
      }));

      let description = "Batch import process has been initiated";
      if (batchState.validateOnly) {
        description = "Validation started! Check processes page for results.";
      } else if (batchState.sendToWorkflow) {
        description = "Items will be sent to workflow queue for review.";
      }

      toast({
        title: batchState.validateOnly ? "Validation Started" : "Import Started",
        description,
      });

    } catch (error: any) {
      setBatchState(prev => ({
        ...prev,
        status: "error",
        error: error.message || "Failed to start import",
      }));
      toast({
        title: "Import Failed",
        description: error.message || "Failed to start batch import",
        variant: "destructive",
      });
    }
  };

  const resetBatchImport = () => {
    setBatchState({
      zipFile: null,
      collection: "",
      validateOnly: false,
      sendToWorkflow: false,
      status: "idle",
      progress: 0,
      processId: null,
      itemsProcessed: 0,
      totalItems: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Documents</h1>
          <p className="text-muted-foreground mt-1">
            Upload documents in batch using ZIP files
          </p>
        </div>

        {/* Batch Import Section */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Batch Import</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Upload multiple items at once using a ZIP file containing your documents.
            The system will process each file and create items in the selected collection.
          </p>

          {batchState.status === "idle" && (
            <div className="space-y-6">
              {/* Collection Selection */}
              <div className="space-y-2">
                <Label>Target Collection *</Label>
                <Select
                  value={batchState.collection}
                  onValueChange={(value) => setBatchState(prev => ({ ...prev, collection: value }))}
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ZIP File */}
              <div className="space-y-2">
                <Label>ZIP File with Documents *</Label>
                <div className={cn(
                  "border-2 border-dashed rounded-lg p-4 transition-colors",
                  batchState.zipFile ? "border-primary bg-primary/5" : "border-border"
                )}>
                  {batchState.zipFile ? (
                    <div className="flex items-center gap-3">
                      <Archive className="w-8 h-8 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{batchState.zipFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(batchState.zipFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setBatchState(prev => ({ ...prev, zipFile: null }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 cursor-pointer">
                      <Archive className="w-6 h-6 text-muted-foreground" />
                      <span className="text-muted-foreground">Select ZIP file containing documents</span>
                      <input
                        type="file"
                        accept=".zip"
                        onChange={handleZipSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Import Options */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium text-foreground">Import Options</h3>
                
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="validate-only"
                    checked={batchState.validateOnly}
                    onCheckedChange={(checked) =>
                      setBatchState(prev => ({ ...prev, validateOnly: checked as boolean }))
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="validate-only"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Validate only (test without importing)
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Check the SAF package for errors without actually importing items
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="send-workflow"
                    checked={batchState.sendToWorkflow}
                    disabled={batchState.validateOnly}
                    onCheckedChange={(checked) =>
                      setBatchState(prev => ({ ...prev, sendToWorkflow: checked as boolean }))
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="send-workflow"
                      className={cn(
                        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
                        batchState.validateOnly && "opacity-50"
                      )}
                    >
                      Send to workflow (requires review before publication)
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Items will be placed in the workflow queue for review and approval
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Alerts */}
              {batchState.validateOnly && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>Validation mode:</strong> The SAF package will be checked for errors but no items will be imported. 
                    Review the process output to see validation results.
                  </AlertDescription>
                </Alert>
              )}

              {batchState.sendToWorkflow && !batchState.validateOnly && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Info className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-900">
                    <strong>Workflow mode:</strong> Items will be sent to the workflow queue and require approval before publication. 
                    Navigate to the Workflow page to review and approve items.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleBatchImport}
                disabled={!batchState.zipFile || !batchState.collection}
                className="mt-4"
              >
                <Upload className="w-4 h-4 mr-2" />
                {batchState.validateOnly ? "Validate Package" : "Start Batch Import"}
              </Button>
            </div>
          )}

          {/* Processing State */}
          {(batchState.status === "uploading" || batchState.status === "processing") && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">
                    {batchState.status === "uploading" ? "Uploading files..." : "Processing import..."}
                  </p>
                  {batchState.totalItems > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {batchState.itemsProcessed} / {batchState.totalItems} items processed
                    </p>
                  )}
                </div>
              </div>
              <Progress value={batchState.progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(batchState.progress)}% complete
              </p>
            </div>
          )}

          {/* Completed State */}
          {batchState.status === "completed" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-green-600">
                <Check className="w-8 h-8" />
                <div>
                  <p className="font-semibold text-lg">Import Complete!</p>
                  <p className="text-sm text-muted-foreground">
                    Successfully imported {batchState.itemsSucceeded} items
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{batchState.totalItems}</p>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{batchState.itemsSucceeded}</p>
                  <p className="text-sm text-muted-foreground">Succeeded</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{batchState.itemsFailed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>

              <Button onClick={resetBatchImport}>
                Start New Import
              </Button>
            </div>
          )}

          {/* Error State */}
          {batchState.status === "error" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-destructive">
                <AlertCircle className="w-8 h-8" />
                <div>
                  <p className="font-semibold">Import Failed</p>
                  <p className="text-sm">{batchState.error}</p>
                </div>
              </div>
              <Button onClick={resetBatchImport}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Import;
