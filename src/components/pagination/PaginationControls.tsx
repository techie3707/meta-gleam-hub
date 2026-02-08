import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { siteConfig } from "@/config/siteConfig";

interface PaginationControlsProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalElements: number;
  /** Items per page */
  pageSize: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (size: number) => void;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * Reusable pagination component with page size selector,
 * numbered page buttons, first/last/prev/next navigation,
 * and "Showing X-Y of Z" info.
 */
export function PaginationControls({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = siteConfig.pageSizeOptions,
  loading = false,
}: PaginationControlsProps) {
  const startItem = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalElements);

  // Generate page numbers to display
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [];

    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push("ellipsis");
    }

    // Show pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalElements === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      {/* Left: Showing info + Page size */}
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          Showing <span className="font-medium text-foreground">{startItem}</span>–
          <span className="font-medium text-foreground">{endItem}</span> of{" "}
          <span className="font-medium text-foreground">{totalElements}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Rows:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(parseInt(val))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right: Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || loading}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          {getPageNumbers().map((pageNum, idx) =>
            pageNum === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === currentPage ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(pageNum)}
                disabled={loading}
              >
                {pageNum}
              </Button>
            )
          )}

          {/* Next */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages || loading}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
