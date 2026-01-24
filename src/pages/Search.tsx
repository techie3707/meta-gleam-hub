import { useState } from "react";
import { Search as SearchIcon, Filter, Calendar, Folder, FileType, SortAsc } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentCard, type Document } from "@/components/documents/DocumentCard";
import { DocumentDetailDialog } from "@/components/documents/DocumentDetailDialog";

const mockResults = [
  {
    id: "1",
    title: "Annual Financial Report 2024",
    type: "pdf" as const,
    collection: "Financial Reports",
    uploadedAt: new Date(2024, 0, 15),
    size: "2.4 MB",
    author: "John Smith",
    description: "Comprehensive annual financial report covering all quarters of 2024 with detailed analysis and projections.",
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
  },
];

const searchFilters = [
  "All Documents",
  "PDF Files",
  "Word Documents",
  "Spreadsheets",
  "Images",
];

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Documents");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleDocumentClick = (doc: Document) => {
    setSelectedDocument(doc);
    setDetailDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Search Documents</h1>
          <p className="text-muted-foreground mt-1">
            Find documents across all collections with advanced filters
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-card rounded-xl border border-border p-6 animate-slide-up">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title, content, author, or metadata..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "border-primary text-primary" : ""}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button className="bg-primary hover:bg-primary/90">
                <SearchIcon className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {searchFilters.map((filter) => (
              <Badge
                key={filter}
                variant={activeFilter === filter ? "default" : "secondary"}
                className={`cursor-pointer transition-all ${
                  activeFilter === filter
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </Badge>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border animate-fade-in">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Collection
                </label>
                <Select>
                  <SelectTrigger>
                    <Folder className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="All Collections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Collections</SelectItem>
                    <SelectItem value="financial">Financial Reports</SelectItem>
                    <SelectItem value="technical">Technical Docs</SelectItem>
                    <SelectItem value="hr">HR Documents</SelectItem>
                    <SelectItem value="media">Media Library</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  File Type
                </label>
                <Select>
                  <SelectTrigger>
                    <FileType className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="doc">Word Document</SelectItem>
                    <SelectItem value="xls">Spreadsheet</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Date Range
                </label>
                <Select>
                  <SelectTrigger>
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Any Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Sort By
                </label>
                <Select>
                  <SelectTrigger>
                    <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Relevance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="size">File Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{mockResults.length}</span> results
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {mockResults.map((doc, index) => (
              <div key={doc.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-slide-up">
                <DocumentCard document={doc} variant="list" onClick={() => handleDocumentClick(doc)} />
              </div>
            ))}
          </div>
        </div>

        <DocumentDetailDialog
          document={selectedDocument}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      </div>
    </AppLayout>
  );
};

export default Search;
