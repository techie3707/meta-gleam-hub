import { Folder, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  name: string;
  documentCount: number;
  color: string;
  growth: number;
}

const mockCollections: Collection[] = [
  { id: "1", name: "Financial Reports", documentCount: 234, color: "bg-primary", growth: 12 },
  { id: "2", name: "Technical Docs", documentCount: 189, color: "bg-document-word", growth: 8 },
  { id: "3", name: "HR Documents", documentCount: 156, color: "bg-document-excel", growth: 5 },
  { id: "4", name: "Media Library", documentCount: 98, color: "bg-document-image", growth: 23 },
  { id: "5", name: "Legal", documentCount: 67, color: "bg-document-pdf", growth: 3 },
];

export function CollectionOverview() {
  const totalDocs = mockCollections.reduce((acc, col) => acc + col.documentCount, 0);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Collections</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalDocs.toLocaleString()} documents across {mockCollections.length} collections
        </p>
      </div>
      <div className="p-5 space-y-4">
        {mockCollections.map((collection, index) => {
          const percentage = (collection.documentCount / totalDocs) * 100;
          return (
            <div
              key={collection.id}
              className="group cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-sm", collection.color)} />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {collection.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{collection.documentCount} docs</span>
                  <span className="flex items-center gap-0.5 text-success">
                    <TrendingUp className="w-3 h-3" />
                    {collection.growth}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", collection.color)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
