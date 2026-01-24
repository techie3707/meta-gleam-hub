import { useState } from "react";
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
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Mock documents data (in real app, this would come from API/context)
const mockDocuments = [
  {
    id: "1",
    title: "Annual Financial Report 2024",
    type: "pdf" as const,
    collection: "Financial Reports",
    uploadedAt: new Date(2024, 0, 15),
    size: "2.4 MB",
    author: "John Smith",
    description: "Comprehensive annual financial report covering all quarters of 2024 with detailed analysis and projections.",
    tags: ["finance", "annual", "report", "2024"],
  },
  {
    id: "2",
    title: "Project Alpha - Technical Specifications",
    type: "doc" as const,
    collection: "Technical Docs",
    uploadedAt: new Date(2024, 1, 20),
    size: "1.8 MB",
    author: "Sarah Johnson",
    description: "Complete technical specifications for Project Alpha including architecture diagrams and API documentation.",
    tags: ["technical", "specs", "project-alpha"],
  },
  {
    id: "3",
    title: "Q3 Budget Analysis Spreadsheet",
    type: "xls" as const,
    collection: "Financial Reports",
    uploadedAt: new Date(2024, 2, 10),
    size: "956 KB",
    author: "Mike Davis",
    description: "Detailed budget analysis for Q3 with variance reports and forecasting data.",
    tags: ["budget", "Q3", "analysis"],
  },
  {
    id: "4",
    title: "Marketing Campaign Assets",
    type: "image" as const,
    collection: "Media Library",
    uploadedAt: new Date(2024, 3, 5),
    size: "15.2 MB",
    author: "Emily Chen",
    description: "Collection of marketing campaign visuals including banners, social media graphics, and promotional materials.",
    tags: ["marketing", "assets", "campaign"],
  },
  {
    id: "5",
    title: "Employee Handbook 2024",
    type: "pdf" as const,
    collection: "HR Documents",
    uploadedAt: new Date(2024, 0, 1),
    size: "3.2 MB",
    author: "HR Department",
    description: "Updated employee handbook with policies, procedures, and guidelines for all staff members.",
    tags: ["HR", "handbook", "policies"],
  },
  {
    id: "6",
    title: "API Documentation v2.0",
    type: "doc" as const,
    collection: "Technical Docs",
    uploadedAt: new Date(2024, 4, 12),
    size: "2.1 MB",
    author: "Dev Team",
    description: "Complete API documentation with endpoints, authentication, and usage examples.",
    tags: ["API", "documentation", "v2"],
  },
  {
    id: "7",
    title: "Sales Report Q1 2024",
    type: "xls" as const,
    collection: "Financial Reports",
    uploadedAt: new Date(2024, 3, 1),
    size: "1.4 MB",
    author: "Sales Team",
    description: "Q1 sales performance report with regional breakdowns and trend analysis.",
    tags: ["sales", "Q1", "report"],
  },
  {
    id: "8",
    title: "Brand Guidelines",
    type: "pdf" as const,
    collection: "Media Library",
    uploadedAt: new Date(2024, 2, 15),
    size: "8.5 MB",
    author: "Design Team",
    description: "Company brand guidelines including logo usage, color palette, typography, and visual standards.",
    tags: ["brand", "guidelines", "design"],
  },
];

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
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(mockComments);

  const document = mockDocuments.find((doc) => doc.id === id);

  if (!document) {
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
            <Button variant="outline" size="icon">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Document Header */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-start gap-6">
            <div className={cn("p-5 rounded-xl", config.bgColor)}>
              <Icon className={cn("w-12 h-12", config.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{document.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant="secondary" className={cn("text-sm", config.bgColor, config.color)}>
                      {config.label}
                    </Badge>
                    <Badge variant="outline">{document.collection}</Badge>
                    {document.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground mt-4 leading-relaxed">{document.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Preview */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Document Preview</h2>
              </div>
              <div className={cn("p-16 flex flex-col items-center justify-center", config.bgColor)}>
                <Icon className={cn("w-24 h-24 mb-4", config.color)} />
                <p className="text-muted-foreground">Preview not available</p>
                <Button variant="outline" className="mt-4">
                  <Download className="w-4 h-4 mr-2" />
                  Download to View
                </Button>
              </div>
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
                      value="signatures"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-4"
                    >
                      <PenTool className="w-4 h-4 mr-2" />
                      Signatures
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
                    {mockActionHistory.map((item, index) => (
                      <div key={item.id} className="relative">
                        {index !== mockActionHistory.length - 1 && (
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

                <TabsContent value="signatures" className="p-6 m-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {mockSignatures.filter((s) => s.status === "signed").length} of {mockSignatures.length} signatures collected
                      </p>
                      <Button>
                        <PenTool className="w-4 h-4 mr-2" />
                        Add Signature
                      </Button>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      {mockSignatures.map((signature) => (
                        <div
                          key={signature.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{signature.user}</p>
                              <p className="text-sm text-muted-foreground">
                                {signature.status === "signed"
                                  ? `Signed on ${format(signature.signedAt, "MMM d, yyyy 'at' h:mm a")}`
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

                    <Separator className="my-4" />

                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 flex gap-2">
                        <Textarea
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="min-h-[100px] resize-none"
                        />
                        <Button onClick={handleAddComment} size="icon" className="self-end h-10 w-10">
                          <Send className="w-4 h-4" />
                        </Button>
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
              <h2 className="font-semibold text-foreground mb-4">Document Metadata</h2>
              <div className="space-y-3">
                <MetadataItem icon={User} label="Author" value={document.author || "Unknown"} />
                <MetadataItem icon={Folder} label="Collection" value={document.collection} />
                <MetadataItem icon={Calendar} label="Upload Date" value={format(document.uploadedAt, "MMMM d, yyyy")} />
                <MetadataItem icon={Clock} label="Upload Time" value={format(document.uploadedAt, "h:mm a")} />
                <MetadataItem icon={HardDrive} label="File Size" value={document.size} />
                <MetadataItem icon={Tag} label="File Type" value={config.label} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Download Document
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Document
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <PenTool className="w-4 h-4 mr-2" />
                  Add Signature
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Metadata
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DocumentDetail;
