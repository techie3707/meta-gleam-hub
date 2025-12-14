import { useState, useCallback } from "react";
import { Upload, File, X, Check, AlertCircle, Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  metadata: {
    title: string;
    description: string;
    collection: string;
    tags: string[];
    author: string;
  };
}

const Import = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [newTag, setNewTag] = useState("");
  const { toast } = useToast();

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

  const handleUpload = () => {
    toast({
      title: "Upload Started",
      description: `Uploading ${files.length} document(s) to the repository...`,
    });
    // Simulate upload
    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: "success" as const, progress: 100 }))
    );
    setTimeout(() => {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${files.length} document(s).`,
      });
    }, 1500);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Documents</h1>
          <p className="text-muted-foreground mt-1">
            Upload documents with metadata for better organization and searchability
          </p>
        </div>

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
              Support for PDF, DOC, DOCX, XLS, XLSX, and image files
            </p>
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
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
              <Button onClick={handleUpload} className="bg-primary hover:bg-primary/90">
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
                    <Label htmlFor={`title-${uploadedFile.id}`}>Title</Label>
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
                    <Label htmlFor={`collection-${uploadedFile.id}`}>Collection</Label>
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
                        <SelectItem value="financial">Financial Reports</SelectItem>
                        <SelectItem value="technical">Technical Docs</SelectItem>
                        <SelectItem value="hr">HR Documents</SelectItem>
                        <SelectItem value="media">Media Library</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
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
      </div>
    </AppLayout>
  );
};

export default Import;
