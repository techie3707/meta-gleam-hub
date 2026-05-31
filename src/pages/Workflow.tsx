import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getWorkflowObject,
  workflowFacets,
  workflowFacet,
  updateUrlWithSearchParams,
  parseSearchParamsFromUrl,
} from '@/api/workflow';
import {
  SearchParams,
  FilterOption,
  sortOptions,
  WorkspaceItem,
  FacetFilterOption,
  Filtervalue,
} from '@/data/workflowdata';
import { PaginationControls } from '@/components/pagination/PaginationControls';

const resultsPerPageOptions = [
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '15', value: 15 },
  { label: '20', value: 20 },
];

const Workflow = () => {
  const initialParams = parseSearchParamsFromUrl();

  // State management
  const [inputValue, setInputValue] = useState<string>(initialParams.query || '');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState<number>((initialParams.page ?? 0) + 1 || 1);
  const [size, setSize] = useState<number>(initialParams.size || 10);
  const [searchResults, setSearchResults] = useState<WorkspaceItem[]>([]);
  const [totalData, setTotalData] = useState<number>(0);
  const [filters, setFilters] = useState<Record<string, any>>(initialParams.filters || {});
  const [facets, setFacets] = useState<Record<string, FacetFilterOption[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    FilterOption.reduce((acc, section) => {
      acc[section.id] = section.defaultExpanded;
      return acc;
    }, {} as Record<string, boolean>)
  );
  const [sortOption, setSortOption] = useState(sortOptions[0].value);
  const [facetPagination, setFacetPagination] = useState<Record<string, { page: number; size: number }>>(
    FilterOption.reduce((acc, section) => {
      acc[section.id] = { page: 0, size: 5 };
      return acc;
    }, {} as Record<string, { page: number; size: number }>)
  );

  /**
   * Fetch all facets for current search
   */
  const fetchAllFacets = async (currentFilters: Record<string, any> = filters) => {
    try {
      const params: SearchParams = {
        query: inputValue,
        page: page - 1,
        size: size,
        filters: currentFilters,
        sort: getSortParam(),
      };

      const facetsResponse = await workflowFacets(params);
      setFacets(facetsResponse);
    } catch (error) {
      console.error('Error fetching facets:', error);
    }
  };

  /**
   * Main search handler
   */
  const handleSearch = async (
    currentFilters: Record<string, any> = filters,
    currentPage: number = page,
    itemsPerPage: number = size,
    resetPage: boolean = false,
    sort: string = getSortParam(),
  ) => {
    setIsLoading(true);
    try {
      const pageToFetch = resetPage ? 1 : currentPage;
      const params: SearchParams = {
        query: inputValue,
        page: pageToFetch - 1,
        size: itemsPerPage,
        sort: sort,
        filters: currentFilters,
      };

      updateUrlWithSearchParams(params);

      const result = await getWorkflowObject(params);

      if (result && result.objects) {
        setSearchResults(result.objects);
        setTotalData(result.totalElements);
        if (resetPage) {
          setPage(1);
        }
      } else {
        console.error('Error fetching data:', result);
      }

      await fetchAllFacets(currentFilters);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initial load on mount
   */
  useEffect(() => {
    handleSearch();
  }, []);

  /**
   * Load more items in a facet
   */
  const loadMoreFacetItems = async (sectionId: string) => {
    const section = FilterOption.find(s => s.id === sectionId);
    if (!section) return;

    const currentPagination = facetPagination[sectionId];
    const nextPage = currentPagination.page + 1;

    try {
      const params: SearchParams = {
        query: inputValue,
        page: page - 1,
        size: size,
        filters: filters,
        sort: getSortParam(),
      };

      const newValues = await workflowFacet(
        section.fieldName,
        params,
        nextPage,
        currentPagination.size
      );

      setFacets(prev => ({
        ...prev,
        [sectionId]: [...(prev[sectionId] || []), ...newValues]
      }));

      setFacetPagination(prev => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          page: nextPage
        }
      }));
    } catch (error) {
      console.error('Error loading more facet items:', error);
    }
  };

  /**
   * Toggle filter section expansion
   */
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  /**
   * Reset all filters
   */
  const resetFilters = () => {
    const newFilters = {};
    setFilters(newFilters);
    handleSearch(newFilters, 1, size, true);
  };

  /**
   * Update a single filter
   */
  const updateFilter = (filterType: string, value: any, isChecked: boolean) => {
    setFilters(prev => {
      let newValue;
      const section = FilterOption.find(s => s.id === filterType);

      if (!section) return prev;

      if (section.filterType === 'range') {
        newValue = isChecked ? [value] : [];
      } else {
        newValue = isChecked
          ? Array.from(new Map([...(prev[filterType] || []), value].map(item => [item, item])).keys())
          : (prev[filterType] || []).filter((item: string) => item !== value);
      }

      const newFilters = {
        ...prev,
        [filterType]: newValue,
      };

      handleSearch(newFilters, 1, size, true, getSortParam());
      return newFilters;
    });
  };

  /**
   * Get sort parameter for API
   */
  const getSortParam = (): string => {
    const option = sortOptions.find(opt => opt.value === sortOption);
    return option ? option.apiValue : 'score,DESC';
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    handleSearch(filters, newPage, size, false, getSortParam());
  };

  /**
   * Handle page size change
   */
  const handlePageSizeChange = (newSize: number) => {
    setSize(newSize);
    handleSearch(filters, 1, newSize, true, getSortParam());
  };

  /**
   * Calculate total pages
   */
  const totalPages = Math.ceil(totalData / size) || 1;

  /**
   * Render filter section based on type
   */
  const renderFilterSection = (section: Filtervalue) => {
    switch (section.filterType) {
      case 'checkbox':
        if (!facets[section.id]?.length) return null;

        return (
          <ul className="space-y-2">
            {facets[section.id].map((option, index) => (
              <li key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${section.id}-${option.id}`}
                  checked={(filters[section.id] || []).includes(option.id)}
                  onCheckedChange={(isChecked) =>
                    updateFilter(section.id, option.id, isChecked as boolean)
                  }
                />
                <label
                  htmlFor={`${section.id}-${option.id}`}
                  className="text-sm cursor-pointer"
                >
                  {option.label} ({option.count})
                </label>
              </li>
            ))}

            {facets[section.id].length % facetPagination[section.id]?.size === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadMoreFacetItems(section.id)}
                className="w-full mt-2"
              >
                Load More
              </Button>
            )}
          </ul>
        );
      case 'range':
        return null;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto px-4 py-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Filters</h2>
                  <div className="space-y-4">
                    {FilterOption.map(section => (
                      <div key={section.id} className="border rounded-lg p-4">
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="flex items-center justify-between w-full text-left font-medium hover:text-primary"
                        >
                          {section.label}
                          {expandedSections[section.id] ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                        {expandedSections[section.id] && (
                          <div className="mt-4">
                            {renderFilterSection(section)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={resetFilters}
                  variant="outline"
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Search Bar and Controls */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Search workflow items..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(filters, 1, size, true);
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleSearch(filters, 1, size, true)}
                    className="gap-2"
                  >
                    <Filter size={18} />
                    Search
                  </Button>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Sort</label>
                    <Select value={sortOption} onValueChange={setSortOption}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Per Page</label>
                    <Select value={size.toString()} onValueChange={(v) => setSize(Number(v))}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {resultsPerPageOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">View</label>
                    <div className="flex gap-1 h-9">
                      <Button
                        size="sm"
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        onClick={() => setViewMode('grid')}
                        className="flex-1 text-xs"
                      >
                        Grid
                      </Button>
                      <Button
                        size="sm"
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        onClick={() => setViewMode('list')}
                        className="flex-1 text-xs"
                      >
                        List
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : (
                <div>
                  <div className="mb-4 text-sm text-muted-foreground">
                    {totalData} results found
                  </div>
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                        : 'space-y-2'
                    }
                  >
                    {searchResults.length > 0 ? (
                      searchResults.map((item, idx) => {
                        const title =
                          item._embedded?.indexableObject?.sections
                            ?.traditionalpageone?.['dc.title']?.[0]?.value ||
                          'Untitled';
                        const abstract =
                          item._embedded?.indexableObject?.sections
                            ?.traditionalpageone?.['dc.description.abstract']?.[0]
                            ?.value || '';

                        return (
                          <div
                            key={idx}
                            className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
                              viewMode === 'list' ? 'flex justify-between items-start' : ''
                            }`}
                          >
                            <div className="flex-1">
                              <h3 className="font-semibold mb-2 line-clamp-2">
                                {title}
                              </h3>
                              {abstract && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {abstract}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No workflow items found
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {totalData > 0 && (
                    <div className="mt-8">
                      <PaginationControls
                        totalElements={totalData}
                        totalPages={totalPages}
                        pageSize={size}
                        currentPage={page}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Workflow;
