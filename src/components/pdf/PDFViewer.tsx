/**
 * Advanced PDF Viewer Component
 * Features: Search, zoom, page navigation, thumbnails, rotation, print, download
 */

import { useState, useEffect, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  RotateCw,
  Search,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Custom fetch function with authentication
const fetchPDFWithAuth = async (url: string): Promise<Uint8Array> => {
  const token = localStorage.getItem("authToken");
  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  // Convert to Uint8Array to avoid detached ArrayBuffer issues
  return new Uint8Array(arrayBuffer);
};

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
  className?: string;
}

interface SearchMatch {
  pageIndex: number;
  textIndex: number;
}

export function PDFViewer({ fileUrl, fileName = "document.pdf", className }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);

  // Fetch PDF with authentication on mount
  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    fetchPDFWithAuth(fileUrl)
      .then((data) => {
        setPdfData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load PDF:", err);
        setLoadError(err.message || "Failed to load PDF");
        setIsLoading(false);
      });
  }, [fileUrl]);
  
  // Memoize the file object to prevent unnecessary reloads
  const pdfFile = useMemo(() => {
    return pdfData ? { data: pdfData } : null;
  }, [pdfData]);
  
  // Custom text renderer to highlight search matches
  const customTextRenderer = (textItem: any) => {
    if (!searchText.trim() || searchMatches.length === 0) {
      return textItem.str;
    }
    
    const text = textItem.str;
    const searchLower = searchText.toLowerCase();
    const textLower = text.toLowerCase();
    
    if (!textLower.includes(searchLower)) {
      return text;
    }
    
    // Highlight all occurrences
    const parts = [];
    let lastIndex = 0;
    let index = textLower.indexOf(searchLower);
    
    while (index !== -1) {
      // Add text before match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }
      
      // Add highlighted match
      const matchText = text.substring(index, index + searchText.length);
      parts.push(
        `<mark style="background-color: #ffeb3b; color: #000; padding: 2px 0;">${matchText}</mark>`
      );
      
      lastIndex = index + searchText.length;
      index = textLower.indexOf(searchLower, lastIndex);
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.join('');
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }
  
  // Search functionality
  const performSearch = async () => {
    if (!searchText.trim() || !pdfDocument) {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }
    
    setIsSearching(true);
    const matches: SearchMatch[] = [];
    const searchLower = searchText.toLowerCase();
    
    try {
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items;
        
        // Combine all text items into a single string for the page
        const pageText = textItems.map((item: any) => item.str).join(' ').toLowerCase();
        
        // Find all occurrences in the page
        let startIndex = 0;
        while (true) {
          const index = pageText.indexOf(searchLower, startIndex);
          if (index === -1) break;
          
          matches.push({
            pageIndex: i,
            textIndex: index,
          });
          
          startIndex = index + 1;
        }
      }
      
      setSearchMatches(matches);
      if (matches.length > 0) {
        setCurrentMatchIndex(0);
        setPageNumber(matches[0].pageIndex);
      } else {
        setCurrentMatchIndex(-1);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };
  
  const goToNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIndex);
    setPageNumber(searchMatches[nextIndex].pageIndex);
  };
  
  const goToPreviousMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIndex = currentMatchIndex === 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    setPageNumber(searchMatches[prevIndex].pageIndex);
  };
  
  // Trigger search when search text changes
  useEffect(() => {
    if (pdfDocument && searchText.trim()) {
      const timer = setTimeout(() => {
        performSearch();
      }, 300); // Debounce search
      return () => clearTimeout(timer);
    } else {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
    }
  }, [searchText, pdfDocument, numPages]);

  function changePage(offset: number) {
    setPageNumber((prevPageNumber) => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages);
    });
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function zoomIn() {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  }

  function zoomOut() {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  }

  function rotate() {
    setRotation((prev) => (prev + 90) % 360);
  }

  function handleDownload() {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className={cn("flex flex-col h-full bg-muted/30 rounded-lg overflow-hidden", className)}>
      <style>{`
        .react-pdf__Page__textContent mark {
          background-color: #ffeb3b !important;
          color: #000 !important;
          padding: 2px 0 !important;
          border-radius: 2px;
        }
      `}</style>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-card border-b border-border flex-wrap gap-2">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousPage}
            disabled={pageNumber <= 1}
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= numPages) {
                  setPageNumber(page);
                }
              }}
              className="w-16 h-8 text-center"
            />
            <span className="text-sm text-muted-foreground">/ {numPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Zoom & Rotation */}
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
          <Button variant="outline" size="sm" onClick={rotate} title="Rotate">
            <RotateCw className="h-4 w-4" />
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
          <Button variant="outline" size="sm" onClick={handlePrint} title="Print">
            <Printer className="h-4 w-4" />
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
            placeholder="Search in document..."
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

      {/* PDF Document */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-muted-foreground">Loading PDF...</div>
            </div>
          ) : loadError ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-destructive">Failed to load PDF: {loadError}</div>
            </div>
          ) : pdfFile ? (
            <Document
              file={pdfFile}
              onLoadSuccess={(pdf) => {
                onDocumentLoadSuccess(pdf);
                setPdfDocument(pdf);
              }}
              onLoadError={(error) => console.error("PDF load error:", error)}
              loading={
                <div className="flex items-center justify-center h-96">
                  <div className="text-muted-foreground">Loading PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-96">
                  <div className="text-destructive">Failed to load PDF</div>
                </div>
              }
              className="shadow-lg"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                customTextRenderer={customTextRenderer}
                loading={
                  <div className="flex items-center justify-center h-96">
                    <div className="text-muted-foreground">Loading page...</div>
                  </div>
                }
              />
            </Document>
          ) : null}
        </div>
      </div>
    </div>
  );
}
