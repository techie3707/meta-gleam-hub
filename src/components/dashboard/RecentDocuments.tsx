import { FileText, Image, FileSpreadsheet, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Document {
  id: string;
  title: string;
  type: "pdf" | "doc" | "xls" | "image" | "other";
  collection: string;
  uploadedAt: Date;
  size: string;
}

const mockDocuments: Document[] = [
  {
    id: "1",
    title: "Annual Report 2024.pdf",
    type: "pdf",
    collection: "Financial Reports",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 30),
    size: "2.4 MB",
  },
  {
    id: "2",
    title: "Project Proposal - Phase 2.docx",
    type: "doc",
    collection: "Projects",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    size: "856 KB",
  },
  {
    id: "3",
    title: "Budget Analysis Q4.xlsx",
    type: "xls",
    collection: "Financial Reports",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    size: "1.2 MB",
  },
  {
    id: "4",
    title: "Team Photo - Offsite 2024.jpg",
    type: "image",
    collection: "Media Library",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    size: "4.8 MB",
  },
  {
    id: "5",
    title: "Technical Specifications v3.pdf",
    type: "pdf",
    collection: "Technical Docs",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    size: "3.1 MB",
  },
];

const typeConfig = {
  pdf: { icon: FileText, color: "text-document-pdf", bgColor: "bg-document-pdf/10" },
  doc: { icon: FileText, color: "text-document-word", bgColor: "bg-document-word/10" },
  xls: { icon: FileSpreadsheet, color: "text-document-excel", bgColor: "bg-document-excel/10" },
  image: { icon: Image, color: "text-document-image", bgColor: "bg-document-image/10" },
  other: { icon: File, color: "text-document-other", bgColor: "bg-document-other/10" },
};

export function RecentDocuments() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Documents</h3>
      </div>
      <div className="divide-y divide-border">
        {mockDocuments.map((doc, index) => {
          const config = typeConfig[doc.type];
          const Icon = config.icon;
          return (
            <div
              key={doc.id}
              className="px-5 py-3.5 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn("p-2 rounded-lg", config.bgColor)}>
                <Icon className={cn("w-4 h-4", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground">{doc.collection}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{doc.size}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(doc.uploadedAt, { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
