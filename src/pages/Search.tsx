import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Filter, Calendar, Folder, SortAsc, Loader2, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { searchObjects, fetchFacetValues, fetchFacetConfiguration, FacetCategory, SearchResult, SearchFilterConfig, FacetValue } from "@/api/searchApi";
import { fetchCollections, Collection } from "@/api/collectionApi";
import { siteConfig } from "@/config/siteConfig";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/pagination/PaginationControls";

interface DynamicFacetState {
  config: SearchFilterConfig;
  values: FacetValue[];
  expanded: boolean;
  hasMore: boolean;
  currentPage: number;
  loading: boolean;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "");
  const [scope, setScope] = useState(searchParams.get("scope") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || siteConfig.defaultSort);
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "0"));
  const [size, setSize] = useState(parseInt(searchParams.get("size") || String(siteConfig.defaultPageSize)));
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [dynamicFacets, setDynamicFacets] = useState<DynamicFacetState[]>([]);
  const [facetConfigLoading, setFacetConfigLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Load collections and facet config
  useEffect(() => {
    loadCollections();
    loadFacetConfig();
  }, [scope]);

  const loadCollections = async () => {
    try {
      const result = await fetchCollections(0, 100);
      setCollections(result.collections);
    } catch (error) {
      console.error("Failed to load collections:", error);
    }
  };

  const loadFacetConfig = async () => {
    setFacetConfigLoading(true);
    try {
      const configs = await fetchFacetConfiguration("default", scope || undefined);
      const facetStates: DynamicFacetState[] = configs
        .filter((c) => c.hasFacets)
        .map((config) => ({
          config,
          values: [],
          expanded: config.isOpenByDefault,
          hasMore: false,
          currentPage: 0,
          loading: false,
        }));
      setDynamicFacets(facetStates);
      loadDynamicFacetValues(facetStates);
    } catch (error) {
      console.error("Failed to load facet config:", error);
    } finally {
      setFacetConfigLoading(false);
    }
  };

  const loadDynamicFacetValues = async (facetList?: DynamicFacetState[]) => {
    const list = facetList || dynamicFacets;
    const updated = await Promise.all(
      list.map(async (facet) => {
        try {
          const result = await fetchFacetValues(facet.config.name, {
            query: searchQuery || undefined,
            scope: scope || undefined,
            dsoType: "ITEM",
            filters: selectedFilters,
            facetSize: facet.config.facetLimit || 5,
            facetPage: 0,
          });
          return { ...facet, values: result.values || [], hasMore: result.hasMore, currentPage: 0, loading: false };
        } catch {
          return { ...facet, values: [], hasMore: false, loading: false };
        }
      })
    );
    setDynamicFacets(updated);
  };

  const getFacetLabel = (name: string): string => {
    const labels: Record<string, string> = {
      author: "Author", subject: "Subject", dateIssued: "Date Issued",
      has_content_in_original_bundle: "Has Files", entityType: "Entity Type",
      type: "Type", publisher: "Publisher", language: "Language",
    };
    return labels[name] || name.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
  };

  const performSearch = async () => {
    setLoading(true);
    try {
      const searchResult = await searchObjects({
        query: searchQuery || undefined,
        page,
        size,
        sort,
        scope: scope || undefined,
        dsoType: "ITEM",
        filters: selectedFilters,
      });

      setResults(searchResult.results);
      setTotalElements(searchResult.page.totalElements);
      setTotalPages(searchResult.page.totalPages);

      // Refresh dynamic facet values
      if (dynamicFacets.length > 0) {
        loadDynamicFacetValues();
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    updateSearchParams();
    performSearch();
  };

  const updateSearchParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("query", searchQuery);
    if (scope) params.set("scope", scope);
    if (sort !== siteConfig.defaultSort) params.set("sort", sort);
    if (page > 0) params.set("page", String(page));
    setSearchParams(params);
  };

  const handleFilterChange = (facetName: string, value: string) => {
    // Use "contains" for text filters (title, author), "equals" for facet values
    const operator = ["title", "author"].includes(facetName) ? "contains" : "equals";
    setSelectedFilters((prev) => ({
      ...prev,
      [facetName]: `${value},${operator}`,
    }));
    setPage(0);
  };

  const clearFilter = (facetName: string) => {
    setSelectedFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[facetName];
      return newFilters;
    });
    setPage(0);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === results.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(results.map((r) => r.uuid));
    }
  };

  const handleSelectItem = (uuid: string) => {
    setSelectedItems((prev) =>
      prev.includes(uuid)
        ? prev.filter((id) => id !== uuid)
        : [...prev, uuid]
    );
  };

  // Map search results to DocumentCard format
  const mapResultToDocument = (result: SearchResult) => {
    const metadata = result.metadata || {};
    return {
      id: result.uuid,
      title: result.name || metadata["dc.title"]?.[0]?.value || "Untitled",
      type: "pdf" as const, // Default, could be derived from bitstream
      collection: metadata["dc.source"]?.[0]?.value || "",
      uploadedAt: metadata["dc.date.issued"]?.[0]?.value 
        ? new Date(metadata["dc.date.issued"][0].value) 
        : new Date(),
      size: "",
      author: metadata["dc.contributor.author"]?.[0]?.value || "Unknown",
      description: metadata["dc.description.abstract"]?.[0]?.value || metadata["dc.description"]?.[0]?.value || "",
    };
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Search Documents</h1>
          <p className="text-muted-foreground mt-1">
            Find documents across all collections with advanced filters
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-card rounded-xl border border-border p-6 animate-slide-up">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title, content, author, or metadata..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-12 text-base bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "border-primary text-primary" : ""}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleSearch}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <SearchIcon className="w-4 h-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {Object.keys(selectedFilters).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.entries(selectedFilters).map(([key, value]) => (
                <Badge
                  key={key}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/20"
                  onClick={() => clearFilter(key)}
                >
                  {key}: {value.replace(",equals", "")}
                  <span className="ml-1">×</span>
                </Badge>
              ))}
            </div>
          )}

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border animate-fade-in">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Title Filter
                </label>
                <Input
                  placeholder="Filter by title..."
                  value={selectedFilters["title"]?.replace(",contains", "") || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleFilterChange("title", e.target.value);
                    } else {
                      clearFilter("title");
                    }
                  }}
                  className="bg-secondary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Author Filter
                </label>
                <Input
                  placeholder="Filter by author..."
                  value={selectedFilters["author"]?.replace(",contains", "") || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleFilterChange("author", e.target.value);
                    } else {
                      clearFilter("author");
                    }
                  }}
                  className="bg-secondary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Collection
                </label>
                <Select value={scope} onValueChange={(val) => { setScope(val); setPage(0); }}>
                  <SelectTrigger>
                    <Folder className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="All Collections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Collections</SelectItem>
                    {collections.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Sort By
                </label>
                <Select value={sort} onValueChange={(val) => { setSort(val); setPage(0); }}>
                  <SelectTrigger>
                    <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Relevance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score,DESC">Relevance</SelectItem>
                    <SelectItem value="dc.date.issued,DESC">Newest First</SelectItem>
                    <SelectItem value="dc.date.issued,ASC">Oldest First</SelectItem>
                    <SelectItem value="dc.title,ASC">Title A-Z</SelectItem>
                    <SelectItem value="dc.title,DESC">Title Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Date From
                </label>
                <Input
                  type="date"
                  value={selectedFilters["dateFrom"] || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedFilters(prev => ({ ...prev, dateFrom: e.target.value }));
                    } else {
                      clearFilter("dateFrom");
                    }
                  }}
                  className="bg-secondary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Date To
                </label>
                <Input
                  type="date"
                  value={selectedFilters["dateTo"] || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedFilters(prev => ({ ...prev, dateTo: e.target.value }));
                    } else {
                      clearFilter("dateTo");
                    }
                  }}
                  className="bg-secondary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Items per page
                </label>
                <Select value={String(size)} onValueChange={(val) => { setSize(parseInt(val)); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {siteConfig.pageSizeOptions.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {opt} items
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedFilters({});
                    setScope("");
                    setSort(siteConfig.defaultSort);
                    setPage(0);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Facets Sidebar + Results */}
        <div className="flex gap-6">
          {/* Dynamic Facets Sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0 space-y-4">
              {facetConfigLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-lg border border-border p-4 space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))
              ) : (
                dynamicFacets.map((facet) => (
                  <div key={facet.config.name} className="bg-card rounded-lg border border-border p-4">
                    <button
                      className="flex items-center justify-between w-full font-medium text-foreground mb-2"
                      onClick={() =>
                        setDynamicFacets((prev) =>
                          prev.map((f) =>
                            f.config.name === facet.config.name ? { ...f, expanded: !f.expanded } : f
                          )
                        )
                      }
                    >
                      <span className="text-sm">{getFacetLabel(facet.config.name)}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${facet.expanded ? "" : "-rotate-90"}`} />
                    </button>

                    {facet.expanded && (
                      <div className="space-y-2">
                        {facet.values.length > 0 ? (
                          facet.values.map((value) => (
                            <button
                              key={value.label}
                              onClick={() => handleFilterChange(facet.config.name, value.label)}
                              className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <span className="truncate">{value.label}</span>
                              <Badge variant="secondary" className="ml-2">{value.count}</Badge>
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No values available</p>
                        )}

                        {facet.hasMore && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={async () => {
                              const nextPage = facet.currentPage + 1;
                              try {
                                const result = await fetchFacetValues(facet.config.name, {
                                  query: searchQuery || undefined,
                                  scope: scope || undefined,
                                  dsoType: "ITEM",
                                  filters: selectedFilters,
                                  facetSize: facet.config.facetLimit || 5,
                                  facetPage: nextPage,
                                });
                                setDynamicFacets((prev) =>
                                  prev.map((f) =>
                                    f.config.name === facet.config.name
                                      ? { ...f, values: [...f.values, ...(result.values || [])], hasMore: result.hasMore, currentPage: nextPage }
                                      : f
                                  )
                                );
                              } catch {}
                            }}
                          >
                            Show More
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Results */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedItems.length === results.length && results.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{results.length}</span> of{" "}
                  <span className="font-medium text-foreground">{totalElements}</span> results
                </p>
              </div>
              {selectedItems.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Download Selected ({selectedItems.length})
                  </Button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No results found. Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {results.map((result, index) => (
                  <div
                    key={result.uuid}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className="animate-slide-up flex items-start gap-3"
                  >
                    <Checkbox
                      checked={selectedItems.includes(result.uuid)}
                      onCheckedChange={() => handleSelectItem(result.uuid)}
                      className="mt-4"
                    />
                    <div className="flex-1">
                      <DocumentCard document={mapResultToDocument(result)} variant="list" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-6">
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                pageSize={size}
                totalElements={totalElements}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => { setSize(newSize); setPage(0); }}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Search;
