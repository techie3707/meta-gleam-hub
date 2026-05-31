import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  Filter,
  ChevronDown,
  ChevronRight,
  Loader2,
  Calendar,
  Trash2,
  LayoutGrid,
  List,
  ChevronLeft,
  Sparkles,
  Zap,
  Users,
  FileText,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchObjects, fetchFacetValues, SearchResult, SearchParams, fetchHasFileCounts } from "@/api/searchApi";
import { fetchCollections, Collection } from "@/api/collectionApi";
import { deleteItem } from "@/api/itemApi";
import { siteConfig } from "@/config/siteConfig";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { PaginationControls } from "@/components/pagination/PaginationControls";

interface FacetValue {
  label: string;
  count: number;
}

interface FacetConfig {
  id: string;
  label: string;
  fieldName: string;
  filterType: "checkbox" | "range" | "boolean";
  defaultExpanded: boolean;
}

// Generate filter sections dynamically from siteConfig
const generateFilterSections = (): FacetConfig[] => {
  const sections: FacetConfig[] = siteConfig.sidebarFacets.map((facet) => ({
    id: facet.name,
    label: facet.label,
    fieldName: facet.name,
    filterType: "checkbox" as const,
    defaultExpanded: false,
  }));
  
  // Update "has_content_in_original_bundle" to be boolean type
  const hasFilesIndex = sections.findIndex((s) => s.id === "has_content_in_original_bundle");
  if (hasFilesIndex !== -1) {
    sections[hasFilesIndex].filterType = "boolean";
  }
  
  return sections;
};

const filterSections: FacetConfig[] = generateFilterSections();

