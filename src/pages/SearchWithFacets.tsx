import { useState, useEffect } from "react";
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
  Folder,
  Image,
  Download,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { searchObjects, fetchFacetValues, SearchResult } from "@/api/searchApi";
import { siteConfig } from "@/config/siteConfig";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FacetValue {
  label: string;
  count: number;
}

interface Facet {
  name: string;
  displayName: string;
  values: FacetValue[];
  expanded: boolean;
}

const SearchWithFacets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Search state
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [scope, setScope] = useState(searchParams.get("scope") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "0"));
  const [size] = useState(20);
  
  // Results state
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Facets state
  const [facets, setFacets] = useState<Facet[]>([]);
  const [selectedFacets, setSelectedFacets] = useState<Record<string, string[]>>({});
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [showFacets, setShowFacets] = useState(true);

  // Common facets to load
  const facetNames = [
    { name: "author", display: "Author" },
    { name: "subject", display: "Subject" },
    { name: "dateIssued", display: "Date Published" },
    { name: "has_content_in_original_bundle", display: "Has Files" },
  ];

  useEffect(() => {
    performSearch();
    loadFacets();
  }, [page, selectedFacets, scope]);

  const performSearch = async () => {
    setLoading(true);
    try {
      // Build filters from selected facets
      const filters: Record<string, string> = {};
      Object.entries(selectedFacets).forEach(([facet, values]) => {
        if (values.length > 0) {
          // Multiple values for same facet - combine with comma
          filters[facet] = values.map(v => `${v},equals`).join(",");
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

  const loadFacets = async () => {
    setFacetsLoading(true);
    try {
      const filters: Record<string, string> = {};
      Object.entries(selectedFacets).forEach(([facet, values]) => {
        if (values.length > 0) {
          filters[facet] = values.map(v => `${v},equals`).join(",");
        }
      });

      const facetResults = await Promise.all(
        facetNames.map(async ({ name, display }) => {
          try {
            const facetData = await fetchFacetValues(name, {
              query: query || undefined,
              scope: scope || undefined,
              dsoType: "ITEM",
              filters,
              facetSize: 10,
            });

            return {
              name,
              displayName: display,
              values: facetData.values || [],
              expanded: true,
            };
          } catch (error) {
            console.error(`Error loading facet ${name}:`, error);
            return {
              name,
              displayName: display,
              values: [],
              expanded: true,
            };
          }
        })
      );

      setFacets(facetResults);
    } catch (error) {
      console.error("Facets loading error:", error);
    } finally {
      setFacetsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    performSearch();
    loadFacets();
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
      prev.map((f) => (f.name === facetName ? { ...f, expanded: !f.expanded } : f))
    );
  };

  const getThumbnailUrl = (result: SearchResult) => {
    if (result.thumbnail?.href) {
      return result.thumbnail.href;
    }
    return null;
  };

  const getMetadataValue = (result: SearchResult, field: string) => {
    return result.metadata?.[field]?.[0]?.value || "";
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(`/documents/${result.uuid}`);
  };

  const activeFiltersCount = Object.values(selectedFacets).reduce(
    (sum, values) => sum + values.length,
    0
  );

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
            <Button
              size="lg"
              onClick={handleSearch}
              disabled={loading}
              className="px-8"
            >
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
                    {value}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFacets}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
          )}
        </Card>

        {/* Main Content - Sidebar + Results */}
        <div className="grid grid-cols-12 gap-6">
          {/* Facets Sidebar */}
          {showFacets && (
            <div className="col-span-12 lg:col-span-3 space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFacets(false)}
                    className="lg:hidden"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {facetsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))
                  ) : (
                    facets.map((facet) => (
                      <div key={facet.name} className="space-y-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-2 h-auto"
                          onClick={() => toggleFacetExpanded(facet.name)}
                        >
                          <span className="font-medium text-sm">
                            {facet.displayName}
                          </span>
                          {facet.expanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>

                        {facet.expanded && facet.values.length > 0 && (
                          <div className="space-y-2 pl-2">
                            {facet.values.map((value) => {
                              const isSelected =
                                selectedFacets[facet.name]?.includes(
                                  value.label
                                ) || false;

                              return (
                                <div
                                  key={value.label}
                                  className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-1 rounded"
                                  onClick={() =>
                                    toggleFacetValue(facet.name, value.label)
                                  }
                                >
                                  <Checkbox checked={isSelected} />
                                  <span className="text-sm flex-1 truncate">
                                    {value.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({value.count})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {facet.expanded && facet.values.length === 0 && (
                          <p className="text-xs text-muted-foreground pl-2">
                            No filters available
                          </p>
                        )}

                        {selectedFacets[facet.name]?.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearFacet(facet.name)}
                            className="text-xs w-full"
                          >
                            Clear {facet.displayName}
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
          <div
            className={cn(
              "col-span-12",
              showFacets ? "lg:col-span-9" : "lg:col-span-12"
            )}
          >
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {!showFacets && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFacets(true)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Show Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                )}
                <p className="text-sm text-muted-foreground">
                  {totalResults.toLocaleString()} results found
                </p>
              </div>

              {/* Pagination Info */}
              {totalPages > 1 && (
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
              )}
            </div>

            {/* Results Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-4 space-y-3">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </Card>
                ))}
              </div>
            ) : results.length === 0 ? (
              <Card className="p-12 text-center">
                <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search terms or filters
                </p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {results.map((result) => {
                    const title = result.name || getMetadataValue(result, "dc.title") || "Untitled";
                    const author = getMetadataValue(result, "dc.contributor.author") || "Unknown Author";
                    const dateIssued = getMetadataValue(result, "dc.date.issued");
                    const description = getMetadataValue(result, "dc.description.abstract") || getMetadataValue(result, "dc.description");
                    const thumbnailUrl = getThumbnailUrl(result);

                    return (
                      <Card
                        key={result.uuid}
                        className="p-4 hover:shadow-lg transition-shadow cursor-pointer group"
                        onClick={() => handleResultClick(result)}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-full h-48 bg-muted rounded-lg mb-3 overflow-hidden">
                          {thumbnailUrl ? (
                            <img
                              src={`${siteConfig.apiEndpoint}${thumbnailUrl}`}
                              alt={title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <FileText className="w-16 h-16 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
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
                              <span>
                                {format(new Date(dateIssued), "MMM yyyy")}
                              </span>
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
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {description}
                          </p>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Previous
                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i;
                      } else if (page < 3) {
                        pageNum = i;
                      } else if (page > totalPages - 4) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    })}

                    <Button
                      variant="outline"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SearchWithFacets;
