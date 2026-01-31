import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, Plus, MoreVertical, FileText, Edit, Trash2, ChevronRight, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { fetchCollections, deleteCollection, Collection } from "@/api/collectionApi";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Collections = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const result = await fetchCollections(0, 100);
      setCollections(result.collections);
    } catch (error) {
      console.error("Failed to load collections:", error);
      toast({
        title: "Error",
        description: "Failed to load collections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const success = await deleteCollection(id);
      if (success) {
        toast({ title: "Success", description: "Collection deleted" });
        loadCollections();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete collection",
        variant: "destructive",
      });
    }
  };

  const filteredCollections = collections.filter((col) =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Color mapping based on collection name
  const getCollectionColor = (name: string): string => {
    const colors = [
      "bg-primary",
      "bg-document-word",
      "bg-document-excel",
      "bg-document-image",
      "bg-document-pdf",
      "bg-purple-500",
    ];
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getDescription = (col: Collection): string => {
    return col.metadata?.["dc.description"]?.[0]?.value || "No description available";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Collections</h1>
            <p className="text-muted-foreground mt-1">
              Organize and browse document collections
            </p>
          </div>
          {isAdmin && (
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="animate-slide-up">
          <Input
            type="text"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md bg-card border-border"
          />
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No collections found</p>
          </div>
        ) : (
          /* Collections Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCollections.map((collection, index) => {
              const color = getCollectionColor(collection.name);
              return (
                <div
                  key={collection.id}
                  className="bg-card rounded-xl border border-border p-5 hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 cursor-pointer group animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/search?scope=${collection.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("p-2.5 rounded-lg", color.replace("bg-", "bg-") + "/10")}>
                      <Folder className={cn("w-6 h-6", color.replace("bg-", "text-"))} />
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(collection.id, collection.name);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {collection.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {getDescription(collection)}
                  </p>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{collection.archivedItemsCount || 0} docs</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      Handle: {collection.handle}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Collections;
