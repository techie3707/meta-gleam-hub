import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { createItem, uploadBitstream } from "@/api/itemApi";
import { Badge } from "@/components/ui/badge";

interface MetadataField {
  id: string;
  value: string;
}

interface FileToUpload {
  file: File;
  id: string;
}

const CreateItem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  
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
  const [files, setFiles] = useState<FileToUpload[]>([]);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const response = await fetchCollections(0, 100);
      setCollections(response.collections);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load collections",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
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

    if (!selectedCollection) {
      toast({
        title: "Validation Error",
        description: "Please select a collection",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

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

      // Create item
      const createdItem = await createItem(selectedCollection, metadata);

      if (!createdItem) {
        throw new Error("Failed to create item");
      }

      // Upload files
      if (files.length > 0) {
        for (const fileToUpload of files) {
          await uploadBitstream(createdItem.id, fileToUpload.file);
        }
      }

      toast({
        title: "Success!",
        description: `Item "${title}" created successfully`,
      });

      navigate(`/documents/${createdItem.id}`);
    } catch (error: any) {
      console.error("Error creating item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create New Item</h1>
          <p className="text-muted-foreground">Add a new item to the repository</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Collection Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Collection</CardTitle>
              <CardDescription>Select the collection for this item</CardDescription>
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

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
              <CardDescription>
                Upload files to attach to this item (max 50MB per file)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Drag files here or click to browse
                </p>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload">
                  <Button type="button" variant="outline" asChild>
                    <span>Choose Files</span>
                  </Button>
                </Label>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Selected Files:</h4>
                  {files.map((fileWrapper) => (
                    <div
                      key={fileWrapper.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
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
                        onClick={() => removeFile(fileWrapper.id)}
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
              disabled={loading}
              className="min-w-[150px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Item"
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
