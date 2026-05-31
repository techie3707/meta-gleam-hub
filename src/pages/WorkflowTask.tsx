import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Filter, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Undo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getWorkflowObjects,
  getWorkflowSubmittersFacet,
  getWorkflowItemTypesFacet,
  getWorkflowNamedResourceTypesFacet,
  claimedtask,
  approveClaimedTask,
  rejectClaimedTask,
  deleteClaimedTask,
} from '@/api/workflowTask';
import { FilterOption, sortOptions } from '@/data/workflowTaskData';
import { PaginationControls } from '@/components/pagination/PaginationControls';

const resultsPerPageOptions = [
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '15', value: 15 },
  { label: '20', value: 20 },
];

const WorkflowTask = () => {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState<number>(1);
  const [size, setSize] = useState<number>(10);
  const [workflowItems, setWorkflowItems] = useState<any[]>([]);
  const [totalData, setTotalData] = useState<number>(0);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [facets, setFacets] = useState<Record<string, any[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    FilterOption.reduce((acc, section) => {
      acc[section.id] = section.defaultExpanded;
      return acc;
    }, {} as Record<string, boolean>)
  );
  const [sortOption, setSortOption] = useState(sortOptions[0].value);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  /**
   * Build filter params for API (maps to f.* query params)
   * Properly handles multiple values per filter key
   */
  const buildFilterParams = (currentFilters: Record<string, any>) => {
    const params: Record<string, any> = {};

    Object.entries(currentFilters).forEach(([key, values]) => {
      if (values && values.length > 0) {
        const filterOption = FilterOption.find(opt => opt.id === key);
        const fieldName = filterOption?.fieldName || key;

        // Send plain values without authority suffix for discovery API
        // Store as array for multiple values, or string for single value
        params[`f.${fieldName}`] = values.length === 1 ? values[0] : values;
        console.log('[WorkflowTask] Built filter params for', fieldName, ':', params[`f.${fieldName}`]);
      }
    });

    console.log('[WorkflowTask] All filter params:', params);
    return params;
  };

  /**
   * Fetch all facets
   */
  const fetchAllFacets = async (currentFilters: Record<string, any> = filters) => {
    try {
      const filterParams = buildFilterParams(currentFilters);

      // Facet API doesn't support sort parameter, so we exclude it
      const params = {
        query: inputValue,
        page: page - 1,
        size: size,
        configuration: 'workflow',
        ...filterParams
      };

      console.log('[WorkflowTask] Fetching facets with params:', params);

      const [submitters, itemTypes, namedResourceTypes] = await Promise.all([
        getWorkflowSubmittersFacet(params),
        getWorkflowItemTypesFacet(params),
        getWorkflowNamedResourceTypesFacet(params)
      ]);

      const facetsData = {
        submitter: submitters._embedded?.values || [],
        itemtype: itemTypes._embedded?.values || [],
        namedresourcetype: namedResourceTypes._embedded?.values || []
      };

      console.log('[WorkflowTask] Facets received:', facetsData);
      setFacets(facetsData);
    } catch (error) {
      console.error('Error fetching facets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load filters. Please refresh the page.',
        variant: 'destructive',
      });
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
      const filterParams = buildFilterParams(currentFilters);

      const params = {
        query: inputValue,
        page: pageToFetch - 1,
        size: itemsPerPage,
        sort: sort,
        configuration: 'workflow',
        ...filterParams
      };

      console.log('[WorkflowTask] Executing search with params:', params);

      const result = await getWorkflowObjects(params);
      console.log('[WorkflowTask] Search result received:', result);

      if (result?._embedded?.searchResult?._embedded?.objects) {
        const items = result._embedded.searchResult._embedded.objects.map(
          obj => ({
            ...obj._embedded.indexableObject.workflow,
            ...obj._embedded.indexableObject,
            taskType: obj._embedded.indexableObject.type,
            id: obj._embedded.indexableObject.id
          })
        );
        console.log('[WorkflowTask] Mapped', items.length, 'items');
        setWorkflowItems(items);
        setTotalData(result._embedded.searchResult.page.totalElements);
        if (resetPage) {
          setPage(1);
        }
      } else {
        console.error('Invalid response structure from API:', result);
        setWorkflowItems([]);
        setTotalData(0);
        toast({
          title: 'Warning',
          description: 'Unexpected data format received. Please refresh the page.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setWorkflowItems([]);
      setTotalData(0);
      toast({
        title: 'Error',
        description: 'Failed to load tasks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initial load - fetch data and facets
   */
  useEffect(() => {
    handleSearch();
    fetchAllFacets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Get sort parameter
   */
  const getSortParam = (): string => {
    const option = sortOptions.find(opt => opt.value === sortOption);
    return option ? option.apiValue : 'lastModified,DESC';
  };

  /**
   * Toggle section expansion
   */
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    const newFilters = {};
    setFilters(newFilters);
    setPage(1);
    fetchAllFacets(newFilters).then(() => {
      handleSearch(newFilters, 1, size, true);
    });
  };

  /**
   * Update filter
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

      console.log('[WorkflowTask] Filter updated:', filterType, 'Values:', newValue);
      
      setPage(1);
      fetchAllFacets(newFilters).then(() => {
        handleSearch(newFilters, 1, size, true);
      });

      return newFilters;
    });
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
    setPage(1);
    handleSearch(filters, 1, newSize, true, getSortParam());
  };

  /**
   * Calculate total pages
   */
  const totalPages = Math.ceil(totalData / size) || 1;

  /**
   * ===== TASK ACTION HANDLERS =====
   */

  /**
   * Claim a pool task
   */
  const handleClaimTask = async (id: number) => {
    console.log('[WorkflowTask] Claiming task with ID:', id, 'Type:', typeof id);
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await claimedtask(id.toString());
      toast({
        title: 'Success',
        description: 'Task claimed successfully',
        variant: 'default',
      });
      handleSearch(filters, page, size, false, getSortParam());
    } catch (error) {
      console.error('Error claiming task:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  /**
   * Approve a claimed task
   */
  const handleApproveTask = async (id: number) => {
    console.log('[WorkflowTask] Approving task with ID:', id, 'Type:', typeof id);
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await approveClaimedTask(id);
      toast({
        title: 'Success',
        description: 'Task approved successfully',
        variant: 'default',
      });
      handleSearch(filters, page, size, false, getSortParam());
    } catch (error) {
      console.error('Error approving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  /**
   * Reject task with reason
   */
  const handleRejectClick = async (id: number) => {
    console.log('[WorkflowTask] Rejecting task with ID:', id);
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const reason = window.prompt('Enter rejection reason:', '') || '';
      if (reason !== null) {
        console.log('[WorkflowTask] Rejection reason:', reason);
        await rejectClaimedTask(id, reason);
        toast({
          title: 'Success',
          description: 'Task rejected successfully',
          variant: 'default',
        });
        handleSearch(filters, page, size, false, getSortParam());
      }
    } catch (error) {
      console.error('Error rejecting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  /**
   * Return task to pool (delete claimed task)
   */
  const handleReturnClick = async (id: number) => {
    console.log('[WorkflowTask] Returning task with ID:', id);
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await deleteClaimedTask(id);
      toast({
        title: 'Success',
        description: 'Task returned to pool successfully',
        variant: 'default',
      });
      handleSearch(filters, page, size, false, getSortParam());
    } catch (error) {
      console.error('Error returning task to pool:', error);
      toast({
        title: 'Error',
        description: 'Failed to return task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
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
                        {expandedSections[section.id] && facets[section.id] && (
                          <div className="mt-4 space-y-2">
                            {facets[section.id].map((option, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${section.id}-${option.label}`}
                                  checked={(filters[section.id] || []).includes(option.label)}
                                  onCheckedChange={(isChecked) =>
                                    updateFilter(section.id, option.label, isChecked as boolean)
                                  }
                                />
                                <label
                                  htmlFor={`${section.id}-${option.label}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {option.label} ({option.count})
                                </label>
                              </div>
                            ))}
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
                    placeholder="Search tasks..."
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
                    {totalData} tasks found
                  </div>
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                        : 'space-y-2'
                    }
                  >
                    {workflowItems.length > 0 ? (
                      workflowItems.map((item) => {
                        const title =
                          item._embedded?.workflowitem?.sections
                            ?.traditionalpageone?.['dc.title']?.[0]?.value || 'Untitled';
                        const owner = item._embedded?.owner?.name || 'Unknown';
                        const isPoolTask = item.taskType === 'pooltask';

                        return (
                          <div
                            key={item.id}
                            className="p-4 border rounded-lg hover:shadow-md transition-shadow space-y-4"
                          >
                            <div className="space-y-2">
                              <h3 className="font-semibold line-clamp-2">{title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {isPoolTask ? (
                                  <>
                                    <Clock size={16} />
                                    <span>Pool Task</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock size={16} />
                                    <span>Claimed by: {owner}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {isPoolTask ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleClaimTask(item.id)}
                                  disabled={actionLoading[item.id]}
                                  className="gap-2"
                                >
                                  {actionLoading[item.id] ? (
                                    <Loader2 size={16} className="animate-spin" />
                                  ) : (
                                    <Clock size={16} />
                                  )}
                                  Claim
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveTask(item.id)}
                                    disabled={actionLoading[item.id]}
                                    className="gap-2"
                                  >
                                    {actionLoading[item.id] ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <CheckCircle size={16} />
                                    )}
                                    Approve
                                  </Button>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="gap-2"
                                      >
                                        <XCircle size={16} />
                                        Reject
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Reject Task</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone. Please provide a reason for rejection.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogAction
                                        onClick={() => handleRejectClick(item.id)}
                                        className="bg-destructive"
                                      >
                                        Continue
                                      </AlertDialogAction>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReturnClick(item.id)}
                                    disabled={actionLoading[item.id]}
                                    className="gap-2"
                                  >
                                    {actionLoading[item.id] ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <Undo size={16} />
                                    )}
                                    Return
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No workflow tasks found
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

export default WorkflowTask;
