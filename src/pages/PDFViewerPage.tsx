import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Maximize,
  Minimize,
  ArrowLeft,
  Loader2,
  FileText,
  BookOpen,
} from "lucide-react";
import { PDFViewer } from "@/components/pdf/PDFViewer";
import { FlipBookViewer } from "@/components/pdf/FlipBookViewer";
import { siteConfig } from "@/config/siteConfig";

const PDFViewerPage = () => {
  const { id, bitstreamId } = useParams<{ id: string; bitstreamId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [fileName, setFileName] = useState("document.pdf");
  const [viewMode, setViewMode] = useState<"pdf" | "flipbook">("pdf");

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

  const handleDownload = () => {
    if (!bitstreamId) return;
    
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);
    const url = `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`;
    
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      </div>
    </AppLayout>
  );
};

export default PDFViewerPage;
