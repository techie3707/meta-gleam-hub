import { useState, useEffect, useCallback } from "react";
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
import {
  createWorkspaceItemWithDefinition,
  fetchSubmissionFormConfig,
  updateWorkspaceItemMetadata,
  grantLicense,
  uploadToWorkspaceItem,
  submitToWorkflow,
  deleteWorkspaceItem,
} from "@/api/workspaceItemApi";
import type {
  SubmissionSection,
  SubmissionFormConfig,
  DynamicFormField,
  ParsedFormSection,
} from "@/types/submission";

interface FileToUpload {
  file: File;
  id: string;
}

const CreateItem = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Collections
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState(
    searchParams.get("collection") || ""
  );

  // Workspace state
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();

  // Dynamic form state
  const [parsedSections, setParsedSections] = useState<ParsedFormSection[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Files
  const [files, setFiles] = useState<FileToUpload[]>([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection && !workspaceId) {
      initializeForm(selectedCollection);
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

  /**
   * Form Generation Flow (per API docs):
   * Step 1: POST workspace item → get submission definition
   * Step 2: Extract submission-form sections
   * Step 3: Fetch form configs in parallel
   * Step 4: Render dynamic fields
   */
  const initializeForm = async (collectionId: string) => {
    setIsLoadingForms(true);
    setFormData({});
    setParsedSections([]);
    setWorkspaceId(undefined);

    try {
      // Step 1: Create workspace item and get submission definition
      console.log("Step 1: Creating workspace item for collection:", collectionId);
      const workspaceData = await createWorkspaceItemWithDefinition(collectionId);

      if (!workspaceData || !workspaceData.id) {
        console.error("Workspace ID is undefined.");
        toast({ title: "Error", description: "Failed to create workspace item", variant: "destructive" });
        return;
      }

      const wsId = workspaceData.id.toString();
      setWorkspaceId(wsId);
      console.log("Workspace created with ID:", wsId);

      // Step 2: Extract submission-form sections from the embedded definition
      const allSections: SubmissionSection[] =
        workspaceData._embedded?.submissionDefinition
          ?._embedded?.sections?._embedded?.sections || [];

      console.log("All sections found:", allSections.length);

      // Separate submission-form sections from upload/license
      const formSections = allSections.filter(
        (s) => s.sectionType === "submission-form" && s._links?.config?.href
      );
      const uploadSection = allSections.find((s) => s.sectionType === "upload");
      const licenseSection = allSections.find((s) => s.sectionType === "license");

      console.log("Form sections:", formSections.length);

      // Step 3: Fetch form configurations in parallel
      console.log("Step 3: Fetching form configurations...");
      const formConfigPromises = formSections.map((section) =>
        fetchSubmissionFormConfig(section._links.config!.href)
      );
      const configs = await Promise.all(formConfigPromises);
      console.log("Form configs loaded:", configs.length);

      // Build parsed sections for rendering
      const sections: ParsedFormSection[] = [];

      formSections.forEach((section, index) => {
        sections.push({
          id: section.id,
          header: section.header || section.id,
          sectionType: section.sectionType,
          mandatory: section.mandatory,
          configUrl: section._links.config?.href,
          formConfig: configs[index],
        });
      });

      // Add upload section
      if (uploadSection) {
        sections.push({
          id: uploadSection.id,
          header: uploadSection.header || "Upload",
          sectionType: "upload",
          mandatory: uploadSection.mandatory,
        });
      }

      // Add license section
      if (licenseSection) {
        sections.push({
          id: licenseSection.id,
          header: licenseSection.header || "License",
          sectionType: "license",
          mandatory: licenseSection.mandatory,
        });
      }

      setParsedSections(sections);

      // Set first form section as current
      if (formSections.length > 0) {
        setCurrentSectionId(formSections[0].id);
      }

      console.log("Form initialization complete!");
    } catch (error) {
      console.error("Error initializing form:", error);
      toast({ title: "Error", description: "Failed to load form configuration", variant: "destructive" });
    } finally {
      setIsLoadingForms(false);
    }
  };

  // --- Field change handlers ---

  const handleFieldChange = (metadataKey: string, value: string) => {
    setFormData((prev) => ({ ...prev, [metadataKey]: value }));
  };

  const handleAddRepeatableField = (metadataKey: string) => {
    const currentValue = formData[metadataKey]?.trim();
    if (!currentValue) return;

    const listKey = `${metadataKey}_list`;
    const existing = formData[listKey] || [];
    setFormData((prev) => ({
      ...prev,
      [listKey]: [...existing, currentValue],
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

  // --- File handlers ---

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

  // --- Collection change ---

  const handleCollectionChange = (collectionId: string) => {
    // If changing collection, clean up old workspace item
    if (workspaceId) {
      deleteWorkspaceItem(workspaceId).catch(() => {});
    }
    setWorkspaceId(undefined);
    setSelectedCollection(collectionId);
  };

  // --- Submission ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      toast({ title: "Error", description: "Workspace item not initialized", variant: "destructive" });
      return;
    }

    // Validate mandatory fields
    for (const section of parsedSections) {
      if (section.formConfig?.rows) {
        for (const row of section.formConfig.rows) {
          for (const field of row.fields) {
            if (field.mandatory) {
              const key = field.selectableMetadata[0]?.metadata;
              if (!key) continue;
              const value = formData[key];
              const listValue = formData[`${key}_list`];
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
      // Step 1: Build PATCH operations for each submission-form section
      for (const section of parsedSections) {
        if (section.sectionType !== "submission-form" || !section.formConfig) continue;

        const operations: Array<{ op: string; path: string; value?: any }> = [];

        for (const row of section.formConfig.rows) {
          for (const field of row.fields) {
            const key = field.selectableMetadata[0]?.metadata;
            if (!key) continue;

            let values: string[] = [];
            if (field.repeatable) {
              const listKey = `${key}_list`;
              values = [...(formData[listKey] || [])];
              if (formData[key]?.trim()) {
                values.push(formData[key].trim());
              }
            } else if (formData[key]) {
              values = [formData[key]];
            }

            if (values.length > 0) {
              operations.push({
                op: "add",
                path: `/sections/${section.id}/${key}`,
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

        if (operations.length > 0) {
          console.log("Patching metadata for section:", section.id, operations);
          await updateWorkspaceItemMetadata(workspaceId, operations);
        }
      }

      // Step 2: Grant license
      console.log("Granting license...");
      await grantLicense(workspaceId);

      // Step 3: Upload files
      for (const fileWrapper of files) {
        console.log("Uploading file:", fileWrapper.file.name);
        await uploadToWorkspaceItem(workspaceId, fileWrapper.file);
      }

      // Step 4: Submit to workflow
      console.log("Submitting to workflow...");
      await submitToWorkflow(workspaceId);

      toast({
        title: "Success!",
        description: `Item and ${files.length} file(s) submitted successfully!`,
      });
      navigate("/search");
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to submit item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Dynamic field renderer ---

  const renderField = (field: DynamicFormField, sectionId: string, rowIndex: number, fieldIndex: number) => {
    const metadata = field.selectableMetadata[0]?.metadata;
    if (!metadata) return null;
    const fieldKey = `${sectionId}_${metadata}_${rowIndex}_${fieldIndex}`;
    const inputType = field.input?.type || "onebox";

    switch (inputType) {
      case "date":
        // Use full date format for dc.date.created, year-only for others
        const isCreatedDate = metadata === "dc.date.created";
        return (
          <div className="space-y-2" key={fieldKey}>
            <Label>
              {field.label} {field.mandatory && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type={isCreatedDate ? "date" : "number"}
              min={isCreatedDate ? undefined : "1900"}
              max={isCreatedDate ? undefined : "2100"}
              step={isCreatedDate ? undefined : "1"}
              value={formData[metadata] || ""}
              onChange={(e) => handleFieldChange(metadata, e.target.value)}
              placeholder={isCreatedDate ? "YYYY-MM-DD" : "YYYY"}
              required={field.mandatory}
            />
            {field.hints && <p className="text-xs text-muted-foreground">{field.hints}</p>}
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-2" key={fieldKey}>
            <Label>
              {field.label} {field.mandatory && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              rows={4}
              value={formData[metadata] || ""}
              onChange={(e) => handleFieldChange(metadata, e.target.value)}
              placeholder={field.hints || `Enter ${field.label.toLowerCase()}`}
            />
            {field.hints && <p className="text-xs text-muted-foreground">{field.hints}</p>}
          </div>
        );

      case "dropdown":
        return (
          <div className="space-y-2" key={fieldKey}>
            <Label>
              {field.label} {field.mandatory && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={formData[metadata] || ""}
              onValueChange={(v) => handleFieldChange(metadata, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Article">Article</SelectItem>
                <SelectItem value="Thesis">Thesis</SelectItem>
                <SelectItem value="Report">Report</SelectItem>
                <SelectItem value="Book">Book</SelectItem>
                <SelectItem value="Book chapter">Book chapter</SelectItem>
                <SelectItem value="Conference Paper">Conference Paper</SelectItem>
                <SelectItem value="Technical Report">Technical Report</SelectItem>
                <SelectItem value="Working Paper">Working Paper</SelectItem>
                <SelectItem value="Preprint">Preprint</SelectItem>
                <SelectItem value="Dataset">Dataset</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {field.hints && <p className="text-xs text-muted-foreground">{field.hints}</p>}
          </div>
        );

      case "onebox":
      case "series":
      default:
        if (field.repeatable) {
          const listKey = `${metadata}_list`;
          return (
            <div className="space-y-2" key={fieldKey}>
              <Label>
                {field.label} {field.mandatory && <span className="text-destructive">*</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={formData[metadata] || ""}
                  onChange={(e) => handleFieldChange(metadata, e.target.value)}
                  placeholder={field.hints || `Enter ${field.label.toLowerCase()}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddRepeatableField(metadata);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleAddRepeatableField(metadata)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {(formData[listKey] || []).map((val: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <span className="text-sm">{val}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRepeatableField(metadata, idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {field.hints && <p className="text-xs text-muted-foreground">{field.hints}</p>}
            </div>
          );
        }
        return (
          <div className="space-y-2" key={fieldKey}>
            <Label>
              {field.label} {field.mandatory && <span className="text-destructive">*</span>}
            </Label>
            <Input
              value={formData[metadata] || ""}
              onChange={(e) => handleFieldChange(metadata, e.target.value)}
              placeholder={field.hints || `Enter ${field.label.toLowerCase()}`}
              required={field.mandatory}
            />
            {field.hints && <p className="text-xs text-muted-foreground">{field.hints}</p>}
          </div>
        );
    }
  };

  // --- Section header formatter ---
  const formatSectionHeader = (header: string) => {
    return header
      .replace("submit.progressbar.", "")
      .replace("describe.", "")
      .replace(/\./g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
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
                <Select value={selectedCollection} onValueChange={handleCollectionChange}>
                  <SelectTrigger id="collection">
                    <SelectValue placeholder="Select a collection" />
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
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoadingForms && (
            <Card>
              <CardContent className="py-12 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                <span className="text-muted-foreground">Loading submission form...</span>
              </CardContent>
            </Card>
          )}

          {/* Dynamic Form Sections */}
          {parsedSections.map((section) => {
            // Render submission-form sections with dynamic fields
            if (section.sectionType === "submission-form" && section.formConfig) {
              return (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle>{formatSectionHeader(section.header)}</CardTitle>
                    <CardDescription>Fill in the metadata fields below</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {section.formConfig.rows.map((row, rowIdx) =>
                      row.fields.map((field, fieldIdx) =>
                        renderField(field, section.id, rowIdx, fieldIdx)
                      )
                    )}
                  </CardContent>
                </Card>
              );
            }

            // Upload section
            if (section.sectionType === "upload") {
              return (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle>Upload Files</CardTitle>
                    <CardDescription>Attach files to this submission</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Click to upload files
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOC, DOCX and other document types supported
                      </p>
                      <Input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map((fw) => (
                          <div
                            key={fw.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{fw.file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatBytes(fw.file.size)}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeFile(fw.id)}
                            >
                              <Trash className="h-4 w-4 mr-1" />
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

            // License section
            if (section.sectionType === "license") {
              return (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle>License Agreement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      By submitting this item, you agree to the repository license agreement.
                      The license will be automatically accepted upon submission.
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return null;
          })}

          {/* Fallback: Static form when no dynamic sections */}
          {!isLoadingForms && parsedSections.length === 0 && selectedCollection && (
            <Card>
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
                <CardDescription>
                  No submission form found for this collection. Using default fields.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData["dc.title"] || ""}
                    onChange={(e) => handleFieldChange("dc.title", e.target.value)}
                    placeholder="Enter item title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date Issued (Year) *</Label>
                  <Input
                    type="number"
                    min="1900"
                    max="2100"
                    step="1"
                    value={formData["dc.date.issued"] || ""}
                    onChange={(e) => handleFieldChange("dc.date.issued", e.target.value)}
                    placeholder="YYYY"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Abstract</Label>
                  <Textarea
                    value={formData["dc.description.abstract"] || ""}
                    onChange={(e) => handleFieldChange("dc.description.abstract", e.target.value)}
                    rows={4}
                    placeholder="Enter abstract"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Actions */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading || !selectedCollection || isLoadingForms}
              className="min-w-[150px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Item"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateItem;
