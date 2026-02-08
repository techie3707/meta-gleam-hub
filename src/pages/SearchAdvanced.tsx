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

// Filter sections based on documentation
const filterSections: FacetConfig[] = [
  { id: "companycode", label: "Company Code", fieldName: "companycode", filterType: "checkbox", defaultExpanded: false },
  { id: "unitcode", label: "Unit Code", fieldName: "unitcode", filterType: "checkbox", defaultExpanded: false },
  { id: "employeecategory", label: "Employee Category", fieldName: "employeecategory", filterType: "checkbox", defaultExpanded: false },
  { id: "employeecode", label: "Employee Code", fieldName: "employeecode", filterType: "checkbox", defaultExpanded: false },
  { id: "employeename", label: "Employee Name", fieldName: "employeename", filterType: "checkbox", defaultExpanded: false },
  { id: "employeetype", label: "Employee Type", fieldName: "employeetype", filterType: "checkbox", defaultExpanded: false },
  { id: "post", label: "Post", fieldName: "post", filterType: "checkbox", defaultExpanded: false },
  { id: "departmentname", label: "Department", fieldName: "departmentname", filterType: "checkbox", defaultExpanded: false },
  { id: "filetype", label: "File Type", fieldName: "filetype", filterType: "checkbox", defaultExpanded: false },
  { id: "mlcno", label: "MLC Number", fieldName: "mlcno", filterType: "checkbox", defaultExpanded: false },
  { id: "doctorname", label: "Doctor Name", fieldName: "doctorname", filterType: "checkbox", defaultExpanded: false },
  { id: "uhidno", label: "UHID Number", fieldName: "uhidno", filterType: "checkbox", defaultExpanded: false },
  { id: "encounterid", label: "Encounter ID", fieldName: "encounterid", filterType: "checkbox", defaultExpanded: false },
  { id: "patientname", label: "Patient Name", fieldName: "patientname", filterType: "checkbox", defaultExpanded: false },
  { id: "mrdno", label: "MRD Number", fieldName: "mrdno", filterType: "checkbox", defaultExpanded: false },
  { id: "speciality", label: "Speciality", fieldName: "speciality", filterType: "checkbox", defaultExpanded: false },
  { id: "date", label: "Joining Date", fieldName: "date", filterType: "range", defaultExpanded: false },
  { id: "doa", label: "Date of Admission", fieldName: "doa", filterType: "range", defaultExpanded: false },
  { id: "dod", label: "Date of Discharge", fieldName: "dod", filterType: "range", defaultExpanded: false },
  { id: "has_content_in_original_bundle", label: "Has Files", fieldName: "has_content_in_original_bundle", filterType: "boolean", defaultExpanded: false },
];

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
    if (scope) {
      handleSearch(filters, page, size, true, getSortParam());
    }
  }, [scope]);

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {searchResults.map((result, index) => (
        <Card
          key={result.uuid}
          className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-slide-up"
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => navigate(`/documents/${result.uuid}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
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
              />
              <div className="flex-1 min-w-0">
                {result.thumbnail?.href && (
                  <div className="w-full h-40 bg-muted rounded-md mb-3 overflow-hidden relative">
                    <img
                      src={result.thumbnail.href.startsWith('http') 
                        ? result.thumbnail.href 
                        : `${siteConfig.apiEndpoint}${result.thumbnail.href}`}
                      alt={result.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <h3 className="font-semibold text-foreground truncate mb-2">
                  {getMetadataValue(result.metadata, "dc.title") || result.name || "Untitled"}
                </h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {getMetadataValue(result.metadata, "dc.uhidno") && (
                    <p className="truncate">UHID: {getMetadataValue(result.metadata, "dc.uhidno")}</p>
                  )}
                  {getMetadataValue(result.metadata, "dc.patientname") && (
                    <p className="truncate">Patient: {getMetadataValue(result.metadata, "dc.patientname")}</p>
                  )}
                  {getMetadataValue(result.metadata, "dc.doctorname") && (
                    <p className="truncate">Doctor: {getMetadataValue(result.metadata, "dc.doctorname")}</p>
                  )}
                  {getMetadataValue(result.metadata, "dc.date.created") && (
                    <p className="truncate flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(getMetadataValue(result.metadata, "dc.date.created")!), "MMM dd, yyyy")}
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
          className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-slide-up"
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => navigate(`/documents/${result.uuid}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
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
                className="mt-1"
              />
              {result.thumbnail?.href && (
                <div className="w-24 h-32 bg-muted rounded-md overflow-hidden flex-shrink-0">
                  <img
                    src={result.thumbnail.href.startsWith('http') 
                      ? result.thumbnail.href 
                      : `${siteConfig.apiEndpoint}${result.thumbnail.href}`}
                    alt={result.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  {getMetadataValue(result.metadata, "dc.title") || result.name || "Untitled"}
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {getMetadataValue(result.metadata, "dc.uhidno") && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">UHID:</span> {getMetadataValue(result.metadata, "dc.uhidno")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.patientname") && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Patient:</span> {getMetadataValue(result.metadata, "dc.patientname")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.encounterid") && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Encounter:</span> {getMetadataValue(result.metadata, "dc.encounterid")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.doctorname") && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Doctor:</span> {getMetadataValue(result.metadata, "dc.doctorname")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.mrdno") && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">MRD:</span> {getMetadataValue(result.metadata, "dc.mrdno")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.speciality") && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Speciality:</span> {getMetadataValue(result.metadata, "dc.speciality")}
                    </p>
                  )}
                  {getMetadataValue(result.metadata, "dc.date.created") && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(getMetadataValue(result.metadata, "dc.date.created")!), "MMM dd, yyyy")}
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
        <Collapsible
          key={section.id}
          open={isExpanded}
          onOpenChange={() => {
            setExpandedFacets((prev) =>
              prev.includes(section.id)
                ? prev.filter((id) => id !== section.id)
                : [...prev, section.id]
            );
          }}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
            <span className="font-medium text-sm">{section.label}</span>
            <ChevronRight className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-2">
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <Checkbox
                    checked={filters[section.id] === true}
                    onCheckedChange={(checked) =>
                      updateFilter(section.id, true, checked as boolean)
                    }
                  />
                  <span className="text-sm text-foreground">Yes</span>
                </label>
                <Badge variant="secondary" className="ml-2">
                  {hasFileCounts.hasFileCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <Checkbox
                    checked={filters[section.id] === false}
                    onCheckedChange={(checked) =>
                      updateFilter(section.id, false, checked as boolean)
                    }
                  />
                  <span className="text-sm text-foreground">No</span>
                </label>
                <Badge variant="secondary" className="ml-2">
                  {hasFileCounts.noFileCount}
                </Badge>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }
    
    // Handle checkbox filters
    if (section.filterType !== "checkbox") return null;
    
    const facetValues = facets[section.id] || [];
    if (facetValues.length === 0) return null;

    const isExpanded = expandedFacets.includes(section.id);

    return (
      <Collapsible
        key={section.id}
        open={isExpanded}
        onOpenChange={() => {
          setExpandedFacets((prev) =>
            prev.includes(section.id)
              ? prev.filter((id) => id !== section.id)
              : [...prev, section.id]
          );
        }}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
          <span className="font-medium text-sm">{section.label}</span>
          <ChevronRight className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-2">
          <div className="space-y-2 mt-2">
            {facetValues.map((value) => {
              const currentFilter = filters[section.id] || [];
              const isChecked = Array.isArray(currentFilter) && currentFilter.includes(value.label);
              
              return (
                <div key={value.label} className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        updateFilter(section.id, value.label, checked as boolean)
                      }
                    />
                    <span className="text-sm text-foreground truncate">{value.label}</span>
                  </label>
                  <Badge variant="secondary" className="ml-2">
                    {value.count}
                  </Badge>
                </div>
              );
            })}
            {facetValues.length >= 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => loadMoreFacetItems(section.id)}
                disabled={loadingMoreFacets[section.id]}
              >
                {loadingMoreFacets[section.id] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Show More"
                )}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Search Documents</h1>
          <p className="text-muted-foreground mt-1">
            Find documents with advanced filtering and faceted search
          </p>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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
                  className="pl-12 h-12 text-base"
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
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <SearchIcon className="w-4 h-4 mr-2" />}
                Search
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>

            {/* Collection & Sort */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Collection</label>
                <Select value={scope || "all"} onValueChange={(val) => setScope(val === "all" ? "" : val)}>
                  <SelectTrigger>
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
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select value={sortOption} onValueChange={(val) => {
                  setSortOption(val);
                  handleSearch(filters, page, size, false, getSortParam());
                }}>
                  <SelectTrigger>
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
            <div className="w-80 flex-shrink-0 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Filters</CardTitle>
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      Reset All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {facetsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedItems.length === searchResults.length && searchResults.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <p className="text-sm text-muted-foreground">
                  {totalData} results found
                  {selectedItems.length > 0 && ` • ${selectedItems.length} selected`}
                  {loadingTime && ` • Loaded in ${loadingTime}s`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(size)} onValueChange={(val) => {
                  setSize(parseInt(val));
                  setPage(1);
                  handleSearch(filters, 1, parseInt(val), false, getSortParam());
                }}>
                  <SelectTrigger className="w-32">
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
                <div className="flex gap-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedItems([])}>
                      Discard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Display */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : searchResults.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <SearchIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground mb-4">
                    {scope 
                      ? "This collection appears to be empty or contains no items matching your criteria." 
                      : "Try adjusting your search query or filters"}
                  </p>
                  {scope && (
                    <Button variant="outline" onClick={() => {
                      setScope("");
                      setFilters({});
                    }}>
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
