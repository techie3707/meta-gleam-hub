/**
 * Import Page
 * Supports single file uploads with metadata and batch import (CSV + ZIP)
 * Per User Manual: Batch import with CSV metadata and ZIP files
 */

import { useState, useCallback, useEffect } from "react";
import { Upload, File, X, Check, AlertCircle, Plus, FileSpreadsheet, Archive, Loader2, Download } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { fetchCollections, Collection } from "@/api/collectionApi";
import { createItem, uploadBitstream } from "@/api/itemApi";
import { uploadBatchImport, fetchProcessById, Process } from "@/api/processApi";

interface UploadedFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  metadata: {
    title: string;
    description: string;
    collection: string;
    tags: string[];
    author: string;
    dateIssued: string;
  };
}

interface BatchImportState {
  csvFile: File | null;
  zipFile: File | null;
  collection: string;
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
  const [activeTab, setActiveTab] = useState("single");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const { toast } = useToast();

  // Batch import state
  const [batchState, setBatchState] = useState<BatchImportState>({
    csvFile: null,
    zipFile: null,
    collection: "",
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
      setLoadingCollections(true);
      const result = await fetchCollections(0, 100);
      setCollections(result.collections);
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: "pending",
      progress: 0,
      metadata: {
        title: file.name.replace(/\.[^/.]+$/, ""),
        description: "",
        collection: "",
        tags: [],
        author: "",
        dateIssued: new Date().toISOString().split('T')[0],
      },
    }));
    setFiles((prev) => [...prev, ...uploadedFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateMetadata = (
    id: string,
    field: keyof UploadedFile["metadata"],
    value: string | string[]
  ) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, metadata: { ...f.metadata, [field]: value } } : f
      )
    );
  };

  const addTag = (id: string, tag: string) => {
    if (!tag.trim()) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, metadata: { ...f.metadata, tags: [...f.metadata.tags, tag.trim()] } }
          : f
      )
    );
    setNewTag("");
  };

  const removeTag = (id: string, tagIndex: number) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              metadata: {
                ...f.metadata,
                tags: f.metadata.tags.filter((_, i) => i !== tagIndex),
              },
            }
          : f
      )
    );
  };

  const handleUploadSingle = async () => {
    const filesToUpload = files.filter(f => f.status === "pending" && f.metadata.collection);
    
    if (filesToUpload.length === 0) {
      toast({
        title: "No files to upload",
        description: "Please add files and select a collection for each",
        variant: "destructive",
      });
      return;
    }

    for (const uploadedFile of filesToUpload) {
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: "uploading" } : f
      ));

      try {
        // Create metadata
        const metadata: Record<string, Array<{ value: string; language?: string }>> = {
          "dc.title": [{ value: uploadedFile.metadata.title, language: "en" }],
          "dc.date.issued": [{ value: uploadedFile.metadata.dateIssued }],
        };

        if (uploadedFile.metadata.author) {
          metadata["dc.contributor.author"] = [{ value: uploadedFile.metadata.author }];
        }

        if (uploadedFile.metadata.description) {
          metadata["dc.description.abstract"] = [{ value: uploadedFile.metadata.description, language: "en" }];
        }

        if (uploadedFile.metadata.tags.length > 0) {
          metadata["dc.subject"] = uploadedFile.metadata.tags.map(tag => ({ value: tag, language: "en" }));
        }

        // Create item
        const item = await createItem(uploadedFile.metadata.collection, metadata);
        
        if (!item) {
          throw new Error("Failed to create item");
        }

        // Upload file
        await uploadBitstream(item.id, uploadedFile.file);

        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { ...f, status: "success", progress: 100 } : f
        ));

      } catch (error: any) {
        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { ...f, status: "error", error: error.message } : f
        ));
      }
    }

    toast({
      title: "Upload Complete",
      description: `Processed ${filesToUpload.length} file(s)`,
    });
  };

  // Batch import handlers
  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBatchState(prev => ({ ...prev, csvFile: e.target.files![0] }));
    }
  };

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
      const process = await uploadBatchImport(batchState.zipFile, batchState.collection);
      
      setBatchState(prev => ({
        ...prev,
        status: "processing",
        processId: process.processId,
        progress: 10,
      }));

      toast({
        title: "Import Started",
        description: "Batch import process has been initiated",
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
      csvFile: null,
      zipFile: null,
      collection: "",
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
            Upload documents individually or in batch with metadata
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="single">Single Upload</TabsTrigger>
            <TabsTrigger value="batch">Batch Import</TabsTrigger>
          </TabsList>

          {/* Single Upload Tab */}
          <TabsContent value="single" className="mt-6 space-y-6">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 animate-slide-up",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors",
                    isDragOver ? "bg-primary/20" : "bg-muted"
                  )}
                >
                  <Upload
                    className={cn(
                      "w-8 h-8 transition-colors",
                      isDragOver ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Drop files here or click to browse
                </h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Support for PDF, DOC, DOCX, XLS, XLSX, and image files (max 50MB)
                </p>
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                />
                <Button asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />
                    Select Files
                  </label>
                </Button>
              </div>
            </div>

            {/* File List with Metadata */}
            {files.length > 0 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    Files to Upload ({files.length})
                  </h2>
                  <Button onClick={handleUploadSingle} className="bg-primary hover:bg-primary/90">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload All
                  </Button>
                </div>

                {files.map((uploadedFile, index) => (
                  <div
                    key={uploadedFile.id}
                    className="bg-card rounded-xl border border-border p-6 animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <File className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{uploadedFile.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadedFile.status === "success" && (
                          <Badge className="bg-success/10 text-success">
                            <Check className="w-3 h-3 mr-1" />
                            Uploaded
                          </Badge>
                        )}
                        {uploadedFile.status === "error" && (
                          <Badge className="bg-destructive/10 text-destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        )}
                        {uploadedFile.status === "uploading" && (
                          <Badge className="bg-primary/10 text-primary">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Uploading
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(uploadedFile.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Metadata Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`title-${uploadedFile.id}`}>Title *</Label>
                        <Input
                          id={`title-${uploadedFile.id}`}
                          value={uploadedFile.metadata.title}
                          onChange={(e) =>
                            updateMetadata(uploadedFile.id, "title", e.target.value)
                          }
                          placeholder="Document title"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`author-${uploadedFile.id}`}>Author</Label>
                        <Input
                          id={`author-${uploadedFile.id}`}
                          value={uploadedFile.metadata.author}
                          onChange={(e) =>
                            updateMetadata(uploadedFile.id, "author", e.target.value)
                          }
                          placeholder="Document author"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`collection-${uploadedFile.id}`}>Collection *</Label>
                        <Select
                          value={uploadedFile.metadata.collection}
                          onValueChange={(value) =>
                            updateMetadata(uploadedFile.id, "collection", value)
                          }
                        >
                          <SelectTrigger>
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

                      <div className="space-y-2">
                        <Label htmlFor={`date-${uploadedFile.id}`}>Date Issued *</Label>
                        <Input
                          id={`date-${uploadedFile.id}`}
                          type="date"
                          value={uploadedFile.metadata.dateIssued}
                          onChange={(e) =>
                            updateMetadata(uploadedFile.id, "dateIssued", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tags</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add tag"
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTag(uploadedFile.id, newTag);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => addTag(uploadedFile.id, newTag)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {uploadedFile.metadata.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {uploadedFile.metadata.tags.map((tag, tagIndex) => (
                              <Badge
                                key={tagIndex}
                                variant="secondary"
                                className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeTag(uploadedFile.id, tagIndex)}
                              >
                                {tag}
                                <X className="w-3 h-3 ml-1" />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`description-${uploadedFile.id}`}>Description</Label>
                        <Textarea
                          id={`description-${uploadedFile.id}`}
                          value={uploadedFile.metadata.description}
                          onChange={(e) =>
                            updateMetadata(uploadedFile.id, "description", e.target.value)
                          }
                          placeholder="Brief description of the document..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Batch Import Tab */}
          <TabsContent value="batch" className="mt-6 space-y-6">
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

                  {/* CSV File */}
                  <div className="space-y-2">
                    <Label>CSV Metadata File (Optional)</Label>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex-1 border-2 border-dashed rounded-lg p-4 transition-colors",
                        batchState.csvFile ? "border-primary bg-primary/5" : "border-border"
                      )}>
                        {batchState.csvFile ? (
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-8 h-8 text-primary" />
                            <div>
                              <p className="font-medium">{batchState.csvFile.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(batchState.csvFile.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setBatchState(prev => ({ ...prev, csvFile: null }))}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 cursor-pointer">
                            <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
                            <span className="text-muted-foreground">Select CSV file with metadata</span>
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleCsvSelect}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ZIP File */}
                  <div className="space-y-2">
                    <Label>ZIP File with Documents *</Label>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex-1 border-2 border-dashed rounded-lg p-4 transition-colors",
                        batchState.zipFile ? "border-primary bg-primary/5" : "border-border"
                      )}>
                        {batchState.zipFile ? (
                          <div className="flex items-center gap-3">
                            <Archive className="w-8 h-8 text-primary" />
                            <div>
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
                  </div>

                  {/* CSV Format Info */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-2">CSV Format</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your CSV file should contain the following columns:
                    </p>
                    <code className="text-xs bg-background p-2 rounded block overflow-x-auto">
                      filename,dc.title,dc.contributor.author,dc.date.issued,dc.description.abstract,dc.subject
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      The filename column should match the file names inside your ZIP archive.
                    </p>
                  </div>

                  <Button
                    onClick={handleBatchImport}
                    disabled={!batchState.zipFile || !batchState.collection}
                    className="mt-4"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Start Batch Import
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

                  <div className="flex gap-2">
                    <Button onClick={resetBatchImport}>
                      Start New Import
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
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
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Import;
