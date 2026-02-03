import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, Plus, FolderOpen, ChevronDown, ChevronRight, Loader2, Search as SearchIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchCollections, groupCollectionsByCategory, Collection } from "@/api/collectionApi";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Collections = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<Map<string, Collection[]>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
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
      const grouped = groupCollectionsByCategory(result.collections);
      setCategoryGroups(grouped);
      // Expand all categories by default
      setExpandedCategories(Array.from(grouped.keys()));
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

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleCollectionClick = (collectionId: string) => {
    navigate(`/search?scope=${collectionId}`);
  };

  const getDescription = (col: Collection): string => {
    return col.metadata?.["dc.description"]?.[0]?.value || `Collection for ${col.name.replace(/_/g, ' ')}`;
  };

  const getSubcollectionName = (fullName: string): string => {
    const parts = fullName.split("_");
    if (parts.length > 1) {
      return parts.slice(1).join(" ");
    }
    return fullName;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Browse Collections</h1>
            <p className="text-muted-foreground mt-2">
              Explore repository collections organized by category
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => navigate("/collections/create")}>
              <Plus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="animate-slide-up">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        </div>

        {/* Collections Grouped by Category */}
        <div className="space-y-6">
          {Array.from(categoryGroups.entries()).map(([category, cols]) => {
            const filteredCols = searchQuery
              ? cols.filter((col) =>
                  col.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  getDescription(col).toLowerCase().includes(searchQuery.toLowerCase())
                )
              : cols;

            if (filteredCols.length === 0) return null;

            return (
              <Collapsible
                key={category}
                open={expandedCategories.includes(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {/* Category Header */}
                  <CollapsibleTrigger className="w-full p-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-xl font-bold text-foreground">{category}</h2>
                        <p className="text-sm text-muted-foreground">
                          {filteredCols.length} {filteredCols.length === 1 ? 'collection' : 'collections'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform duration-200",
                        expandedCategories.includes(category) && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>

                  {/* Collections in Category */}
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 bg-muted/20">
                      {filteredCols.map((collection) => (
                        <div
                          key={collection.id}
                          className="group relative bg-card rounded-lg border border-border p-4 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden"
                          onClick={() => handleCollectionClick(collection.id)}
                        >
                          {/* Background pattern - placeholder for MEDANTA.png */}
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
                          
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {getSubcollectionName(collection.name)}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {getDescription(collection)}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                              <div className="flex items-center gap-1">
                                <Folder className="w-3 h-3" />
                                <span>{collection.archivedItemsCount || 0} items</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          {categoryGroups.size === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
              <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No collections found</p>
              <p className="text-sm mt-2">Create your first collection to get started</p>
              {isAdmin && (
                <Button
                  onClick={() => navigate("/collections/create")}
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Collection
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Collections;
