import { useState } from "react";
import { Grid, List, Filter, SortAsc, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { searchObjects } from "@/api/searchApi";

const Documents = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["documents", searchQuery],
    queryFn: () => searchObjects({
      query: searchQuery || "*",
      page: 0,
      size: 100,
      embed: ["thumbnail", "accessStatus"]
    })
  });

  const documents = searchResults?.searchResult?.objects || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">All Documents</h1>
            <p className="text-muted-foreground mt-1">
              Browse and manage all documents in the repository
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <SortAsc className="w-4 h-4" />
            </Button>
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-none",
                  viewMode === "grid" && "bg-muted"
                )}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-none",
                  viewMode === "list" && "bg-muted"
                )}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="animate-slide-up">
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md bg-card border-border"
          />
        </div>

        {/* Documents */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No documents found</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {documents.map((obj, index) => {
              const item = obj.indexableObject;
              if (!item) return null;
              
              const doc = {
                id: item.id,
                title: item.metadata?.['dc.title']?.[0]?.value || item.name || 'Untitled',
                type: 'pdf' as const,
                collection: item.metadata?.['dc.relation.ispartof']?.[0]?.value || 'Unknown',
                uploadedAt: item.lastModified ? new Date(item.lastModified) : new Date(),
                size: 'Unknown',
                author: item.metadata?.['dc.contributor.author']?.[0]?.value || 'Unknown',
                description: item.metadata?.['dc.description.abstract']?.[0]?.value || '',
              };
              
              return (
                <div
                  key={doc.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-slide-up"
                >
                  <DocumentCard document={doc} variant="grid" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((obj, index) => {
              const item = obj.indexableObject;
              if (!item) return null;
              
              const doc = {
                id: item.id,
                title: item.metadata?.['dc.title']?.[0]?.value || item.name || 'Untitled',
                type: 'pdf' as const,
                collection: item.metadata?.['dc.relation.ispartof']?.[0]?.value || 'Unknown',
                uploadedAt: item.lastModified ? new Date(item.lastModified) : new Date(),
                size: 'Unknown',
                author: item.metadata?.['dc.contributor.author']?.[0]?.value || 'Unknown',
                description: item.metadata?.['dc.description.abstract']?.[0]?.value || '',
              };
              
              return (
                <div
                  key={doc.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-slide-up"
                >
                  <DocumentCard document={doc} variant="list" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Documents;
