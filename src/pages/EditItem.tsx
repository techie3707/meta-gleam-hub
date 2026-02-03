import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Loader2, Upload, X, FileText, Plus, Trash2, AlertCircle } from "lucide-react";
import { 
  fetchItemWithBitstreams, 
  updateItem, 
  uploadBitstream,
  deleteBitstream,
  getMetadataValue,
  getMetadataValues,
  Bitstream,
} from "@/api/itemApi";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MetadataField {
  id: string;
  value: string;
}

interface FileToUpload {
  file: File;
  id: string;
}

const EditItem = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemNotFound, setItemNotFound] = useState(false);
  
  // Metadata fields
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState<MetadataField[]>([{ id: "1", value: "" }]);
  const [dateIssued, setDateIssued] = useState("");
  const [abstract, setAbstract] = useState("");
  const [subjects, setSubjects] = useState<MetadataField[]>([{ id: "1", value: "" }]);
  const [publisher, setPublisher] = useState("");
  const [type, setType] = useState("");
  const [language, setLanguage] = useState("en");
  
  // Files
  const [existingFiles, setExistingFiles] = useState<Bitstream[]>([]);
  const [newFiles, setNewFiles] = useState<FileToUpload[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const item = await fetchItemWithBitstreams(id);

      if (!item) {
        setItemNotFound(true);
        return;
      }

      // Load title
      setTitle(getMetadataValue(item.metadata, "dc.title") || "");

      // Load authors
      const authorValues = getMetadataValues(item.metadata, "dc.contributor.author");
      if (authorValues.length > 0) {
        setAuthors(authorValues.map((value, index) => ({
          id: `author-${index}`,
          value,
        })));
      }

      // Load date
      setDateIssued(getMetadataValue(item.metadata, "dc.date.issued") || "");

      // Load abstract
      setAbstract(getMetadataValue(item.metadata, "dc.description.abstract") || "");

      // Load subjects
      const subjectValues = getMetadataValues(item.metadata, "dc.subject");
      if (subjectValues.length > 0) {
        setSubjects(subjectValues.map((value, index) => ({
          id: `subject-${index}`,
          value,
        })));
      }

      // Load publisher
      setPublisher(getMetadataValue(item.metadata, "dc.publisher") || "");

      // Load type
      setType(getMetadataValue(item.metadata, "dc.type") || "");

      // Load language
      setLanguage(getMetadataValue(item.metadata, "dc.language") || "en");

      // Load existing files
      const bundles = item.bundles || [];
      const originalBundle = bundles.find(b => b.name === "ORIGINAL");
      if (originalBundle && originalBundle.bitstreams) {
        setExistingFiles(originalBundle.bitstreams);
      }
    } catch (error: any) {
      console.error("Error loading item:", error);
      toast({
        title: "Error",
        description: "Failed to load item",
        variant: "destructive",
      });
      setItemNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleNewFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
      }));
      setNewFiles(prev => [...prev, ...files]);
    }
  };

  const removeNewFile = (id: string) => {
    setNewFiles(prev => prev.filter(f => f.id !== id));
  };

  const markFileForDeletion = (bitstreamId: string) => {
    setFilesToDelete(prev => [...prev, bitstreamId]);
  };

  const unmarkFileForDeletion = (bitstreamId: string) => {
    setFilesToDelete(prev => prev.filter(id => id !== bitstreamId));
  };

  const addAuthor = () => {
    setAuthors(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), value: "" }]);
  };

  const removeAuthor = (id: string) => {
    if (authors.length > 1) {
      setAuthors(prev => prev.filter(a => a.id !== id));
    }
  };

  const updateAuthor = (id: string, value: string) => {
    setAuthors(prev => prev.map(a => a.id === id ? { ...a, value } : a));
  };

  const addSubject = () => {
    setSubjects(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), value: "" }]);
  };

  const removeSubject = (id: string) => {
    if (subjects.length > 1) {
      setSubjects(prev => prev.filter(s => s.id !== id));
    }
  };

  const updateSubject = (id: string, value: string) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, value } : s));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    // Validation
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!dateIssued) {
      toast({
        title: "Validation Error",
        description: "Date Issued is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Prepare metadata
      const metadata: Record<string, Array<{ value: string; language?: string }>> = {
        "dc.title": [{ value: title, language: "en" }],
        "dc.date.issued": [{ value: dateIssued }],
      };

      // Add authors
      const validAuthors = authors.filter(a => a.value.trim());
      if (validAuthors.length > 0) {
        metadata["dc.contributor.author"] = validAuthors.map(a => ({ value: a.value }));
      }

      // Add abstract
      if (abstract.trim()) {
        metadata["dc.description.abstract"] = [{ value: abstract, language: "en" }];
      }

      // Add subjects
      const validSubjects = subjects.filter(s => s.value.trim());
      if (validSubjects.length > 0) {
        metadata["dc.subject"] = validSubjects.map(s => ({ value: s.value, language: "en" }));
      }

      // Add publisher
      if (publisher.trim()) {
        metadata["dc.publisher"] = [{ value: publisher, language: "en" }];
      }

      // Add type
      if (type.trim()) {
        metadata["dc.type"] = [{ value: type, language: "en" }];
      }

      // Add language
      metadata["dc.language"] = [{ value: language }];

      // Update item metadata
      await updateItem(id, metadata);

      // Delete marked files
      for (const bitstreamId of filesToDelete) {
        await deleteBitstream(bitstreamId);
      }

      // Upload new files
      for (const fileToUpload of newFiles) {
        await uploadBitstream(id, fileToUpload.file);
      }

      toast({
        title: "Success!",
        description: "Item updated successfully",
      });

      navigate(`/documents/${id}`);
    } catch (error: any) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (itemNotFound) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Item not found or you don't have permission to edit it.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Edit Item</h1>
          <p className="text-muted-foreground">Modify item metadata and files</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Required Metadata</CardTitle>
              <CardDescription>Fields marked with * are required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter item title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateIssued">Date Issued *</Label>
                <Input
                  id="dateIssued"
                  type="date"
                  value={dateIssued}
                  onChange={(e) => setDateIssued(e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Optional Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Optional Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Authors */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Authors</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addAuthor}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Author
                  </Button>
                </div>
                {authors.map((author, index) => (
                  <div key={author.id} className="flex gap-2">
                    <Input
                      placeholder={`Author ${index + 1}`}
                      value={author.value}
                      onChange={(e) => updateAuthor(author.id, e.target.value)}
                    />
                    {authors.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAuthor(author.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Abstract */}
              <div className="space-y-2">
                <Label htmlFor="abstract">Abstract / Description</Label>
                <Textarea
                  id="abstract"
                  placeholder="Enter item abstract or description"
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Subjects */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Subject Keywords</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSubject}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Subject
                  </Button>
                </div>
                {subjects.map((subject, index) => (
                  <div key={subject.id} className="flex gap-2">
                    <Input
                      placeholder={`Subject ${index + 1}`}
                      value={subject.value}
                      onChange={(e) => updateSubject(subject.id, e.target.value)}
                    />
                    {subjects.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSubject(subject.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Publisher */}
              <div className="space-y-2">
                <Label htmlFor="publisher">Publisher</Label>
                <Input
                  id="publisher"
                  placeholder="Enter publisher name"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  placeholder="e.g., Clinical Guidelines, Report, Article"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                />
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* File Management */}
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
              <CardDescription>
                Manage attached files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Files */}
              {existingFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Existing Files:</h4>
                  {existingFiles.map((bitstream) => {
                    const isMarkedForDeletion = filesToDelete.includes(bitstream.id);
                    return (
                      <div
                        key={bitstream.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isMarkedForDeletion
                            ? "bg-destructive/10 border border-destructive"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className={`font-medium ${isMarkedForDeletion ? "line-through" : ""}`}>
                              {bitstream.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatBytes(bitstream.sizeBytes)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isMarkedForDeletion ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => unmarkFileForDeletion(bitstream.id)}
                            >
                              Undo
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => markFileForDeletion(bitstream.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Files */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Add new files (max 50MB per file)
                </p>
                <Input
                  type="file"
                  multiple
                  onChange={handleNewFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload">
                  <Button type="button" variant="outline" asChild>
                    <span>Choose Files</span>
                  </Button>
                </Label>
              </div>

              {/* New Files */}
              {newFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">New Files to Upload:</h4>
                  {newFiles.map((fileWrapper) => (
                    <div
                      key={fileWrapper.id}
                      className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{fileWrapper.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatBytes(fileWrapper.file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNewFile(fileWrapper.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={saving}
              className="min-w-[150px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Item"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/documents/${id}`)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditItem;
