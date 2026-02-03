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
import { Loader2, FolderPlus, Info } from "lucide-react";
import { createCollection } from "@/api/collectionApi";
import { fetchCommunities, Community } from "@/api/communityApi";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CreateCollection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  
  const [collectionName, setCollectionName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      setLoadingCommunities(true);
      const response = await fetchCommunities(0, 100);
      setCommunities(response.communities);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load communities",
        variant: "destructive",
      });
    } finally {
      setLoadingCommunities(false);
    }
  };

  const validateCollectionName = (name: string): boolean => {
    // Check naming convention: CATEGORY_SUBCOLLECTION
    const pattern = /^[A-Z]+_[A-Z]+$/;
    return pattern.test(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!collectionName.trim()) {
      toast({
        title: "Validation Error",
        description: "Collection name is required",
        variant: "destructive",
      });
      return;
    }

    if (!validateCollectionName(collectionName)) {
      toast({
        title: "Validation Error",
        description: "Collection name must follow the format: CATEGORY_SUBCOLLECTION (e.g., NURSING_EDUCATION)",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCommunity) {
      toast({
        title: "Validation Error",
        description: "Please select a parent community",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const metadata = {
        "dc.title": [{ value: collectionName, language: "en" }],
      };

      if (description.trim()) {
        metadata["dc.description"] = [{ value: description, language: "en" }];
      }

      const createdCollection = await createCollection(selectedCommunity, metadata, collectionName);

      if (!createdCollection) {
        throw new Error("Failed to create collection");
      }

      toast({
        title: "Success!",
        description: `Collection "${collectionName}" created successfully`,
      });

      navigate("/collections");
    } catch (error: any) {
      console.error("Error creating collection:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create collection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-3xl py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create New Collection</h1>
          <p className="text-muted-foreground">Add a new collection to organize repository items</p>
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Naming Convention:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Use UPPERCASE letters only</li>
              <li>Format: CATEGORY_SUBCOLLECTION</li>
              <li>Separate category and subcategory with underscore</li>
              <li>Examples: NURSING_EDUCATION, CLINICAL_CARDIOLOGY, ADMINISTRATIVE_HR</li>
            </ul>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Community Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Parent Community</CardTitle>
              <CardDescription>Select the community that will contain this collection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="community">Community *</Label>
                {loadingCommunities ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                    <SelectTrigger id="community">
                      <SelectValue placeholder="Select a parent community" />
                    </SelectTrigger>
                    <SelectContent>
                      {communities.map((community) => (
                        <SelectItem key={community.id} value={community.id}>
                          {community.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Collection Details */}
          <Card>
            <CardHeader>
              <CardTitle>Collection Details</CardTitle>
              <CardDescription>Provide basic information about the collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="collectionName">Collection Name *</Label>
                <Input
                  id="collectionName"
                  placeholder="e.g., NURSING_EDUCATION"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value.toUpperCase())}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Must follow format: CATEGORY_SUBCOLLECTION
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a brief description of this collection's purpose"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Example: "Collection for nursing education materials and training documents"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Access Policy Info */}
          <Card>
            <CardHeader>
              <CardTitle>Default Access Groups</CardTitle>
              <CardDescription>
                The following groups will be automatically created for this collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-mono text-sm">
                    {collectionName || "COLLECTION_NAME"}_Read
                  </span>
                  <span className="text-sm text-muted-foreground ml-auto">Read permission</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-mono text-sm">
                    {collectionName || "COLLECTION_NAME"}_Upload
                  </span>
                  <span className="text-sm text-muted-foreground ml-auto">Upload permission</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="font-mono text-sm">
                    {collectionName || "COLLECTION_NAME"}_Admin
                  </span>
                  <span className="text-sm text-muted-foreground ml-auto">Admin permission</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading || loadingCommunities}
              className="min-w-[150px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Create Collection
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/collections")}
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

export default CreateCollection;
