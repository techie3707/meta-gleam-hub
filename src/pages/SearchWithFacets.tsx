import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileText,
  Calendar,
  User,
  Tag,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  searchObjects,
  fetchFacetValues,
  fetchFacetConfiguration,
  SearchResult,
  SearchFilterConfig,
  FacetValue,
} from "@/api/searchApi";
import { siteConfig } from "@/config/siteConfig";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { PaginationControls } from "@/components/pagination/PaginationControls";

interface DynamicFacet {
  config: SearchFilterConfig;
  values: FacetValue[];
  expanded: boolean;
  loading: boolean;
  hasMore: boolean;
  currentPage: number;
  searchPrefix: string;
  // For date range facets
  rangeMin?: string;
  rangeMax?: string;
}

const SearchWithFacets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [scope, setScope] = useState(searchParams.get("scope") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "0"));
  const [size, setSize] = useState(20);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const [facets, setFacets] = useState<DynamicFacet[]>([]);
  const [selectedFacets, setSelectedFacets] = useState<Record<string, string[]>>({});
  const [configLoading, setConfigLoading] = useState(true);
  const [showFacets, setShowFacets] = useState(true);

  // Step 1: Load facet configuration from backend
  useEffect(() => {
    loadFacetConfig();
  }, [scope]);

  const loadFacetConfig = async () => {
    setConfigLoading(true);
    try {
      const configs = await fetchFacetConfiguration("default", scope || undefined);
      const dynamicFacets: DynamicFacet[] = configs
        .filter((c) => c.hasFacets)
        .map((config) => ({
          config,
          values: [],
          expanded: config.isOpenByDefault,
          loading: false,
          hasMore: false,
          currentPage: 0,
          searchPrefix: "",
          rangeMin: config.minValue,
          rangeMax: config.maxValue,
        }));
      setFacets(dynamicFacets);
      // Load initial values for all facets
      loadAllFacetValues(dynamicFacets);
    } catch (error) {
      console.error("Failed to load facet config:", error);
    } finally {
      setConfigLoading(false);
    }
  };

  // Step 2: Load values for each facet
  const loadAllFacetValues = async (facetList?: DynamicFacet[]) => {
    const list = facetList || facets;
    const filters = buildFilters();

    const updated = await Promise.all(
      list.map(async (facet) => {
        try {
          const result = await fetchFacetValues(facet.config.name, {
            query: query || undefined,
            scope: scope || undefined,
            dsoType: "ITEM",
            filters,
            facetSize: facet.config.facetLimit || 5,
            facetPage: 0,
          });
          return {
            ...facet,
            values: result.values || [],
            hasMore: result.hasMore,
            currentPage: 0,
            loading: false,
          };
        } catch {
          return { ...facet, values: [], hasMore: false, loading: false };
        }
      })
    );
    setFacets(updated);
  };

  const buildFilters = useCallback((): Record<string, string> => {
    const filters: Record<string, string> = {};
    Object.entries(selectedFacets).forEach(([facetName, values]) => {
      if (values.length > 0) {
        // For multiple values use OR logic via comma-separated
        values.forEach((v, i) => {
          if (i === 0) {
            filters[facetName] = `${v},equals`;
          } else {
            // DSpace supports multiple f.facetName params - handled in searchObjects
            filters[`${facetName}_${i}`] = `${v},equals`;
          }
        });
      }
    });
    return filters;
  }, [selectedFacets]);

  // Search + refresh facets
  useEffect(() => {
    performSearch();
    if (!configLoading && facets.length > 0) {
      loadAllFacetValues();
    }
  }, [page, selectedFacets, scope]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      Object.entries(selectedFacets).forEach(([facetName, values]) => {
        if (values.length > 0) {
          filters[facetName] = values.map((v) => `${v},equals`).join(",");
        }
      });

      const searchResult = await searchObjects({
        query: query || undefined,
        page,
        size,
        sort: "score,DESC",
        scope: scope || undefined,
        dsoType: "ITEM",
        filters,
      });

      setResults(searchResult.results);
      setTotalResults(searchResult.page.totalElements);
      setTotalPages(searchResult.page.totalPages);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    performSearch();
    loadAllFacetValues();
  };

  // Show More for a facet
  const handleShowMore = async (facetName: string) => {
    const facet = facets.find((f) => f.config.name === facetName);
    if (!facet) return;

    const nextPage = facet.currentPage + 1;
    setFacets((prev) =>
      prev.map((f) => (f.config.name === facetName ? { ...f, loading: true } : f))
    );

    try {
      const filters = buildFilters();
      const result = await fetchFacetValues(facetName, {
        query: query || undefined,
        scope: scope || undefined,
        dsoType: "ITEM",
        filters,
        facetSize: facet.config.facetLimit || 5,
        facetPage: nextPage,
        prefix: facet.searchPrefix || undefined,
      });

      setFacets((prev) =>
        prev.map((f) =>
          f.config.name === facetName
            ? {
                ...f,
                values: [...f.values, ...(result.values || [])],
                hasMore: result.hasMore,
                currentPage: nextPage,
                loading: false,
              }
            : f
        )
      );
    } catch {
      setFacets((prev) =>
        prev.map((f) => (f.config.name === facetName ? { ...f, loading: false } : f))
      );
    }
  };

  // Search within facet
  const handleFacetSearch = async (facetName: string, prefix: string) => {
    setFacets((prev) =>
      prev.map((f) =>
        f.config.name === facetName ? { ...f, searchPrefix: prefix, loading: true } : f
      )
    );

    if (prefix.length < 2 && prefix.length > 0) {
      // Don't search until at least 2 chars
      setFacets((prev) =>
        prev.map((f) => (f.config.name === facetName ? { ...f, loading: false } : f))
      );
      return;
    }

    try {
      const filters = buildFilters();
      const result = await fetchFacetValues(facetName, {
        query: query || undefined,
        scope: scope || undefined,
        dsoType: "ITEM",
        filters,
        facetSize: 10,
        facetPage: 0,
        prefix: prefix || undefined,
      });

      setFacets((prev) =>
        prev.map((f) =>
          f.config.name === facetName
            ? { ...f, values: result.values || [], hasMore: result.hasMore, currentPage: 0, loading: false }
            : f
        )
      );
    } catch {
      setFacets((prev) =>
        prev.map((f) => (f.config.name === facetName ? { ...f, loading: false } : f))
      );
    }
  };

  const toggleFacetValue = (facetName: string, value: string) => {
    setSelectedFacets((prev) => {
      const currentValues = prev[facetName] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      if (newValues.length === 0) {
        const { [facetName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [facetName]: newValues };
    });
    setPage(0);
  };

  const clearFacet = (facetName: string) => {
    setSelectedFacets((prev) => {
      const { [facetName]: _, ...rest } = prev;
      return rest;
    });
    setPage(0);
  };

  const clearAllFacets = () => {
    setSelectedFacets({});
    setPage(0);
  };

  const toggleFacetExpanded = (facetName: string) => {
    setFacets((prev) =>
      prev.map((f) =>
        f.config.name === facetName ? { ...f, expanded: !f.expanded } : f
      )
    );
  };

  // Date range filter handler
  const handleDateRangeApply = (facetName: string, from: string, to: string) => {
    const rangeValue = `[${from || "*"} TO ${to || "*"}]`;
    setSelectedFacets((prev) => ({
      ...prev,
      [facetName]: [rangeValue],
    }));
    setPage(0);
  };

  const getFacetLabel = (name: string): string => {
    const labels: Record<string, string> = {
      author: "Author",
      subject: "Subject",
      dateIssued: "Date Issued",
      has_content_in_original_bundle: "Has Files",
      entityType: "Entity Type",
      type: "Type",
      publisher: "Publisher",
      language: "Language",
    };
    return labels[name] || name.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
  };

  const getThumbnailUrl = (result: SearchResult) => result.thumbnail?.href || null;
  const getMetadataValue = (result: SearchResult, field: string) =>
    result.metadata?.[field]?.[0]?.value || "";

  const handleResultClick = (result: SearchResult) => navigate(`/documents/${result.uuid}`);

  const activeFiltersCount = Object.values(selectedFacets).reduce(
    (sum, values) => sum + values.length, 0
  );

  // Render facet based on type
  const renderFacetContent = (facet: DynamicFacet) => {
    const { config } = facet;

    // Date/range facet
    if (config.facetType === "date") {
      return (
        <DateRangeFacet
          facet={facet}
          selectedValues={selectedFacets[config.name] || []}
          onApply={(from, to) => handleDateRangeApply(config.name, from, to)}
          onClear={() => clearFacet(config.name)}
        />
      );
    }

    // Boolean/standard facet (Has Files, etc.)
    if (config.facetType === "standard" && facet.values.length <= 3) {
      return (
        <div className="space-y-2 pl-2">
          {facet.values.map((value) => {
            const isSelected = selectedFacets[config.name]?.includes(value.label) || false;
            return (
              <div
                key={value.label}
                className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-1 rounded"
                onClick={() => toggleFacetValue(config.name, value.label)}
              >
                <Checkbox checked={isSelected} />
                <span className="text-sm flex-1 capitalize">
                  {value.label === "true" ? "Yes" : value.label === "false" ? "No" : value.label}
                </span>
                <span className="text-xs text-muted-foreground">({value.count})</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Text / authority / default facet
    return (
      <div className="space-y-2">
        {/* Search within facet */}
        <div className="px-2">
          <Input
            placeholder={`Search ${getFacetLabel(config.name).toLowerCase()}...`}
            value={facet.searchPrefix}
            onChange={(e) => handleFacetSearch(config.name, e.target.value)}
            className="h-8 text-xs bg-secondary/50"
          />
        </div>

        {facet.loading && facet.values.length === 0 ? (
          <div className="space-y-2 pl-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-1 pl-2 max-h-64 overflow-y-auto">
            {facet.values.map((value) => {
              const isSelected = selectedFacets[config.name]?.includes(value.label) || false;
              return (
                <div
                  key={value.label}
                  className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-1 rounded"
                  onClick={() => toggleFacetValue(config.name, value.label)}
                >
                  <Checkbox checked={isSelected} />
                  <span className="text-sm flex-1 truncate">{value.label}</span>
                  <span className="text-xs text-muted-foreground">({value.count})</span>
                </div>
              );
            })}

            {facet.values.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No values available</p>
            )}
          </div>
        )}

        {/* Show More / Show Less */}
        {facet.hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            disabled={facet.loading}
            onClick={() => handleShowMore(config.name)}
          >
            {facet.loading ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : null}
            Show More
          </Button>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Search Repository</h1>
          <p className="text-muted-foreground mt-1">
            Browse {totalResults.toLocaleString()} items with advanced faceted filtering
          </p>
        </div>

        {/* Search Bar */}
        <Card className="p-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title, author, keyword..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-12 bg-secondary/50"
              />
            </div>
            <Button size="lg" onClick={handleSearch} disabled={loading} className="px-8">
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <SearchIcon className="w-4 h-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm font-medium">Active Filters:</span>
              {Object.entries(selectedFacets).map(([facetName, values]) =>
                values.map((value) => (
                  <Badge
                    key={`${facetName}-${value}`}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => toggleFacetValue(facetName, value)}
                  >
                    {getFacetLabel(facetName)}: {value}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFacets} className="text-xs">
                Clear All
              </Button>
            </div>
          )}
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Dynamic Facets Sidebar */}
          {showFacets && (
            <div className="col-span-12 lg:col-span-3 space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </h3>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFacets} className="text-xs">
                      Reset
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {configLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ))
                  ) : facets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No filters available</p>
                  ) : (
                    facets.map((facet) => (
                      <div key={facet.config.name} className="space-y-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-2 h-auto"
                          onClick={() => toggleFacetExpanded(facet.config.name)}
                        >
                          <span className="font-medium text-sm">
                            {getFacetLabel(facet.config.name)}
                          </span>
                          <div className="flex items-center gap-1">
                            {selectedFacets[facet.config.name]?.length > 0 && (
                              <Badge variant="default" className="text-xs h-5 px-1.5">
                                {selectedFacets[facet.config.name].length}
                              </Badge>
                            )}
                            {facet.expanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </Button>

                        {facet.expanded && renderFacetContent(facet)}

                        {selectedFacets[facet.config.name]?.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearFacet(facet.config.name)}
                            className="text-xs w-full text-destructive hover:text-destructive"
                          >
                            Clear {getFacetLabel(facet.config.name)}
                          </Button>
                        )}

                        <Separator />
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Results */}
          <div className={cn("col-span-12", showFacets ? "lg:col-span-9" : "lg:col-span-12")}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {!showFacets && (
                  <Button variant="outline" size="sm" onClick={() => setShowFacets(true)}>
                    <Filter className="w-4 h-4 mr-2" />
                    Show Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
                    )}
                  </Button>
                )}
                <p className="text-sm text-muted-foreground">
                  {totalResults.toLocaleString()} results found
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-4 space-y-3">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </Card>
                ))}
              </div>
            ) : results.length === 0 ? (
              <Card className="p-12 text-center">
                <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search terms or filters</p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {results.map((result) => {
                    const title = result.name || getMetadataValue(result, "dc.title") || "Untitled";
                    const author = getMetadataValue(result, "dc.contributor.author") || "Unknown Author";
                    const dateIssued = getMetadataValue(result, "dc.date.issued");
                    const description =
                      getMetadataValue(result, "dc.description.abstract") ||
                      getMetadataValue(result, "dc.description");
                    const thumbnailUrl = getThumbnailUrl(result);

                    return (
                      <Card
                        key={result.uuid}
                        className="p-4 hover:shadow-lg transition-shadow cursor-pointer group"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="relative w-full h-48 bg-muted rounded-lg mb-3 overflow-hidden">
                          {thumbnailUrl ? (
                            <img
                              src={`${siteConfig.apiEndpoint}${thumbnailUrl}`}
                              alt={title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <FileText className="w-16 h-16 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {title}
                        </h3>

                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            <span className="truncate">{author}</span>
                          </div>
                          {dateIssued && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(dateIssued), "MMM yyyy")}</span>
                            </div>
                          )}
                          {result.handle && (
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3 h-3" />
                              <span className="font-mono">{result.handle}</span>
                            </div>
                          )}
                        </div>

                        {description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{description}</p>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="mt-6">
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={size}
                    totalElements={totalResults}
                    onPageChange={setPage}
                    onPageSizeChange={(newSize) => { setSize(newSize); setPage(0); }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

/** Date Range Facet Component */
const DateRangeFacet = ({
  facet,
  selectedValues,
  onApply,
  onClear,
}: {
  facet: DynamicFacet;
  selectedValues: string[];
  onApply: (from: string, to: string) => void;
  onClear: () => void;
}) => {
  const [fromYear, setFromYear] = useState(facet.rangeMin || "");
  const [toYear, setToYear] = useState(facet.rangeMax || "");

  return (
    <div className="space-y-3 pl-2 pr-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">From</label>
          <Input
            type="number"
            placeholder={facet.rangeMin || "Min"}
            value={fromYear}
            onChange={(e) => setFromYear(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">To</label>
          <Input
            type="number"
            placeholder={facet.rangeMax || "Max"}
            value={toYear}
            onChange={(e) => setToYear(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Also show facet values if available (year buckets) */}
      {facet.values.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {facet.values.map((value) => {
            const isSelected = selectedValues.includes(value.label);
            return (
              <div
                key={value.label}
                className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-1 rounded"
                onClick={() => onApply(value.label, value.label)}
              >
                <Checkbox checked={isSelected} />
                <span className="text-sm flex-1">{value.label}</span>
                <span className="text-xs text-muted-foreground">({value.count})</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onApply(fromYear, toYear)}
        >
          Apply Range
        </Button>
        {selectedValues.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default SearchWithFacets;
