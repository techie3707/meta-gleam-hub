import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Upload, 
  Search, 
  FileText, 
  DollarSign, 
  Calendar,
  Building2,
  MoreVertical,
  Eye,
  Download,
  Edit,
  Trash2,
  ScanLine,
  Receipt
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScannedBillUpload } from "@/components/billing/ScannedBillUpload";
import { InvoiceForm } from "@/components/billing/InvoiceForm";
import { InvoiceCard } from "@/components/billing/InvoiceCard";

const mockInvoices = [
  {
    id: "INV-001",
    vendor: "Tech Solutions Inc.",
    amount: 2450.00,
    date: "2024-01-15",
    dueDate: "2024-02-15",
    status: "paid",
    type: "scanned"
  },
  {
    id: "INV-002",
    vendor: "Office Supplies Co.",
    amount: 890.50,
    date: "2024-01-18",
    dueDate: "2024-02-18",
    status: "pending",
    type: "manual"
  },
  {
    id: "INV-003",
    vendor: "Cloud Services Ltd.",
    amount: 1200.00,
    date: "2024-01-20",
    dueDate: "2024-02-20",
    status: "overdue",
    type: "scanned"
  },
  {
    id: "INV-004",
    vendor: "Marketing Agency",
    amount: 5600.00,
    date: "2024-01-22",
    dueDate: "2024-02-22",
    status: "draft",
    type: "manual"
  }
];

const Billing = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);

  const filteredInvoices = mockInvoices.filter(invoice => {
    const matchesSearch = invoice.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invoice.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || invoice.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: mockInvoices.length,
    pending: mockInvoices.filter(i => i.status === "pending").length,
    paid: mockInvoices.filter(i => i.status === "paid").length,
    overdue: mockInvoices.filter(i => i.status === "overdue").length,
    totalAmount: mockInvoices.reduce((sum, i) => sum + i.amount, 0)
  };

  const handleScannedBill = (data: any) => {
    setScannedData(data);
    setIsUploadOpen(false);
    setIsCreateOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Billing & Invoices</h1>
            <p className="text-muted-foreground">Manage scanned bills and create invoices</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ScanLine className="h-4 w-4" />
                  Scan Bill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Scanned Bill</DialogTitle>
                </DialogHeader>
                <ScannedBillUpload onExtracted={handleScannedBill} />
              </DialogContent>
            </Dialog>
            
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) setScannedData(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {scannedData ? "Create Invoice from Scanned Bill" : "Create New Invoice"}
                  </DialogTitle>
                </DialogHeader>
                <InvoiceForm 
                  initialData={scannedData} 
                  onClose={() => {
                    setIsCreateOpen(false);
                    setScannedData(null);
                  }} 
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-semibold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <FileText className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-semibold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-xl font-semibold">{stats.paid}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Calendar className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-xl font-semibold">{stats.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-xl font-semibold">${stats.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Invoice List */}
        <div className="grid gap-4">
          {filteredInvoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
          {filteredInvoices.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No invoices found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Try adjusting your search" : "Get started by scanning a bill or creating a new invoice"}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
                    <ScanLine className="h-4 w-4 mr-2" />
                    Scan Bill
                  </Button>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Billing;