const SearchAdvanced = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parse URL parameters
  const [inputValue, setInputValue] = useState(searchParams.get("query") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "");
  const [scope, setScope] = useState(searchParams.get("scope") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [size, setSize] = useState(parseInt(searchParams.get("size") || "20"));
  const [sortOption, setSortOption] = useState(searchParams.get("sort") || "relevant");

  // Results state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  // Facets state
  const [facets, setFacets] = useState<Record<string, FacetValue[]>>({});
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [expandedFacets, setExpandedFacets] = useState<string[]>([]);
  const [facetPages, setFacetPages] = useState<Record<string, number>>({});
  const [loadingMoreFacets, setLoadingMoreFacets] = useState<Record<string, boolean>>({});

  // Filter state
  const [filters, setFilters] = useState<Record<string, any>>({});

  // UI state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [hasFileCounts, setHasFileCounts] = useState<{ hasFileCount: number; noFileCount: number }>({ hasFileCount: 0, noFileCount: 0 });
  const [loadingTime, setLoadingTime] = useState<string | null>(null);

  // Helper function to get metadata value
  const getMetadataValue = (metadata: any, field: string): string | null => {
    if (metadata && metadata[field] && metadata[field].length > 0) {
      return metadata[field][0].value;
    }
    return null;
  };

  useEffect(() => {
    loadCollections();
    // Initial search on page load
    handleSearch(filters, page, size, true, getSortParam());
  }, []);

  useEffect(() => {
    // Parse filters from URL
    const urlFilters: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      if (!["query", "page", "size", "sort", "scope"].includes(key)) {
        // Handle different filter types
        const section = filterSections.find((s) => s.id === key);
        if (section) {
          if (section.filterType === "checkbox") {
            urlFilters[key] = value.split(",");
          } else if (section.filterType === "range") {
            urlFilters[key] = [value];
          } else if (section.filterType === "boolean") {
            urlFilters[key] = value === "true";
          }
        }
      }
    });
    setFilters(urlFilters);
  }, [searchParams]);

  useEffect(() => {
    // Reset facet state when collection changes
    setFacets({});
    setFacetPages({});
    setExpandedFacets([]);
    setFilters({});
    setPage(1);
    handleSearch({}, 1, size, true, getSortParam());
  }, [scope, size]);

  const loadCollections = async () => {
    try {
      const result = await fetchCollections(0, 100);
      setCollections(result.collections);
    } catch (error) {
      console.error("Failed to load collections:", error);
    }
  };

  const getSortParam = (): string => {
    switch (sortOption) {
      case "title_asc":
        return "dc.title,ASC";
      case "title_desc":
        return "dc.title,DESC";
      case "date_asc":
        return "dc.date.issued,ASC";
      case "date_desc":
        return "dc.date.issued,DESC";
      case "relevant":
      default:
        return "score,DESC";
    }
  };

  const handleSearch = async (
    currentFilters: Record<string, any>,
    currentPage: number,
    currentSize: number,
    updateFilters: boolean,
    sort: string
  ) => {
    setLoading(true);
    const startTime = performance.now();

    try {
      // Build API filters
      const apiFilters: Record<string, string> = {};

      Object.entries(currentFilters).forEach(([key, value]) => {
        const section = filterSections.find((s) => s.id === key);
        if (!section) return;

        if (section.filterType === "checkbox" && Array.isArray(value) && value.length > 0) {
          // Multiple values - add each as separate filter parameter
          value.forEach((v) => {
            const filterKey = `${section.fieldName}`;
            if (apiFilters[filterKey]) {
              apiFilters[filterKey] += `,${v},equals`;
            } else {
              apiFilters[filterKey] = `${v},equals`;
            }
          });
        } else if (section.filterType === "range" && Array.isArray(value) && value.length > 0) {
          const rangeValue = value[0];
          if (rangeValue.includes(" - ")) {
            const [from, to] = rangeValue.split(" - ");
            apiFilters[section.fieldName] = `[${from} TO ${to}],equals`;
          }
        } else if (section.filterType === "boolean" && value !== null) {
          apiFilters[section.fieldName] = `${value},equals`;
        }
      });

      const params: SearchParams = {
        query: searchQuery || undefined,
        page: currentPage - 1,
        size: currentSize,
        sort: sort,
        scope: scope || undefined,
        dsoType: "ITEM",
        filters: apiFilters,
      };

      // Parallel API calls per documentation
      const [searchResult, hasFileCountsResult] = await Promise.all([
        searchObjects(params),
        updateFilters ? fetchHasFileCounts(params) : Promise.resolve({ hasFileCount: 0, noFileCount: 0 })
      ]);

      setSearchResults(searchResult.results);
      setTotalData(searchResult.page.totalElements);
      setTotalPages(searchResult.page.totalPages);

      if (updateFilters) {
        setHasFileCounts(hasFileCountsResult);

        // Fetch facets for all filter sections in parallel
        setFacetsLoading(true);
        const facetPromises = filterSections
          .filter(section => section.filterType === "checkbox")
          .map(section =>
            fetchFacetValues(section.fieldName, { ...params, facetSize: 5 })
              .then(facet => ({ id: section.id, facet }))
              .catch(() => ({ id: section.id, facet: { name: section.fieldName, facetType: "text", values: [], hasMore: false } }))
          );

        const facetResults = await Promise.all(facetPromises);

        const newFacets: Record<string, FacetValue[]> = {};
        facetResults.forEach(({ id, facet }) => {
          if (facet.values && facet.values.length > 0) {
            newFacets[id] = facet.values;
          }
        });
        setFacets(newFacets);
        setFacetsLoading(false);
      }

      // Track loading time
      const endTime = performance.now();
      const timeInSeconds = ((endTime - startTime) / 1000).toFixed(2);
      setLoadingTime(timeInSeconds);

      // Update URL
      updateUrlWithSearchParams(currentFilters, currentPage, currentSize);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Error",
        description: "Failed to perform search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const loadMoreFacetItems = async (facetId: string) => {
    const section = filterSections.find((s) => s.id === facetId);
    if (!section) return;

    setLoadingMoreFacets((prev) => ({ ...prev, [facetId]: true }));
    try {
      const nextPage = (facetPages[facetId] || 0) + 1;

      // Build current filters for facet request
      const apiFilters: Record<string, string> = {};
      Object.entries(filters).forEach(([key, value]) => {
        const sec = filterSections.find((s) => s.id === key);
        if (!sec) return;

        if (sec.filterType === "checkbox" && Array.isArray(value) && value.length > 0) {
          value.forEach((v) => {
            const filterKey = `${sec.fieldName}`;
            if (apiFilters[filterKey]) {
              apiFilters[filterKey] += `,${v},equals`;
            } else {
              apiFilters[filterKey] = `${v},equals`;
            }
          });
        }
      });

      const facet = await fetchFacetValues(section.fieldName, {
        query: searchQuery || undefined,
        scope: scope || undefined,
        dsoType: "ITEM",
        filters: apiFilters,
        facetPage: nextPage,
        facetSize: 5,
      });

      setFacets((prev) => ({
        ...prev,
        [facetId]: [...(prev[facetId] || []), ...facet.values],
      }));
      setFacetPages((prev) => ({ ...prev, [facetId]: nextPage }));
    } catch (error) {
      console.error("Load more facets error:", error);
    } finally {
      setLoadingMoreFacets((prev) => ({ ...prev, [facetId]: false }));
    }
  };

  const updateUrlWithSearchParams = (
    currentFilters: Record<string, any>,
    currentPage: number,
    currentSize: number
  ) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("query", searchQuery);
    if (scope) params.set("scope", scope);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (currentSize !== 20) params.set("size", currentSize.toString());
    if (sortOption !== "relevant") params.set("sort", sortOption);

    Object.entries(currentFilters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        params.set(key, value.join(","));
      } else if (typeof value === "boolean") {
        params.set(key, value.toString());
      } else if (value) {
        params.set(key, value);
      }
    });

    setSearchParams(params);
  };

  const updateFilter = (filterType: string, value: any, isChecked: boolean) => {
    setFilters((prev) => {
      const section = filterSections.find((s) => s.id === filterType);
      if (!section) return prev;

      let newValue;
      if (section.filterType === "boolean") {
        newValue = isChecked ? value : null;
      } else if (section.filterType === "range") {
        newValue = isChecked ? [value] : [];
      } else {
        // Checkbox
        const currentValues = Array.isArray(prev[filterType]) ? prev[filterType] : [];
        newValue = isChecked
          ? [...currentValues, value]
          : currentValues.filter((item) => item !== value);
      }

      const newFilters = { ...prev, [filterType]: newValue };

      // Trigger search with new filters
      handleSearch(newFilters, 1, size, true, getSortParam());

      return newFilters;
    });
  };

  const resetFilters = () => {
    setFilters({});
    setPage(1);
    handleSearch({}, 1, size, true, getSortParam());
  };

  const handleSelectAll = () => {
    if (selectedItems.length === searchResults.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(searchResults.map((r) => r.uuid));
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      for (const itemId of selectedItems) {
        await deleteItem(itemId);
      }

      toast({
        title: "Success",
        description: `${selectedItems.length} items deleted successfully.`,
      });

      setSelectedItems([]);
      setDeleteModalOpen(false);
      handleSearch(filters, page, size, false, getSortParam());
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete some items.",
        variant: "destructive",
      });
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {searchResults.map((result, index) => (
        <Card
          key={result.uuid}
          className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-slide-up border-0 shadow-md bg-white dark:bg-slate-800 group overflow-hidden"
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => navigate(`/documents/${result.uuid}`)}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Checkbox
                  checked={selectedItems.includes(result.uuid)}
                  onCheckedChange={() => {
                    setSelectedItems((prev) =>
                      prev.includes(result.uuid)
                        ? prev.filter((id) => id !== result.uuid)
                        : [...prev, result.uuid]
                    );
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="border-slate-300 dark:border-slate-600"
                />
              </div>
              <div className="flex-1 min-w-0">
                {result.thumbnail?.href && (
                  <div className="w-full h-40 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg mb-3 overflow-hidden relative shadow-md">
                    <img
                      src={result.thumbnail.href.startsWith('http')
                        ? result.thumbnail.href
                        : `${siteConfig.apiEndpoint}${result.thumbnail.href}`}
                      alt={result.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <h3 className="font-bold text-foreground truncate mb-3 text-sm leading-tight group-hover:text-blue-600 transition">
                  {getMetadataValue(result.metadata, "dc.title") || result.name || "Untitled"}
                </h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {getMetadataValue(result.metadata, "dc.uhidno") && (
                    <p className="truncate flex items-center gap-1.5">
                      <FileText className="w-3 h-3 flex-shrink-0 text-blue-500" />
                      <span>UHID: {getMetadataValue(result.metadata, "dc.uhidno")}</span>
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.patientname") && (
                    <p className="truncate flex items-center gap-1.5">
                      <Users className="w-3 h-3 flex-shrink-0 text-purple-500" />
                      <span>{getMetadataValue(result.metadata, "dc.patientname")}</span>
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.doctorname") && (
                    <p className="truncate flex items-center gap-1.5">
                      <Users className="w-3 h-3 flex-shrink-0 text-green-500" />
                      <span>{getMetadataValue(result.metadata, "dc.doctorname")}</span>
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.date.created") && (
                    <p className="truncate flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 flex-shrink-0 text-orange-500" />
                      <span>{format(new Date(getMetadataValue(result.metadata, "dc.date.created")!), "MMM dd, yyyy")}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-3">
      {searchResults.map((result, index) => (
        <Card
          key={result.uuid}
          className="cursor-pointer hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 animate-slide-up border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group"
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => navigate(`/documents/${result.uuid}`)}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <Checkbox
                  checked={selectedItems.includes(result.uuid)}
                  onCheckedChange={() => {
                    setSelectedItems((prev) =>
                      prev.includes(result.uuid)
                        ? prev.filter((id) => id !== result.uuid)
                        : [...prev, result.uuid]
                    );
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="border-slate-300 dark:border-slate-600"
                />
              </div>
              {result.thumbnail?.href && (
                <div className="w-24 h-32 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                  <img
                    src={result.thumbnail.href.startsWith('http')
                      ? result.thumbnail.href
                      : `${siteConfig.apiEndpoint}${result.thumbnail.href}`}
                    alt={result.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-foreground mb-3 group-hover:text-blue-600 transition">
                  {getMetadataValue(result.metadata, "dc.title") || result.name || "Untitled"}
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {getMetadataValue(result.metadata, "dc.uhidno") && (
                    <p>
                      <span className="font-semibold text-foreground">UHID:</span> {getMetadataValue(result.metadata, "dc.uhidno")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.patientname") && (
                    <p>
                      <span className="font-semibold text-foreground">Patient:</span> {getMetadataValue(result.metadata, "dc.patientname")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.encounterid") && (
                    <p>
                      <span className="font-semibold text-foreground">Encounter:</span> {getMetadataValue(result.metadata, "dc.encounterid")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.doctorname") && (
                    <p>
                      <span className="font-semibold text-foreground">Doctor:</span> {getMetadataValue(result.metadata, "dc.doctorname")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.mrdno") && (
                    <p>
                      <span className="font-semibold text-foreground">MRD:</span> {getMetadataValue(result.metadata, "dc.mrdno")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.speciality") && (
                    <p>
                      <span className="font-semibold text-foreground">Speciality:</span> {getMetadataValue(result.metadata, "dc.speciality")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.date.created") && (
                    <p className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-orange-500" />
                      <span className="font-semibold text-foreground">Date:</span>
                      <span>{format(new Date(getMetadataValue(result.metadata, "dc.date.created")!), "MMM dd, yyyy")}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderFacetSection = (section: FacetConfig) => {
    // Handle boolean filters (Has Files)
    if (section.filterType === "boolean") {
      const isExpanded = expandedFacets.includes(section.id);

      return (
        <div key={section.id} className="border-b border-slate-200 dark:border-slate-700 -mx-2">
          <Collapsible
            open={isExpanded}
            onOpenChange={() => {
              setExpandedFacets((prev) =>
                prev.includes(section.id)
                  ? prev.filter((id) => id !== section.id)
                  : [...prev, section.id]
              );
            }}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-2 hover:bg-blue-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors group">
              <span className="font-semibold text-xs text-foreground">{section.label}</span>
              <ChevronRight className={cn("w-4 h-4 transition-transform text-muted-foreground group-hover:text-blue-600", isExpanded && "rotate-90")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-0 pb-0">
              <div className="space-y-1 mt-1">
                <div className="flex items-center justify-between px-2 py-3.5 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <Checkbox
                      checked={filters[section.id] === true}
                      onCheckedChange={(checked) =>
                        updateFilter(section.id, true, checked as boolean)
                      }
                    />
                    <span className="text-xs font-medium text-foreground">Yes</span>
                  </label>
                  <Badge className="ml-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs">
                    {hasFileCounts.hasFileCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between px-2 py-3.5 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <Checkbox
                      checked={filters[section.id] === false}
                      onCheckedChange={(checked) =>
                        updateFilter(section.id, false, checked as boolean)
                      }
                    />
                    <span className="text-xs font-medium text-foreground">No</span>
                  </label>
                  <Badge className="ml-1 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-full text-xs">
                    {hasFileCounts.noFileCount}
                  </Badge>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      );
    }

    // Handle checkbox filters
    if (section.filterType !== "checkbox") return null;

    const facetValues = facets[section.id] || [];
    if (facetValues.length === 0) return null;

    const isExpanded = expandedFacets.includes(section.id);

    return (
      <div key={section.id} className="border-b border-slate-200 dark:border-slate-700 -mx-2">
        <Collapsible
          open={isExpanded}
          onOpenChange={() => {
            setExpandedFacets((prev) =>
              prev.includes(section.id)
                ? prev.filter((id) => id !== section.id)
                : [...prev, section.id]
            );
          }}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-2 hover:bg-blue-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors group">
            <span className="font-semibold text-xs text-foreground">{section.label}</span>
            <ChevronRight className={cn("w-4 h-4 transition-transform text-muted-foreground group-hover:text-blue-600", isExpanded && "rotate-90")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-0 pb-0">
            <div className="space-y-1 mt-1">
              {facetValues.map((value) => {
                const currentFilter = filters[section.id] || [];
                const isChecked = Array.isArray(currentFilter) && currentFilter.includes(value.label);

                return (
                  <div key={value.label} className="flex items-center justify-between px-2 py-3.5 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          updateFilter(section.id, value.label, checked as boolean)
                        }
                      />
                      <span className="text-xs font-medium text-foreground truncate">{value.label}</span>
                    </label>
                    <Badge className={cn(
                      "ml-1 rounded-full text-xs font-bold",
                      isChecked 
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" 
                        : "bg-slate-100 dark:bg-slate-700 text-foreground"
                    )}>
                      {value.count}
                    </Badge>
                  </div>
                );
              })}
              {facetValues.length >= 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-700/50 font-semibold text-xs h-7 rounded-none"
                  onClick={() => loadMoreFacetItems(section.id)}
                  disabled={loadingMoreFacets[section.id]}
                >
                  {loadingMoreFacets[section.id] ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1">
                      <ChevronDown className="w-3 h-3" />
                      Show More
                    </span>
                  )}
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Advanced Search</span>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Search Documents</h1>
            <p className="text-lg text-muted-foreground">
              Find documents effortlessly with advanced filtering and intelligent faceted search
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-8">
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-0 group-focus-within:opacity-20 transition duration-300" />
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-blue-600 transition" />
                <Input
                  type="text"
                  placeholder="Search by patient name, UHID, doctor, diagnosis..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSearchQuery(inputValue);
                      setPage(1);
                      handleSearch(filters, 1, size, true, getSortParam());
                    }
                  }}
                  className="pl-12 h-12 text-base bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition relative z-10"
                />
              </div>
              <Button
                size="lg"
                onClick={() => {
                  setSearchQuery(inputValue);
                  setPage(1);
                  handleSearch(filters, 1, size, true, getSortParam());
                }}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition px-8"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                {loading ? "Searching..." : "Search"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowFilters(!showFilters)}
                className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>

            {/* Collection & Sort */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Collection
                </label>
                <Select value={scope || "all"} onValueChange={(val) => setScope(val === "all" ? "" : val)}>
                  <SelectTrigger className="border-slate-200 dark:border-slate-700 h-11 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="All Collections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Collections</SelectItem>
                    {collections.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Sort By
                </label>
                <Select value={sortOption} onValueChange={(val) => {
                  setSortOption(val);
                  handleSearch(filters, page, size, false, getSortParam());
                }}>
                  <SelectTrigger className="border-slate-200 dark:border-slate-700 h-11 bg-white dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevant">Most Relevant</SelectItem>
                    <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                    <SelectItem value="title_desc">Title (Z-A)</SelectItem>
                    <SelectItem value="date_desc">Date (Newest)</SelectItem>
                    <SelectItem value="date_asc">Date (Oldest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0 max-h-screen flex flex-col">
              <Card className="flex flex-col h-auto border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-3 px-3 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-base font-bold text-foreground">Filters</CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetFilters}
                      className="text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 h-7 px-2"
                    >
                      Reset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 overflow-y-auto scrollbar-hide p-2">
                  {facetsLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    filterSections.map((section) => renderFacetSection(section))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 space-y-4">
            {/* Results Header */}
            <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-900">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedItems.length === searchResults.length && searchResults.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {totalData} results found
                      </p>
                      {(selectedItems.length > 0 || loadingTime) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedItems.length > 0 && `${selectedItems.length} selected • `}
                          {loadingTime && `Loaded in ${loadingTime}s`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={String(size)} onValueChange={(val) => {
                      setSize(parseInt(val));
                      setPage(1);
                      handleSearch(filters, 1, parseInt(val), false, getSortParam());
                    }}>
                      <SelectTrigger className="w-32 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 / page</SelectItem>
                        <SelectItem value="10">10 / page</SelectItem>
                        <SelectItem value="20">20 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
                        <SelectItem value="100">100 / page</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1 bg-white dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className={viewMode === "grid" ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" : "text-slate-600 dark:text-slate-300"}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className={viewMode === "list" ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" : "text-slate-600 dark:text-slate-300"}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <Card className="border-0 shadow-md bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 animate-in fade-in slide-in-from-top-2 duration-300">
                <CardContent className="p-5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected for action
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleBulkDelete}
                      className="bg-red-600 hover:bg-red-700 shadow-md"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedItems([])}
                      className="border-slate-300 dark:border-slate-600"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Display */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="relative w-16 h-16 mb-4">
                  <Loader2 className="w-16 h-16 animate-spin text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Searching documents...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-16 text-center">
                  <div className="mb-4">
                    <SearchIcon className="w-20 h-20 mx-auto text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-foreground">No results found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {scope
                      ? "This collection appears to be empty or contains no items matching your criteria."
                      : "Try adjusting your search query or filters to find what you're looking for."}
                  </p>
                  {scope && (
                    <Button 
                      onClick={() => {
                        setScope("");
                        setFilters({});
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                    >
                      <SearchIcon className="w-4 h-4 mr-2" />
                      Search All Collections
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {viewMode === "grid" ? renderGridView() : renderListView()}

                {/* Pagination */}
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  totalElements={totalData}
                  pageSize={size}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    handleSearch(filters, newPage, size, false, getSortParam());
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onPageSizeChange={(newSize) => {
                    setSize(newSize);
                    setPage(1);
                    handleSearch(filters, 1, newSize, false, getSortParam());
                  }}
                  loading={loading}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default SearchAdvanced;
