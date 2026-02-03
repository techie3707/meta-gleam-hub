import { useEffect, useState } from "react";
import { FileText, Image, FileSpreadsheet, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fetchRecentItems, SearchObject } from "@/api/discoveryApi";
import { Skeleton } from "@/components/ui/skeleton";

const typeConfig = {
  pdf: { icon: FileText, color: "text-document-pdf", bgColor: "bg-document-pdf/10" },
  doc: { icon: FileText, color: "text-document-word", bgColor: "bg-document-word/10" },
  xls: { icon: FileSpreadsheet, color: "text-document-excel", bgColor: "bg-document-excel/10" },
  image: { icon: Image, color: "text-document-image", bgColor: "bg-document-image/10" },
  other: { icon: File, color: "text-document-other", bgColor: "bg-document-other/10" },
};

export function RecentDocuments() {
  const [documents, setDocuments] = useState<SearchObject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentDocuments();
  }, []);

  const loadRecentDocuments = async () => {
    try {
      setLoading(true);
      const items = await fetchRecentItems(5);
      setDocuments(items);
    } catch (error) {
      console.error("Load recent documents error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDocType = (name: string): keyof typeof typeConfig => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['xls', 'xlsx'].includes(ext)) return 'xls';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    return 'other';
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Documents</h3>
      </div>
      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))
        ) : documents.length > 0 ? (
          documents.map((doc, index) => {
            // Add null safety checks
            if (!doc?.indexableObject) return null;
            
            const docType = getDocType(doc.indexableObject.name || 'unknown');
            const config = typeConfig[docType];
            const Icon = config.icon;
            const dateStr = doc.indexableObject.metadata?.['dc.date.accessioned']?.[0]?.value;
            const dateAdded = dateStr ? new Date(dateStr) : new Date();
            
            return (
              <div
                key={doc.indexableObject.uuid}
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => window.location.href = `/documents/${doc.indexableObject.uuid}`}
              >
                <div className={cn("p-2 rounded-lg", config.bgColor)}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {doc.indexableObject.name || 'Untitled Item'}
                  </p>
                  <p className="text-xs text-muted-foreground">Item</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(dateAdded, { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-8 text-center text-muted-foreground">
            No recent documents found
          </div>
        )}
      </div>
    </div>
  );
}
