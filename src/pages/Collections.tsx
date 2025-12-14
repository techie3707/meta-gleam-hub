import { useState } from "react";
import { Folder, Plus, MoreVertical, FileText, Edit, Trash2, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  subCollections: number;
  color: string;
  lastUpdated: string;
}

const mockCollections: Collection[] = [
  {
    id: "1",
    name: "Financial Reports",
    description: "Annual reports, quarterly statements, and financial analyses",
    documentCount: 234,
    subCollections: 5,
    color: "bg-primary",
    lastUpdated: "2 hours ago",
  },
  {
    id: "2",
    name: "Technical Documentation",
    description: "System architecture, API docs, and technical specifications",
    documentCount: 189,
    subCollections: 8,
    color: "bg-document-word",
    lastUpdated: "1 day ago",
  },
  {
    id: "3",
    name: "HR Documents",
    description: "Policies, employee handbooks, and onboarding materials",
    documentCount: 156,
    subCollections: 4,
    color: "bg-document-excel",
    lastUpdated: "3 days ago",
  },
  {
    id: "4",
    name: "Media Library",
    description: "Images, videos, and marketing materials",
    documentCount: 98,
    subCollections: 3,
    color: "bg-document-image",
    lastUpdated: "5 days ago",
  },
  {
    id: "5",
    name: "Legal",
    description: "Contracts, agreements, and compliance documents",
    documentCount: 67,
    subCollections: 2,
    color: "bg-document-pdf",
    lastUpdated: "1 week ago",
  },
  {
    id: "6",
    name: "Research & Development",
    description: "Research papers, experiment results, and innovation docs",
    documentCount: 45,
    subCollections: 6,
    color: "bg-purple-500",
    lastUpdated: "2 weeks ago",
  },
];

const Collections = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCollections = mockCollections.filter((col) =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Collections</h1>
            <p className="text-muted-foreground mt-1">
              Organize and browse document collections
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        </div>

        {/* Search */}
        <div className="animate-slide-up">
          <Input
            type="text"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md bg-card border-border"
          />
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCollections.map((collection, index) => (
            <div
              key={collection.id}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 cursor-pointer group animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-2.5 rounded-lg", collection.color.replace("bg-", "bg-") + "/10")}>
                  <Folder className={cn("w-6 h-6", collection.color.replace("bg-", "text-"))} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {collection.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {collection.description}
              </p>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{collection.documentCount} docs</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Folder className="w-3.5 h-3.5" />
                  <span>{collection.subCollections} sub</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Updated {collection.lastUpdated}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Collections;
