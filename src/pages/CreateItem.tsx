import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, FileText, Plus, Trash } from "lucide-react";
import { fetchCollections, Collection } from "@/api/collectionApi";
import axiosInstance from "@/api/axiosInstance";

interface DynamicFormField {
  input: { type: string };
  label: string;
  mandatory: boolean;
  repeatable: boolean;
  hints?: string;
  mandatoryMessage?: string;
  selectableMetadata: Array<{ metadata: string; label?: string | null; closed?: boolean }>;
}

interface FormRow {
  fields: DynamicFormField[];
}

interface FormSection {
  id: string;
  header: string;
  sectionType: string;
  configUrl?: string;
  rows?: FormRow[];
}

interface FileToUpload {
  file: File;
  id: string;
}

const CreateItem = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState(searchParams.get("collection") || "");

  // Workspace item state
  const [workspaceItemId, setWorkspaceItemId] = useState<string | null>(null);
  const [formSections, setFormSections] = useState<FormSection[]>([]);

  // Dynamic form data: { "dc.title": "value", "dc.contributor.author_list": ["val1","val2"] }
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Files
  const [files, setFiles] = useState<FileToUpload[]>([]);

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      initializeWorkspaceItem(selectedCollection);
    }
  }, [selectedCollection]);

  const loadCollections = async () => {
    try {
      const response = await fetchCollections(0, 200);
      setCollections(response.collections);
    } catch {
      toast({ title: "Error", description: "Failed to load collections", variant: "destructive" });
    }
  };

  const initializeWorkspaceItem = async (collectionId: string) => {
    setFormLoading(true);
    try {
      // Step 1: Create workspace item
      const wsResponse = await axiosInstance.post(
        `/api/submission/workspaceitems?embed=item,sections,collection&owningCollection=${collectionId}`,
        {}
      );
      const wsId = wsResponse.data.id;
      setWorkspaceItemId(String(wsId));

      // Step 2: Extract submission definition sections
      const submissionDef = wsResponse.data._embedded?.submissionDefinition;
      const sections: FormSection[] = [];

      if (submissionDef?._embedded?.sections?._embedded?.sections) {
        for (const section of submissionDef._embedded.sections._embedded.sections) {
          const s: FormSection = {
            id: section.id,
            header: section.header || section.id,
            sectionType: section.sectionType,
          };

          // Step 3: If section is submission-form, fetch its config
          if (section.sectionType === "submission-form" && section._links?.config?.href) {
            try {
              const configUrl = section._links.config.href;
              // Extract path from absolute URL
              const url = new URL(configUrl);
              const configResponse = await axiosInstance.get(url.pathname);
              s.rows = configResponse.data.rows || [];
            } catch (e) {
              console.error("Failed to fetch form config for section", section.id, e);
            }
          }

          sections.push(s);
        }
      }

      setFormSections(sections);
    } catch (error) {
      console.error("Failed to initialize workspace item:", error);
      toast({ title: "Error", description: "Failed to initialize submission form", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleFieldChange = (metadataKey: string, value: string, repeatable: boolean) => {
    if (repeatable) {
      setFormData((prev) => ({ ...prev, [metadataKey]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [metadataKey]: value }));
    }
  };

  const handleAddRepeatableField = (metadataKey: string) => {
    const currentValue = formData[metadataKey]?.trim();
    if (!currentValue) return;

    const listKey = `${metadataKey}_list`;
    const currentList = formData[listKey] || [];
    setFormData((prev) => ({
      ...prev,
      [listKey]: [...currentList, currentValue],
      [metadataKey]: "",
    }));
  };

  const handleRemoveRepeatableField = (metadataKey: string, index: number) => {
    const listKey = `${metadataKey}_list`;
    setFormData((prev) => ({
      ...prev,
      [listKey]: (prev[listKey] || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (Math.round((bytes / Math.pow(k, i)) * 100) / 100) + " " + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceItemId) {
      toast({ title: "Error", description: "Workspace item not initialized", variant: "destructive" });
      return;
    }

    // Validate mandatory fields
    for (const section of formSections) {
      if (section.rows) {
        for (const row of section.rows) {
          for (const field of row.fields) {
            if (field.mandatory) {
              const key = field.selectableMetadata[0]?.metadata;
              const value = formData[key];
              const listKey = `${key}_list`;
              const listValue = formData[listKey];

              if (!value && (!listValue || listValue.length === 0)) {
                toast({
                  title: "Validation Error",
                  description: field.mandatoryMessage || `${field.label} is required`,
                  variant: "destructive",
                });
                return;
              }
            }
          }
        }
      }
    }

    setLoading(true);

    try {
      // Step 1: Build patch operations for metadata
      const operations: any[] = [];
      const sectionId = formSections.find((s) => s.sectionType === "submission-form")?.id || "traditionalpageone";

      for (const section of formSections) {
        if (!section.rows) continue;
        for (const row of section.rows) {
          for (const field of row.fields) {
            const key = field.selectableMetadata[0]?.metadata;
            if (!key) continue;

            let values: string[] = [];
            if (field.repeatable) {
              const listKey = `${key}_list`;
              values = formData[listKey] || [];
              // Also include current text if any
              if (formData[key]?.trim()) {
                values = [...values, formData[key].trim()];
              }
            } else if (formData[key]) {
              values = [formData[key]];
            }

            if (values.length > 0) {
              operations.push({
                op: "add",
                path: `/sections/${sectionId}/${key}`,
                value: values.map((v, idx) => ({
                  value: v,
                  language: null,
                  authority: null,
                  display: v,
                  confidence: -1,
                  place: idx,
                  otherInformation: null,
                })),
              });
            }
          }
        }
      }

      // Submit metadata
      if (operations.length > 0) {
        await axiosInstance.patch(
          `/api/submission/workspaceitems/${workspaceItemId}?embed=item`,
          operations
        );
      }

      // Step 2: Grant license
      await axiosInstance.patch(
        `/api/submission/workspaceitems/${workspaceItemId}`,
        [{ op: "add", path: "/sections/license/granted", value: "true" }]
      );

      // Step 3: Upload files
      for (const fileToUpload of files) {
        const formDataObj = new FormData();
        formDataObj.append("file", fileToUpload.file);
        await axiosInstance.post(
          `/api/submission/workspaceitems/${workspaceItemId}`,
          formDataObj,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      // Step 4: Submit to workflow
      await axiosInstance.post(
        "/api/workflow/workflowitems?embed=item,sections,collection",
        `/server/api/submission/workspaceitems/${workspaceItemId}`,
        { headers: { "Content-Type": "text/uri-list" } }
      );

      toast({
        title: "Success!",
        description: `Item and ${files.length} file(s) submitted successfully!`,
      });
      navigate("/search");
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to submit item", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: DynamicFormField) => {
    const key = field.selectableMetadata[0]?.metadata;
    if (!key) return null;
    const inputType = field.input?.type || "onebox";

    switch (inputType) {
      case "date":
        return (
          <div className="space-y-2" key={key}>
            <Label>
              {field.label} {field.mandatory && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type="date"
              value={formData[key] || ""}
              onChange={(e) => handleFieldChange(key, e.target.value, false)}
              required={field.mandatory}
            />
            {field.hints && <p className="text-xs text-muted-foreground">{field.hints}</p>}
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-2" key={key}>
            <Label>
              {field.label} {field.mandatory && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              rows={4}
              value={formData[key] || ""}
              onChange={(e) => handleFieldChange(key, e.target.value, false)}
              placeholder={field.hints || `Enter ${field.label.toLowerCase()}`}
            />
            {field.hints && <p className="text-xs text-muted-foreground">{field.hints}</p>}
          </div>
        );

      case "dropdown":
        return (
          <div className="space-y-2" key={key}>
            <Label>
              {field.label} {field.mandatory && <span className="text-destructive">*</span>}
            </Label>
            <Select value={formData[key] || ""} onValueChange={(v) => handleFieldChange(key, v, false)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Article">Article</SelectItem>
                <SelectItem value="Thesis">Thesis</SelectItem>
                <SelectItem value="Report">Report</SelectItem>
                <SelectItem value="Book">Book</SelectItem>
                <SelectItem value="Conference Paper">Conference Paper</SelectItem>
              </SelectContent>
            </Select>
            {field.hints && <p className="text-xs text-muted-foreground">{field.hints}</p>}
          </div>
        );

      case "onebox":
      case "series":
      default:
        if (field.repeatable) {
          const listKey = `${key}_list`;
          return (
            <div className="space-y-2" key={key}>
              <Label>
                {field.label} {field.mandatory && <span className="text-destructive">*</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={formData[key] || ""}
                  onChange={(e) => handleFieldChange(key, e.target.value, true)}
                  placeholder={field.hints || `Enter ${field.label.toLowerCase()}`}
                />
                <Button type="button" variant="secondary" onClick={() => handleAddRepeatableField(key)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {(formData[listKey] || []).map((val: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <span className="text-sm">{val}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveRepeatableField(key, idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {field.hints && <p className="text-xs text-muted-foreground">{field.hints}</p>}
            </div>
          );
        }
        return (
          <div className="space-y-2" key={key}>
            <Label>
              {field.label} {field.mandatory && <span className="text-destructive">*</span>}
            </Label>
            <Input
              value={formData[key] || ""}
              onChange={(e) => handleFieldChange(key, e.target.value, false)}
              placeholder={field.hints || `Enter ${field.label.toLowerCase()}`}
              required={field.mandatory}
            />
            {field.hints && <p className="text-xs text-muted-foreground">{field.hints}</p>}
          </div>
        );
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create New Item</h1>
          <p className="text-muted-foreground">Submit a new item to the repository</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Collection Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Collection</CardTitle>
              <CardDescription>Select the target collection for this submission</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="collection">Collection *</Label>
                <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                  <SelectTrigger id="collection">
                    <SelectValue placeholder="Select a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {formLoading && (
            <Card>
              <CardContent className="py-12 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                <span className="text-muted-foreground">Loading submission form...</span>
              </CardContent>
            </Card>
          )}

          {/* Dynamic Form Sections */}
          {formSections.map((section) => {
            if (section.sectionType === "submission-form" && section.rows) {
              return (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle>{section.header.replace("submit.progressbar.", "").replace(/^\w/, (c) => c.toUpperCase())}</CardTitle>
                    <CardDescription>Fill in the metadata fields below</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {section.rows.map((row, rowIdx) =>
                      row.fields.map((field) => renderField(field))
                    )}
                  </CardContent>
                </Card>
              );
            }

            if (section.sectionType === "upload") {
              return (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle>Upload Files</CardTitle>
                    <CardDescription>Upload PDF files to attach to this item</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        ☁️ Upload Files (PDF)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click or drag and drop multiple PDF files here
                      </p>
                      <Input
                        type="file"
                        multiple
                        accept="application/pdf,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map((fw) => (
                          <div key={fw.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">📄 {fw.file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatBytes(fw.file.size)}</p>
                              </div>
                            </div>
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeFile(fw.id)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }

            // License section - auto-accepted
            if (section.sectionType === "license") {
              return (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle>License Agreement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      By submitting this item, you agree to the repository license agreement. The license will be automatically accepted upon submission.
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return null;
          })}

          {/* Fallback: Static form if no dynamic sections loaded */}
          {!formLoading && formSections.length === 0 && selectedCollection && (
            <Card>
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
                <CardDescription>No submission form found. Using default fields.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData["dc.title"] || ""}
                    onChange={(e) => handleFieldChange("dc.title", e.target.value, false)}
                    placeholder="Enter item title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date Issued *</Label>
                  <Input
                    type="date"
                    value={formData["dc.date.issued"] || ""}
                    onChange={(e) => handleFieldChange("dc.date.issued", e.target.value, false)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Abstract</Label>
                  <Textarea
                    value={formData["dc.description.abstract"] || ""}
                    onChange={(e) => handleFieldChange("dc.description.abstract", e.target.value, false)}
                    rows={4}
                    placeholder="Enter abstract"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !selectedCollection} className="min-w-[150px]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Item"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateItem;
