/**
 * Flip Book Viewer Component
 * Features: Page flip animation, search, zoom, navigation, highlight
 */

import { useState, useEffect, useRef, useMemo } from "react";
import HTMLFlipBook from "react-pageflip";
import { pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Home,
  BookOpen,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface FlipBookViewerProps {
  fileUrl: string;
  fileName?: string;
  className?: string;
}

interface PageData {
  pageNumber: number;
  canvas: HTMLCanvasElement | null;
  text: string;
}

interface SearchMatch {
  pageIndex: number;
  text: string;
}

export function FlipBookViewer({ fileUrl, fileName = "document.pdf", className }: FlipBookViewerProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  const bookRef = useRef<any>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);

  // Fetch PDF with authentication
  useEffect(() => {
    const fetchPDF = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(fileUrl, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        setPdfData(uint8Array);
      } catch (error: any) {
        console.error("Failed to load PDF:", error);
        setLoadError(error.message || "Failed to load PDF");
        setIsLoading(false);
      }
    };

    fetchPDF();
  }, [fileUrl]);

  // Load PDF and render pages
  useEffect(() => {
    if (!pdfData) return;

    const loadPDF = async () => {
      try {
        // Create a new copy of the data to avoid detached ArrayBuffer issues
        const dataCopy = new Uint8Array(pdfData);
        const loadingTask = pdfjs.getDocument({ data: dataCopy });
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);

        // Initialize pages array with placeholders
        const pageDataArray: PageData[] = Array.from({ length: pdf.numPages }, (_, i) => ({
          pageNumber: i + 1,
          canvas: null,
          text: "",
        }));

        setPages(pageDataArray);
        setIsLoading(false);

        // Render first 4 pages immediately for faster initial display
        const initialPages = Math.min(4, pdf.numPages);
        for (let i = 1; i <= initialPages; i++) {
          await renderPage(pdf, i, pageDataArray);
        }
        setPages([...pageDataArray]);

        // Render remaining pages in background
        for (let i = initialPages + 1; i <= pdf.numPages; i++) {
          await renderPage(pdf, i, pageDataArray);
          // Update state every 2 pages to show progress
          if (i % 2 === 0 || i === pdf.numPages) {
            setPages([...pageDataArray]);
          }
        }
      } catch (error) {
        console.error("Error loading PDF:", error);
        setLoadError("Failed to load PDF pages");
        setIsLoading(false);
      }
    };

    const renderPage = async (pdf: any, pageNum: number, pageDataArray: PageData[]) => {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 }); // Reduced from 2 to 1.5 for faster rendering

        // Create canvas
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { alpha: false }); // Disable alpha for better performance
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          // Fill with white background first
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          
          // Render PDF page
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
        }

        // Get text content
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");

        // Update the specific page
        pageDataArray[pageNum - 1] = {
          pageNumber: pageNum,
          canvas,
          text: pageText,
        };
      } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
      }
    };

    loadPDF();
  }, [pdfData]);

  // Search functionality
  const performSearch = () => {
    if (!searchText.trim() || pages.length === 0) {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    setIsSearching(true);
    const matches: SearchMatch[] = [];
    const searchLower = searchText.toLowerCase();

    pages.forEach((page) => {
      const textLower = page.text.toLowerCase();
      if (textLower.includes(searchLower)) {
        matches.push({
          pageIndex: page.pageNumber - 1,
          text: page.text,
        });
      }
    });

    setSearchMatches(matches);
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      goToPage(matches[0].pageIndex);
    } else {
      setCurrentMatchIndex(-1);
    }
    setIsSearching(false);
  };

  useEffect(() => {
    if (searchText.trim() && pages.length > 0) {
      const timer = setTimeout(performSearch, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
    }
  }, [searchText, pages]);

  const goToNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIndex);
    goToPage(searchMatches[nextIndex].pageIndex);
  };

  const goToPreviousMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIndex = currentMatchIndex === 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    goToPage(searchMatches[prevIndex].pageIndex);
  };

  const goToPage = (pageIndex: number) => {
    if (bookRef.current) {
      bookRef.current.pageFlip().turnToPage(pageIndex);
    }
  };

  const nextPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  const previousPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onPageFlip = (e: any) => {
    setCurrentPage(e.data);
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/30 rounded-lg", className)}>
        <div className="text-muted-foreground">Loading flip book...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/30 rounded-lg", className)}>
        <div className="text-destructive">Error: {loadError}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-muted/30 rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-card border-b border-border flex-wrap gap-2">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(0)}
            title="First Page"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={previousPage}
            disabled={currentPage === 0}
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1} / {numPages}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={currentPage >= numPages - 1}
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Zoom */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={zoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={zoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            title="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} title="Download">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 p-3 bg-card border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search in book..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                goToNextMatch();
              }
            }}
            className="flex-1"
          />
          {isSearching && (
            <span className="text-sm text-muted-foreground">Searching...</span>
          )}
          {!isSearching && searchMatches.length > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {currentMatchIndex + 1} of {searchMatches.length}
            </span>
          )}
          {!isSearching && searchText && searchMatches.length === 0 && (
            <span className="text-sm text-muted-foreground">No matches</span>
          )}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMatch}
              disabled={searchMatches.length === 0}
              title="Previous match"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMatch}
              disabled={searchMatches.length === 0}
              title="Next match"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowSearch(false);
              setSearchText("");
              setSearchMatches([]);
              setCurrentMatchIndex(-1);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Flip Book */}
      <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-gradient-to-b from-muted/20 to-muted/40">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
          <HTMLFlipBook
            width={550}
            height={733}
            size="stretch"
            minWidth={315}
            maxWidth={1000}
            minHeight={400}
            maxHeight={1533}
            maxShadowOpacity={0.5}
            showCover={false}
            mobileScrollSupport={true}
            onFlip={onPageFlip}
            className="shadow-2xl"
            style={{}}
            startPage={0}
            drawShadow={true}
            flippingTime={1000}
            usePortrait={false}
            startZIndex={0}
            autoSize={true}
            clickEventForward={true}
            useMouseEvents={true}
            swipeDistance={30}
            showPageCorners={true}
            disableFlipByClick={false}
            ref={bookRef}
          >
            {pages.map((page, index) => {
              const isMatch = searchMatches.some(m => m.pageIndex === index);
              const isCurrentMatch = searchMatches[currentMatchIndex]?.pageIndex === index;
              
              return (
                <div key={index} className="relative bg-white shadow-lg border-r border-gray-200">
                  {page.canvas ? (
                    <img
                      src={page.canvas.toDataURL()}
                      alt={`Page ${page.pageNumber}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading page {page.pageNumber}...</p>
                      </div>
                    </div>
                  )}
                  {isMatch && page.canvas && (
                    <div className="absolute top-2 right-2">
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        isCurrentMatch 
                          ? "bg-yellow-400 text-black" 
                          : "bg-yellow-200 text-black"
                      )}>
                        Match found
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                    {page.pageNumber}
                  </div>
                </div>
              );
            })}
          </HTMLFlipBook>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-2 bg-card border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          <BookOpen className="inline h-3 w-3 mr-1" />
          Click on page corners or use arrow buttons to flip pages
        </p>
      </div>
    </div>
  );
}
