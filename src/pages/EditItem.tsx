import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Pencil,
  Trash2,
  Save,
  X,
  Plus,
  Download,
  Upload,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  fetchItemWithBitstreams,
  updateItemMetadata,
  deleteItem,
  deleteBitstream,
  downloadBitstream,
  uploadBitstream,
  fetchItemBundles,
  fetchBundleBitstreams,
  Item,
  Bitstream,
  ItemMetadata,
} from "@/api/itemApi";
import { fetchMetadataFieldsBySchema, MetadataField } from "@/api/metadataApi";
import axiosInstance from "@/api/axiosInstance";

interface PatchOperation {
  op: "add" | "replace" | "remove";
  path: string;
  value?: any;
}

interface EditingField {
  key: string;
  index: number;
}

interface FileToUpload {
  file: File;
  id: string;
}

const EditItem = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Item data
  const [itemInfo, setItemInfo] = useState<Item | null>(null);
  const [originalItemInfo, setOriginalItemInfo] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemNotFound, setItemNotFound] = useState(false);

  // Editing state
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editedValue, setEditedValue] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<PatchOperation[]>([]);

  // Bitstreams
  const [originalBitstreams, setOriginalBitstreams] = useState<Bitstream[]>([]);
  const [thumbnailBitstreams, setThumbnailBitstreams] = useState<Bitstream[]>([]);
  const [pendingBitstreamDeletions, setPendingBitstreamDeletions] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<FileToUpload[]>([]);

  // Add metadata state
  const [showAddMetadata, setShowAddMetadata] = useState(false);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [newMetadataValue, setNewMetadataValue] = useState("");
  const [metadataPage, setMetadataPage] = useState(0);
  const [hasMoreMetadata, setHasMoreMetadata] = useState(true);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bitstreamToDelete, setBitstreamToDelete] = useState<Bitstream | null>(null);

  useEffect(() => {
    if (id) loadItem();
  }, [id]);

  const loadItem = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const item = await fetchItemWithBitstreams(id);
      if (!item) {
        setItemNotFound(true);
        return;
      }

      setItemInfo(item);
      setOriginalItemInfo(JSON.parse(JSON.stringify(item)));

      // Extract bitstreams from bundles
      const bundles = item.bundles || [];
      const origBundle = bundles.find((b) => b.name === "ORIGINAL");
      const thumbBundle = bundles.find((b) => b.name === "THUMBNAIL");
      setOriginalBitstreams(origBundle?.bitstreams || []);
      setThumbnailBitstreams(thumbBundle?.bitstreams || []);
    } catch (error) {
      console.error("Load item error:", error);
      toast({ title: "Error", description: "Failed to load item", variant: "destructive" });
      setItemNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // --- Metadata Editing ---
  const handleEditClick = (key: string, index: number, value: string) => {
    setEditingField({ key, index });
    setEditedValue(value);
  };

  const handleSaveClick = () => {
    if (!editingField || !itemInfo) return;

    const { key, index } = editingField;
    const originalValue = originalItemInfo?.metadata[key]?.[index]?.value;

    // Add to pending updates
    if (editedValue !== originalValue) {
      setPendingUpdates((prev) => {
        // Remove any existing op for this field/index
        const filtered = prev.filter(
          (op) => op.path !== `/metadata/${key}/${index}`
        );
        return [
          ...filtered,
          {
            op: "replace",
            path: `/metadata/${key}/${index}`,
            value: {
              value: editedValue,
              language: null,
              authority: null,
              confidence: -1,
            },
          },
        ];
      });
    }

    // Update local state immediately
    setItemInfo((prev) => {
      if (!prev) return prev;
      const newMetadata = { ...prev.metadata };
      if (newMetadata[key]) {
        newMetadata[key] = newMetadata[key].map((v, i) =>
          i === index ? { ...v, value: editedValue } : v
        );
      }
      return { ...prev, metadata: newMetadata };
    });

    setEditingField(null);
    setEditedValue("");
  };

  const handleCancelClick = () => {
    setEditingField(null);
    setEditedValue("");
  };

  const handleDeleteMetadata = (key: string, index: number) => {
    setPendingUpdates((prev) => [
      ...prev,
      { op: "remove", path: `/metadata/${key}/${index}` },
    ]);

    // Update local state
    setItemInfo((prev) => {
      if (!prev) return prev;
      const newMetadata = { ...prev.metadata };
      if (newMetadata[key]) {
        newMetadata[key] = newMetadata[key].filter((_, i) => i !== index);
        if (newMetadata[key].length === 0) {
          delete newMetadata[key];
        }
      }
      return { ...prev, metadata: newMetadata };
    });
  };

  // --- Add Metadata ---
  const loadMetadataFields = async (page: number = 0) => {
    try {
      const result = await fetchMetadataFieldsBySchema("dc", page, 50);
      if (page === 0) {
        setMetadataFields(result.fields);
      } else {
        setMetadataFields((prev) => [...prev, ...result.fields]);
      }
      setHasMoreMetadata(result.page.number < result.page.totalPages - 1);
      setMetadataPage(page);
    } catch (error) {
      console.error("Load metadata fields error:", error);
    }
  };

  const handleShowAddMetadata = () => {
    setShowAddMetadata(true);
    if (metadataFields.length === 0) {
      loadMetadataFields(0);
    }
  };

  const handleAddMetadata = () => {
    if (!selectedFieldId || !newMetadataValue.trim()) {
      toast({ title: "Error", description: "Select a field and enter a value", variant: "destructive" });
      return;
    }

    const field = metadataFields.find((f) => String(f.id) === selectedFieldId);
    if (!field) return;

    const prefix = field._embedded?.schema?.prefix || field.schema?.prefix || "dc";
    const fieldName = field.qualifier
      ? `${prefix}.${field.element}.${field.qualifier}`
      : `${prefix}.${field.element}`;

    // Add to pending
    setPendingUpdates((prev) => [
      ...prev,
      {
        op: "add",
        path: `/metadata/${fieldName}/-`,
        value: {
          value: newMetadataValue.trim(),
          language: null,
          authority: null,
          confidence: -1,
        },
      },
    ]);

    // Update local state
    setItemInfo((prev) => {
      if (!prev) return prev;
      const newMetadata = { ...prev.metadata };
      if (!newMetadata[fieldName]) {
        newMetadata[fieldName] = [];
      }
      newMetadata[fieldName] = [
        ...newMetadata[fieldName],
        { value: newMetadataValue.trim() },
      ];
      return { ...prev, metadata: newMetadata };
    });

    setNewMetadataValue("");
    setSelectedFieldId("");
  };

  // --- Save / Discard All ---
  const handleSaveAll = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Apply metadata patch operations
      if (pendingUpdates.length > 0) {
        await axiosInstance.patch(`/api/core/items/${id}`, pendingUpdates);
      }

      // Delete bitstreams
      for (const bsId of pendingBitstreamDeletions) {
        await deleteBitstream(bsId);
      }

      // Upload new files
      for (const fw of newFiles) {
        await uploadBitstream(id, fw.file);
      }

      toast({ title: "Success", description: "Item updated successfully!" });
      setPendingUpdates([]);
      setPendingBitstreamDeletions([]);
      setNewFiles([]);

      // Reload
      await loadItem();
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardAll = () => {
    setPendingUpdates([]);
    setPendingBitstreamDeletions([]);
    setNewFiles([]);
    if (originalItemInfo) {
      setItemInfo(JSON.parse(JSON.stringify(originalItemInfo)));
    }
    toast({ title: "Info", description: "All pending changes discarded" });
  };

  // --- Bitstream Management ---
  const handleDownloadBitstream = async (bitstreamId: string, fileName: string) => {
    try {
      await downloadBitstream(bitstreamId, fileName);
    } catch {
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
    }
  };

  const handleDeleteBitstreamClick = (bitstream: Bitstream) => {
    setBitstreamToDelete(bitstream);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteBitstream = () => {
    if (bitstreamToDelete) {
      setPendingBitstreamDeletions((prev) => [...prev, bitstreamToDelete.id]);
      setOriginalBitstreams((prev) => prev.filter((b) => b.id !== bitstreamToDelete.id));
      toast({ title: "Queued", description: "Bitstream deletion queued. Click Save to confirm." });
    }
    setDeleteDialogOpen(false);
    setBitstreamToDelete(null);
  };

  const handleNewFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
      }));
      setNewFiles((prev) => [...prev, ...files]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (Math.round((bytes / Math.pow(k, i)) * 100) / 100) + " " + sizes[i];
  };

  const hasChanges = pendingUpdates.length > 0 || pendingBitstreamDeletions.length > 0 || newFiles.length > 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="container max-w-5xl py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (itemNotFound) {
    return (
      <AppLayout>
        <div className="container max-w-5xl py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Item not found or you don't have permission to edit it.</AlertDescription>
          </Alert>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-5xl py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Edit Item: <span className="text-primary">{itemInfo?.name}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {pendingUpdates.length + pendingBitstreamDeletions.length + newFiles.length} pending change(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={handleSaveAll}
              disabled={!hasChanges || saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardAll}
              disabled={!hasChanges}
            >
              Discard
            </Button>
            <Button variant="secondary" onClick={handleShowAddMetadata}>
              <Plus className="h-4 w-4 mr-1" />
              Add Metadata
            </Button>
          </div>
        </div>

        {/* Metadata Table */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%] font-bold">Field</TableHead>
                    <TableHead className="w-[50%] font-bold">Values</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemInfo?.metadata &&
                    Object.entries(itemInfo.metadata).map(([key, values]) => (
                      <TableRow key={key}>
                        <TableCell>
                          <span className="font-semibold text-sm">{key}</span>
                        </TableCell>
                        <TableCell>
                          {values.map((metadataValue, index) => (
                            <div key={index} className="mb-1">
                              {editingField?.key === key && editingField?.index === index ? (
                                <Input
                                  value={editedValue}
                                  onChange={(e) => setEditedValue(e.target.value)}
                                  autoFocus
                                  className="h-8"
                                />
                              ) : (
                                <span className="text-sm">{metadataValue.value}</span>
                              )}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-right">
                          {values.map((metadataValue, index) => (
                            <div key={index} className="mb-1 flex items-center justify-end gap-1">
                              {editingField?.key === key && editingField?.index === index ? (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveClick}>
                                    <Save className="h-4 w-4 text-primary" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelClick}>
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(key, index, metadataValue.value)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteMetadata(key, index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}

                  {/* Add Metadata Row */}
                  {showAddMetadata && (
                    <TableRow className="bg-muted/30">
                      <TableCell>
                        <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select metadata field" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {metadataFields.map((field) => {
                              const prefix = field._embedded?.schema?.prefix || field.schema?.prefix || "dc";
                              const name = field.qualifier
                                ? `${prefix}.${field.element}.${field.qualifier}`
                                : `${prefix}.${field.element}`;
                              return (
                                <SelectItem key={field.id} value={String(field.id)}>
                                  {name}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Enter value"
                          value={newMetadataValue}
                          onChange={(e) => setNewMetadataValue(e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={handleAddMetadata}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bitstream Management */}
        <Card>
          <CardHeader>
            <CardTitle>Files / Bitstreams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Name</TableHead>
                    <TableHead className="font-bold">Size</TableHead>
                    <TableHead className="font-bold">Format</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* ORIGINAL Bundle Header */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3}>
                      <span className="font-bold text-sm">BUNDLE: ORIGINAL</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Label htmlFor="add-bitstream" className="cursor-pointer">
                        <Button variant="ghost" size="sm" asChild>
                          <span>
                            <Plus className="h-4 w-4 mr-1" />
                            Add File
                          </span>
                        </Button>
                      </Label>
                      <Input
                        type="file"
                        multiple
                        accept="application/pdf,.pdf,.doc,.docx"
                        onChange={handleNewFileSelect}
                        className="hidden"
                        id="add-bitstream"
                      />
                    </TableCell>
                  </TableRow>

                  {originalBitstreams.map((bs) => (
                    <TableRow key={bs.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{bs.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBytes(bs.sizeBytes)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {bs.format || bs.mimeType || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadBitstream(bs.id, bs.name)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteBitstreamClick(bs)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {originalBitstreams.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-4">
                        No files in ORIGINAL bundle
                      </TableCell>
                    </TableRow>
                  )}

                  {/* THUMBNAIL Bundle */}
                  {thumbnailBitstreams.length > 0 && (
                    <>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={4}>
                          <span className="font-bold text-sm">BUNDLE: THUMBNAIL</span>
                        </TableCell>
                      </TableRow>
                      {thumbnailBitstreams.map((bs) => (
                        <TableRow key={bs.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{bs.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatBytes(bs.sizeBytes)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {bs.format || "Image"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadBitstream(bs.id, bs.name)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}

                  {/* New files to upload */}
                  {newFiles.length > 0 && (
                    <>
                      <TableRow className="bg-primary/5">
                        <TableCell colSpan={4}>
                          <span className="font-bold text-sm text-primary">NEW FILES TO UPLOAD</span>
                        </TableCell>
                      </TableRow>
                      {newFiles.map((fw) => (
                        <TableRow key={fw.id} className="bg-primary/5">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">{fw.file.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatBytes(fw.file.size)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fw.file.type || "Unknown"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setNewFiles((prev) => prev.filter((f) => f.id !== fw.id))}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Bitstream Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Bitstream</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>"{bitstreamToDelete?.name}"</strong>? This action will be applied when you save.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteBitstream}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default EditItem;
