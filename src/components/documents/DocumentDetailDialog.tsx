import { useState } from "react";
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
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  title: string;
  type: "pdf" | "doc" | "xls" | "image" | "other";
  collection: string;
  uploadedAt: Date;
  size: string;
  author?: string;
  description?: string;
}

interface ActionHistoryItem {
  id: string;
  action: string;
  user: string;
  timestamp: Date;
  details?: string;
}

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

// Mock data for demonstration
const mockActionHistory: ActionHistoryItem[] = [
  { id: "1", action: "Document Uploaded", user: "John Smith", timestamp: new Date(2024, 0, 15, 10, 30), details: "Initial upload" },
  { id: "2", action: "Metadata Updated", user: "Sarah Johnson", timestamp: new Date(2024, 0, 16, 14, 15), details: "Added tags and description" },
  { id: "3", action: "Document Viewed", user: "Mike Davis", timestamp: new Date(2024, 0, 17, 9, 45) },
  { id: "4", action: "Comment Added", user: "Emily Chen", timestamp: new Date(2024, 0, 18, 11, 20), details: "Review feedback" },
  { id: "5", action: "Document Downloaded", user: "John Smith", timestamp: new Date(2024, 0, 19, 16, 0) },
];

const mockComments: Comment[] = [
  { id: "1", user: "Sarah Johnson", text: "Great document! The analysis is very thorough.", timestamp: new Date(2024, 0, 16, 14, 30) },
  { id: "2", user: "Mike Davis", text: "Could you add more details on section 3?", timestamp: new Date(2024, 0, 17, 10, 15) },
  { id: "3", user: "Emily Chen", text: "I've reviewed and approved this document.", timestamp: new Date(2024, 0, 18, 11, 20) },
];

const mockSignatures: Signature[] = [
  { id: "1", user: "John Smith", signedAt: new Date(2024, 0, 15, 10, 35), status: "signed" },
  { id: "2", user: "Sarah Johnson", signedAt: new Date(2024, 0, 16, 15, 0), status: "signed" },
  { id: "3", user: "Mike Davis", signedAt: new Date(), status: "pending" },
];

interface DocumentDetailDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentDetailDialog({ document, open, onOpenChange }: DocumentDetailDialogProps) {
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(mockComments);

  if (!document) return null;

  const config = typeConfig[document.type];
  const Icon = config.icon;

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

  const handleDownload = () => {
    // In a real app, this would trigger the actual download
    console.log("Downloading document:", document.title);
  };

  const handleAddSignature = () => {
    // In a real app, this would open a signature pad or digital signature flow
    console.log("Adding signature to:", document.title);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start gap-4">
            <div className={cn("p-4 rounded-xl", config.bgColor)}>
              <Icon className={cn("w-8 h-8", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-foreground line-clamp-2">
                {document.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary" className={cn("text-xs", config.bgColor, config.color)}>
                  {config.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {document.collection}
                </Badge>
              </div>
            </div>
            <Button variant="default" onClick={handleDownload} className="flex-shrink-0">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1">
          <div className="px-6 border-b border-border">
            <TabsList className="h-12 bg-transparent p-0 gap-4">
              <TabsTrigger
                value="details"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
              >
                <FileText className="w-4 h-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger
                value="signatures"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
              >
                <PenTool className="w-4 h-4 mr-2" />
                Signatures
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Comments ({comments.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[400px]">
            <TabsContent value="details" className="p-6 m-0">
              <div className="space-y-6">
                {/* Document Preview Placeholder */}
                <div className={cn("rounded-xl p-12 flex flex-col items-center justify-center", config.bgColor)}>
                  <Icon className={cn("w-16 h-16 mb-4", config.color)} />
                  <p className="text-sm text-muted-foreground">Document Preview</p>
                </div>

                {/* Metadata Grid */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Metadata</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <MetadataItem icon={User} label="Author" value={document.author || "Unknown"} />
                    <MetadataItem icon={Folder} label="Collection" value={document.collection} />
                    <MetadataItem icon={Calendar} label="Upload Date" value={format(document.uploadedAt, "MMMM d, yyyy")} />
                    <MetadataItem icon={Clock} label="Upload Time" value={format(document.uploadedAt, "h:mm a")} />
                    <MetadataItem icon={HardDrive} label="File Size" value={document.size} />
                    <MetadataItem icon={Tag} label="File Type" value={config.label} />
                  </div>
                </div>

                {/* Description */}
                {document.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Description</h3>
                    <p className="text-muted-foreground">{document.description}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-6 m-0">
              <div className="space-y-1">
                {mockActionHistory.map((item, index) => (
                  <div key={item.id} className="relative">
                    {index !== mockActionHistory.length - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />
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

            <TabsContent value="signatures" className="p-6 m-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Document Signatures</h3>
                  <Button onClick={handleAddSignature}>
                    <PenTool className="w-4 h-4 mr-2" />
                    Add Signature
                  </Button>
                </div>
                <Separator />
                <div className="space-y-3">
                  {mockSignatures.map((signature) => (
                    <div
                      key={signature.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{signature.user}</p>
                          <p className="text-sm text-muted-foreground">
                            {signature.status === "signed"
                              ? `Signed on ${format(signature.signedAt, "MMM d, yyyy")}`
                              : "Pending signature"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={signature.status === "signed" ? "default" : "secondary"}
                        className={cn(
                          signature.status === "signed" && "bg-primary/10 text-primary border-primary/20",
                          signature.status === "pending" && "bg-accent text-accent-foreground border-accent",
                          signature.status === "rejected" && "bg-destructive/10 text-destructive border-destructive/20"
                        )}
                      >
                        {signature.status.charAt(0).toUpperCase() + signature.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="p-6 m-0">
              <div className="space-y-4">
                {/* Comments List */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground text-sm">{comment.user}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(comment.timestamp, "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <Button onClick={handleAddComment} size="icon" className="self-end">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MetadataItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
