import { useState } from "react";
import { Grid, List, Filter, SortAsc } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { cn } from "@/lib/utils";

const mockDocuments = [
  {
    id: "1",
    title: "Annual Financial Report 2024",
    type: "pdf" as const,
    collection: "Financial Reports",
    uploadedAt: new Date(2024, 0, 15),
    size: "2.4 MB",
    author: "John Smith",
    description: "Comprehensive annual financial report",
  },
  {
    id: "2",
    title: "Project Alpha - Technical Specs",
    type: "doc" as const,
    collection: "Technical Docs",
    uploadedAt: new Date(2024, 1, 20),
    size: "1.8 MB",
    author: "Sarah Johnson",
    description: "Technical specifications for Project Alpha",
  },
  {
    id: "3",
    title: "Q3 Budget Analysis",
    type: "xls" as const,
    collection: "Financial Reports",
    uploadedAt: new Date(2024, 2, 10),
    size: "956 KB",
    author: "Mike Davis",
    description: "Detailed Q3 budget analysis",
  },
  {
    id: "4",
    title: "Marketing Campaign Assets",
    type: "image" as const,
    collection: "Media Library",
    uploadedAt: new Date(2024, 3, 5),
    size: "15.2 MB",
    author: "Emily Chen",
    description: "Marketing campaign visual assets",
  },
  {
    id: "5",
    title: "Employee Handbook 2024",
    type: "pdf" as const,
    collection: "HR Documents",
    uploadedAt: new Date(2024, 0, 1),
    size: "3.2 MB",
    author: "HR Department",
    description: "Updated employee handbook",
  },
  {
    id: "6",
    title: "API Documentation v2.0",
    type: "doc" as const,
    collection: "Technical Docs",
    uploadedAt: new Date(2024, 4, 12),
    size: "2.1 MB",
    author: "Dev Team",
    description: "Complete API documentation",
  },
  {
    id: "7",
    title: "Sales Report Q1 2024",
    type: "xls" as const,
    collection: "Financial Reports",
    uploadedAt: new Date(2024, 3, 1),
    size: "1.4 MB",
    author: "Sales Team",
    description: "Q1 sales performance report",
  },
  {
    id: "8",
    title: "Brand Guidelines",
    type: "pdf" as const,
    collection: "Media Library",
    uploadedAt: new Date(2024, 2, 15),
    size: "8.5 MB",
    author: "Design Team",
    description: "Company brand guidelines",
  },
];

const Documents = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocuments = mockDocuments.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDocuments.map((doc, index) => (
              <div
                key={doc.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-slide-up"
              >
                <DocumentCard document={doc} variant="grid" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc, index) => (
              <div
                key={doc.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-slide-up"
              >
                <DocumentCard document={doc} variant="list" />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Documents;
