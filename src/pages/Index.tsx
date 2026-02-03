/**
 * Home Page
 * Displays collections grouped by categories with MEDANTA-style cards
 * Per User Manual: Collections grouped by category (e.g., "Nursing", "Clinical")
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  FolderOpen, 
  Activity, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search as SearchIcon,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { fetchCollections, groupCollectionsByCategory, Collection } from "@/api/collectionApi";
import { searchRepository } from "@/api/discoveryApi";
import { getSystemStatus, getCurrentUserInfo } from "@/api/healthApi";

type SystemStatus = "UP" | "DOWN" | "UNKNOWN" | "OUT_OF_SERVICE";

interface DashboardStats {
  totalItems: number;
  totalCollections: number;
  systemStatus: SystemStatus;
}

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemStatus>("UNKNOWN");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<Map<string, Collection[]>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      const [
        collectionsResult,
        itemsResponse,
        healthStatus,
      ] = await Promise.all([
        fetchCollections(0, 100).catch(() => ({ collections: [], page: { totalElements: 0, totalPages: 0, size: 100, number: 0 } })),
        searchRepository({ size: 1 }).catch(() => ({ _embedded: { searchResult: { page: { totalElements: 0 } } } })),
        getSystemStatus().catch(() => ({ overall: "UNKNOWN" as const, components: [] })),
      ]);

      // Set collections
      setCollections(collectionsResult.collections);
      const grouped = groupCollectionsByCategory(collectionsResult.collections);
      setCategoryGroups(grouped);
      // Expand all categories by default
      setExpandedCategories(Array.from(grouped.keys()));

      const totalItems = itemsResponse._embedded?.searchResult?.page?.totalElements || 0;

      setStats({
        totalItems,
        totalCollections: collectionsResult.collections.length,
        systemStatus: healthStatus.overall,
      });

      setSystemHealth(healthStatus.overall);

    } catch (error) {
      console.error("Load home data error:", error);
      toast({
        title: "Error",
        description: "Failed to load home data",
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
    // Navigate to search filtered by collection scope
    navigate(`/search?scope=${collectionId}`);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate("/search");
    }
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

  const dashboardStats = stats ? [
    {
      title: "Total Documents",
      value: stats.totalItems.toLocaleString(),
      change: "Repository items",
      changeType: "neutral" as const,
      icon: FileText,
      iconColor: "text-primary",
    },
    {
      title: "Collections",
      value: stats.totalCollections.toString(),
      change: "Active collections",
      changeType: "neutral" as const,
      icon: FolderOpen,
      iconColor: "text-document-word",
    },
    {
      title: "System Health",
      value: stats.systemStatus,
      change: stats.systemStatus === "UP" ? "All systems operational" : "Issues detected",
      changeType: stats.systemStatus === "UP" ? "positive" as const : "negative" as const,
      icon: Activity,
      iconColor: stats.systemStatus === "UP" ? "text-green-600" : "text-red-600",
    },
  ] : [];

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
        <div>
          <h1 className="text-4xl font-bold text-foreground">Welcome to DocVault</h1>
          <p className="text-muted-foreground mt-2">
            Browse collections and documents organized by category
          </p>
        </div>

        {/* System Health Alert */}
        {systemHealth === "DOWN" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              System health check failed. Some services may be unavailable.
            </AlertDescription>
          </Alert>
        )}

        {/* Search Bar */}
        <div className="bg-card rounded-xl border border-border p-6 animate-slide-up">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search documents by title, author, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-12 text-base bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <Button className="h-12 px-8" onClick={handleSearch}>
              <SearchIcon className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dashboardStats.map((stat, index) => (
            <div key={stat.title} style={{ animationDelay: `${index * 100}ms` }}>
              <StatCard {...stat} />
            </div>
          ))}
        </div>

        {/* Collections Grouped by Category */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Browse Collections</h2>
          
          {Array.from(categoryGroups.entries()).map(([category, cols]) => {
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
                        <h3 className="text-xl font-bold text-foreground">{category}</h3>
                        <p className="text-sm text-muted-foreground">
                          {cols.length} {cols.length === 1 ? 'collection' : 'collections'}
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
                      {cols.map((collection) => (
                        <div
                          key={collection.id}
                          className="group relative bg-card rounded-lg border border-border p-4 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden"
                          onClick={() => handleCollectionClick(collection.id)}
                        >
                          {/* Background pattern - represents MEDANTA.png style */}
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
                          
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {getSubcollectionName(collection.name)}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {getDescription(collection)}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                              <div className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
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
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No collections found</p>
              <p className="text-sm mt-2">Connect to your DSpace backend to see collections</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
