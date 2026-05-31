import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Download,
  Maximize,
  Minimize,
  ArrowLeft,
  Loader2,
  FileText,
  BookOpen,
  ShoppingCart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PDFViewer } from "@/components/pdf/PDFViewer";
import { FlipBookViewer } from "@/components/pdf/FlipBookViewer";
import { siteConfig } from "@/config/siteConfig";
import { updateUserCart } from "@/api/cartApi";

const PDFViewerPage = () => {
  const { id, bitstreamId } = useParams<{ id: string; bitstreamId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useAuth();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [fileName, setFileName] = useState("document.pdf");
  const [viewMode, setViewMode] = useState<"pdf" | "flipbook">("pdf");
  const [addingToCart, setAddingToCart] = useState(false);
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [pageRange, setPageRange] = useState<string>("");

  useEffect(() => {
    if (bitstreamId) {
      loadPDF();
    }
  }, [bitstreamId]);

  const loadPDF = async () => {
    if (!bitstreamId) return;

    try {
      setLoading(true);
      const authToken = localStorage.getItem(siteConfig.auth.tokenKey);
      const url = `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`;
      
      setPdfUrl(url);
      // In a real implementation, you might fetch metadata to get the file name
      setFileName("document.pdf");
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to load PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!bitstreamId) return;
    
    try {
      const authToken = localStorage.getItem(siteConfig.auth.tokenKey);
      const url = `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`;
      
      const headers: HeadersInit = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const viewerContainer = document.getElementById("pdf-viewer-container");
      if (viewerContainer) {
        viewerContainer.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleAddToCart = () => {
    if (!userId || !bitstreamId) {
      toast({
        title: "Error",
        description: "Unable to Add to MyList. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setShowPageDialog(true);
    setPageRange("");
  };

  const handleConfirmAddToCart = async () => {
    if (!userId || !bitstreamId) return;

    try {
      setAddingToCart(true);
      await updateUserCart(userId, bitstreamId, id, pageRange || undefined);
      toast({
        title: "Success",
        description: pageRange
          ? `${fileName} (pages: ${pageRange}) added to cart!`
          : `${fileName} (all pages) added to cart!`,
      });
      setShowPageDialog(false);
      setPageRange("");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    } finally {
      setAddingToCart(false);
    }
  };
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div id="pdf-viewer-container" className="flex flex-col h-full">
          {/* Toolbar */}
          <div className="bg-background border-b border-border p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (id) {
                    navigate(`/documents/${id}`);
                  } else {
                    navigate(-1);
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <span className="text-sm font-medium">{fileName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "pdf" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("pdf")}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF View
              </Button>
              <Button
                variant={viewMode === "flipbook" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("flipbook")}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Flip Book
              </Button>
              <div className="h-6 w-px bg-border" />
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToCart}
                disabled={addingToCart}
              >
                {addingToCart ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                {!addingToCart && "Add to MyList"}
              </Button>
            </div>
          </div>

          {/* Viewer */}
          <div className="flex-1 overflow-auto bg-muted/30">
            {pdfUrl && viewMode === "pdf" && (
              <PDFViewer
                fileUrl={pdfUrl}
                fileName={fileName}
                className="w-full h-full"
              />
            )}
            {pdfUrl && viewMode === "flipbook" && (
              <FlipBookViewer
                fileUrl={pdfUrl}
                fileName={fileName}
                className="w-full h-full"
              />
            )}
          </div>
        </div>

        {/* Add to MyList Dialog */}
        <Dialog open={showPageDialog} onOpenChange={setShowPageDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to MyList</DialogTitle>
              <DialogDescription>
                Specify which pages to add to your cart. Leave empty to add all pages.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="page-range">Page Range (Optional)</Label>
                <Input
                  id="page-range"
                  placeholder="e.g., 1-5, 10, 15-20 or leave empty for all pages"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  disabled={addingToCart}
                />
                <p className="text-xs text-muted-foreground">
                  Format: Use ranges like "1-5" or specific pages like "1,3,5". Combine both: "1-3,5,7-10"
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPageDialog(false)}
                disabled={addingToCart}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAddToCart}
                disabled={addingToCart}
              >
                {addingToCart ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to MyList
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default PDFViewerPage;
