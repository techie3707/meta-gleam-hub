import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Download,
  History,
  PenTool,
  MessageSquare,
  Send,
  User,
  Clock,
  Tag,
  Folder,
  Calendar,
  HardDrive,
  ArrowLeft,
  Share2,
  Edit,
  Trash2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  fetchItemWithBitstreams, 
  downloadBitstream, 
  getMetadataValue, 
  getMetadataValues,
  fetchOwningCollection,
  deleteItem,
  Item,
  Bitstream,
} from "@/api/itemApi";
import { siteConfig } from "@/config/siteConfig";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

interface Signature {
  id: string;
  user: string;
  signedAt: Date;
  status: "signed" | "pending" | "rejected";
}

const typeConfig = {
  pdf: { icon: FileText, color: "text-document-pdf", bgColor: "bg-document-pdf/10", label: "PDF Document" },
  doc: { icon: FileText, color: "text-document-word", bgColor: "bg-document-word/10", label: "Word Document" },
  xls: { icon: FileSpreadsheet, color: "text-document-excel", bgColor: "bg-document-excel/10", label: "Excel Spreadsheet" },
  image: { icon: Image, color: "text-document-image", bgColor: "bg-document-image/10", label: "Image File" },
  other: { icon: File, color: "text-document-other", bgColor: "bg-document-other/10", label: "Other File" },
};

// Mock data for signatures and comments (would come from API in real implementation)
const mockSignatures: Signature[] = [
  { id: "1", user: "John Smith", signedAt: new Date(2024, 0, 15, 10, 35), status: "signed" },
  { id: "2", user: "Sarah Johnson", signedAt: new Date(2024, 0, 16, 15, 0), status: "signed" },
  { id: "3", user: "Mike Davis", signedAt: new Date(), status: "pending" },
];

function MetadataItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const [item, setItem] = useState<Item | null>(null);
  const [collection, setCollection] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([
    { id: "1", user: "Sarah Johnson", text: "Great document! The analysis is very thorough.", timestamp: new Date(2024, 0, 16, 14, 30) },
    { id: "2", user: "Mike Davis", text: "Could you add more details on section 3?", timestamp: new Date(2024, 0, 17, 10, 15) },
  ]);

  useEffect(() => {
    if (id) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const itemData = await fetchItemWithBitstreams(id);
      if (itemData) {
        console.log("Item data loaded:", itemData);
        console.log("Bundles:", itemData.bundles);
        setItem(itemData);
        const col = await fetchOwningCollection(id);
        setCollection(col);
      }
    } catch (error) {
      console.error("Failed to load item:", error);
      toast({
        title: "Error",
        description: "Failed to load document details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (bitstream: Bitstream) => {
    setDownloading(bitstream.id);
    try {
      await downloadBitstream(bitstream.id, bitstream.name);
      toast({ title: "Success", description: "Download started" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async () => {
    if (!item || !confirm("Are you sure you want to delete this document?")) return;
    
    try {
      const success = await deleteItem(item.id);
      if (success) {
        toast({ title: "Success", description: "Document deleted" });
        navigate("/documents");
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      user: "Current User",
      text: newComment,
      timestamp: new Date(),
    };
    setComments([...comments, comment]);
    setNewComment("");
  };

  // Get file type from bitstreams
  const getFileType = (): keyof typeof typeConfig => {
    const originalBundle = item?.bundles?.find((b) => b.name === "ORIGINAL");
    const bitstream = originalBundle?.bitstreams?.[0];
    if (!bitstream) return "other";
    
    const name = bitstream.name.toLowerCase();
    if (name.endsWith(".pdf")) return "pdf";
    if (name.endsWith(".doc") || name.endsWith(".docx")) return "doc";
    if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "xls";
    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "image";
    return "other";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Document Not Found</h2>
          <p className="text-muted-foreground mt-2">The document you're looking for doesn't exist.</p>
          <Button className="mt-4" onClick={() => navigate("/documents")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Button>
        </div>
      </AppLayout>
    );
  }

  const fileType = getFileType();
  const config = typeConfig[fileType];
  const Icon = config.icon;

  const metadata = item.metadata || {};
  const title = getMetadataValue(metadata, "dc.title", item.name);
  const description = getMetadataValue(metadata, "dc.description.abstract") || getMetadataValue(metadata, "dc.description");
  const author = getMetadataValue(metadata, "dc.contributor.author", "Unknown");
  const dateIssued = getMetadataValue(metadata, "dc.date.issued");
  const subjects = getMetadataValues(metadata, "dc.subject");
  
  const originalBundle = item.bundles?.find((b) => b.name === "ORIGINAL");
  const bitstreams = originalBundle?.bitstreams || [];
  
  // Get thumbnail from THUMBNAIL bundle
  const thumbnailBundle = item.bundles?.find((b) => b.name === "THUMBNAIL");
  const thumbnailBitstream = thumbnailBundle?.bitstreams?.[0];
  const thumbnailUrl = thumbnailBitstream 
    ? `${siteConfig.apiEndpoint}/api/core/bitstreams/${thumbnailBitstream.id}/content`
    : null;
  
  // Debug logging
  console.log("Original bundle:", originalBundle);
  console.log("Bitstreams from ORIGINAL:", bitstreams);
  console.log("Thumbnail bundle:", thumbnailBundle);
  console.log("Thumbnail URL:", thumbnailUrl);

  // Build action history from item data
  const actionHistory = [
    { id: "1", action: "Document Created", user: author, timestamp: dateIssued ? new Date(dateIssued) : new Date(), details: "Initial creation" },
    ...(item.lastModified ? [{ id: "2", action: "Last Modified", user: "System", timestamp: new Date(item.lastModified), details: "" }] : []),
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button & Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
            {isAdmin && (
              <>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => navigate(`/documents/edit/${id}`)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            {bitstreams.length > 0 && (
              <Button onClick={() => handleDownload(bitstreams[0])}>
                {downloading === bitstreams[0].id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Document Header */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-start gap-6">
            {thumbnailUrl ? (
              <div className="w-48 h-48 rounded-xl overflow-hidden border-2 border-border flex-shrink-0">
                <img 
                  src={thumbnailUrl} 
                  alt={`${title} thumbnail`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center ${config.bgColor}">
                        <div class="${config.color}">
                          ${Icon.name}
                        </div>
                      </div>
                    `;
                  }}
                />
              </div>
            ) : (
              <div className={cn("p-5 rounded-xl", config.bgColor)}>
                <Icon className={cn("w-12 h-12", config.color)} />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant="secondary" className={cn("text-sm", config.bgColor, config.color)}>
                      {config.label}
                    </Badge>
                    {collection && (
                      <Badge variant="outline">{collection.name}</Badge>
                    )}
                    {subjects.slice(0, 5).map((subject) => (
                      <Badge key={subject} variant="secondary" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              {description && (
                <p className="text-muted-foreground mt-4 leading-relaxed">{description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bitstreams / Files */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Files ({bitstreams.length})</h2>
              </div>
              {bitstreams.length === 0 ? (
                <div className={cn("p-16 flex flex-col items-center justify-center", config.bgColor)}>
                  <Icon className={cn("w-24 h-24 mb-4", config.color)} />
                  <p className="text-muted-foreground">No files attached</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {bitstreams.map((bitstream) => {
                    const isPDF = bitstream.name.toLowerCase().endsWith('.pdf');
                    return (
                      <div key={bitstream.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", config.bgColor)}>
                            <Icon className={cn("w-5 h-5", config.color)} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{bitstream.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {bitstream.sizeBytes ? `${(bitstream.sizeBytes / 1024 / 1024).toFixed(2)} MB` : "Unknown size"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPDF && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => navigate(`/pdf/${id}/${bitstream.id}`)}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(bitstream)}
                            disabled={downloading === bitstream.id}
                          >
                            {downloading === bitstream.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tabs Section */}
            <div className="bg-card rounded-xl border border-border">
              <Tabs defaultValue="history">
                <div className="px-4 border-b border-border">
                  <TabsList className="h-14 bg-transparent p-0 gap-6">
                    <TabsTrigger
                      value="history"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-4"
                    >
                      <History className="w-4 h-4 mr-2" />
                      Action History
                    </TabsTrigger>
                    <TabsTrigger
                      value="comments"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-4"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Comments ({comments.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="history" className="p-6 m-0">
                  <div className="space-y-1">
                    {actionHistory.map((item, index) => (
                      <div key={item.id} className="relative">
                        {index !== actionHistory.length - 1 && (
                          <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-border" />
                        )}
                        <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <History className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-foreground">{item.action}</p>
                              <span className="text-xs text-muted-foreground">
                                {format(item.timestamp, "MMM d, h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">by {item.user}</p>
                            {item.details && (
                              <p className="text-sm text-muted-foreground mt-1">{item.details}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="p-6 m-0">
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 bg-muted/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-foreground">{comment.user}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(comment.timestamp, "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-foreground">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                    
                    <Separator />
                    
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex justify-end">
                          <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                            <Send className="w-4 h-4 mr-2" />
                            Post Comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Metadata</h3>
              <div className="space-y-3">
                <MetadataItem icon={User} label="Author" value={author} />
                {collection && (
                  <MetadataItem icon={Folder} label="Collection" value={collection.name} />
                )}
                {dateIssued && (
                  <MetadataItem icon={Calendar} label="Date Issued" value={format(new Date(dateIssued), "MMMM d, yyyy")} />
                )}
                {bitstreams.length > 0 && (
                  <MetadataItem 
                    icon={HardDrive} 
                    label="Size" 
                    value={`${(bitstreams.reduce((acc, b) => acc + (b.sizeBytes || 0), 0) / 1024 / 1024).toFixed(2)} MB`} 
                  />
                )}
                {item.handle && (
                  <MetadataItem icon={Tag} label="Handle" value={item.handle} />
                )}
              </div>
            </div>

            {/* All Metadata Fields */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">All Fields</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {Object.entries(metadata).map(([key, values]) => (
                  <div key={key} className="pb-3 border-b border-border last:border-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      {siteConfig.metadataLabels[key] || key}
                    </p>
                    {values.map((v, i) => (
                      <p key={i} className="text-sm text-foreground">{v.value}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DocumentDetail;
