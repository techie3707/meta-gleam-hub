import { FileText, Image, FileSpreadsheet, File, MoreVertical, Download, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Document {
  id: string;
  title: string;
  type: "pdf" | "doc" | "xls" | "image" | "other";
  collection: string;
  uploadedAt: Date;
  size: string;
  author?: string;
  description?: string;
}

const typeConfig = {
  pdf: { icon: FileText, color: "text-document-pdf", bgColor: "bg-document-pdf/10", label: "PDF" },
  doc: { icon: FileText, color: "text-document-word", bgColor: "bg-document-word/10", label: "DOC" },
  xls: { icon: FileSpreadsheet, color: "text-document-excel", bgColor: "bg-document-excel/10", label: "XLS" },
  image: { icon: Image, color: "text-document-image", bgColor: "bg-document-image/10", label: "IMG" },
  other: { icon: File, color: "text-document-other", bgColor: "bg-document-other/10", label: "FILE" },
};

interface DocumentCardProps {
  document: Document;
  variant?: "grid" | "list";
}

export function DocumentCard({ document, variant = "grid" }: DocumentCardProps) {
  const navigate = useNavigate();
  const config = typeConfig[document.type];
  const Icon = config.icon;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click when clicking on dropdown menu
    if ((e.target as HTMLElement).closest('[data-radix-dropdown-menu-trigger]')) {
      return;
    }
    navigate(`/documents/${document.id}`);
  };

  const handleViewDetails = () => {
    navigate(`/documents/${document.id}`);
  };

  if (variant === "list") {
    return (
      <div
        className="document-card flex items-start gap-4 hover:shadow-card-hover cursor-pointer"
        onClick={handleCardClick}
      >
        <div className={cn("p-3 rounded-lg flex-shrink-0", config.bgColor)}>
          <Icon className={cn("w-6 h-6", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                {document.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {document.description}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleViewDetails}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <Badge variant="secondary" className={cn("text-xs", config.bgColor, config.color)}>
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{document.collection}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{document.size}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {format(document.uploadedAt, "MMM d, yyyy")}
            </span>
            {document.author && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">by {document.author}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="document-card hover:shadow-card-hover group cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-lg", config.bgColor)}>
          <Icon className={cn("w-5 h-5", config.color)} />
        </div>
        <Badge variant="secondary" className={cn("text-xs", config.bgColor, config.color)}>
          {config.label}
        </Badge>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {document.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{document.collection}</p>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">{document.size}</span>
        <span className="text-xs text-muted-foreground">
          {format(document.uploadedAt, "MMM d")}
        </span>
      </div>
    </div>
  );
}
