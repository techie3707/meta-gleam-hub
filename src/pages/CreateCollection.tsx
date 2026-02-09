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
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-6">
        <div className="w-full max-w-2xl px-4">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold">Create New Collection</CardTitle>
              <CardDescription>Add a new collection to organize repository items</CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Community Selection */}
                <div className="space-y-3">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold">Parent Community</h3>
                    <p className="text-sm text-muted-foreground mt-1">Select the community that will contain this collection</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="community" className="text-sm font-medium">Community *</Label>
                    {loadingCommunities ? (
                      <div className="flex items-center justify-center p-8 border rounded-md">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : (
                      <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                        <SelectTrigger id="community" className="h-10">
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
                </div>

                {/* Collection Details */}
                <div className="space-y-3">
                  <div className="mb-3">

                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="collectionName" className="text-sm font-medium">Collection Name *</Label>
                      <Input
                        id="collectionName"
                        placeholder="e.g., NURSING_EDUCATION"
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value.toUpperCase())}
                        required
                        className="h-10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must follow format: CATEGORY_SUBCOLLECTION
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter a brief description of this collection's purpose"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        Example: "Collection for nursing education materials"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4 pt-6 border-t">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreateCollection;
