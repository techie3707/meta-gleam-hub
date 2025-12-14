import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Eye, 
  Download, 
  Edit, 
  Trash2, 
  Building2, 
  Calendar,
  ScanLine,
  FileText
} from "lucide-react";

interface Invoice {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  dueDate: string;
  status: string;
  type: string;
}

interface InvoiceCardProps {
  invoice: Invoice;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Paid", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  overdue: { label: "Overdue", variant: "destructive" },
  draft: { label: "Draft", variant: "outline" }
};

export const InvoiceCard = ({ invoice }: InvoiceCardProps) => {
  const status = statusConfig[invoice.status] || statusConfig.pending;

  return (
    <Card className="bg-card border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-muted">
            {invoice.type === "scanned" ? (
              <ScanLine className="h-5 w-5 text-primary" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-muted-foreground">{invoice.id}</span>
              <Badge variant={status.variant} className="text-xs">
                {status.label}
              </Badge>
              {invoice.type === "scanned" && (
                <Badge variant="outline" className="text-xs">
                  Scanned
                </Badge>
              )}
            </div>
            <h3 className="font-medium text-foreground truncate">{invoice.vendor}</h3>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(invoice.date).toLocaleDateString()}</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Due</p>
              <p className="text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">
              ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};
