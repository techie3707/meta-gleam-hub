import { useEffect, useState } from "react";
import { Folder, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCollections } from "@/api/collectionApi";
import { Skeleton } from "@/components/ui/skeleton";

interface Collection {
  uuid: string;
  name: string;
  itemCount: number;
  color: string;
}

const colors = [
  "bg-primary",
  "bg-document-word",
  "bg-document-excel",
  "bg-document-image",
  "bg-document-pdf",
];

export function CollectionOverview() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDocs, setTotalDocs] = useState(0);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const response = await fetchCollections(0, 5);
      
      const collectionsData = response.collections.map((col, index) => ({
        uuid: col.uuid,
        name: col.name,
        itemCount: 0, // DSpace collections don't return item count directly
        color: colors[index % colors.length],
      }));
      
      setCollections(collectionsData);
      setTotalDocs(response.page.totalElements);
    } catch (error) {
      console.error("Load collections error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Collections</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {collections.length} collections in repository
        </p>
      </div>
      <div className="p-5 space-y-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))
        ) : collections.length > 0 ? (
          collections.map((collection, index) => (
            <div
              key={collection.uuid}
              className="group cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => window.location.href = `/collections`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-sm", collection.color)} />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {collection.name}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", collection.color)}
                  style={{ width: `${(index + 1) * 15}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No collections found
          </div>
        )}
      </div>
    </div>
  );
}
