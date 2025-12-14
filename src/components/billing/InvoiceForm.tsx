import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvoiceFormProps {
  initialData?: {
    vendor: string;
    invoiceNumber: string;
    date: string;
    dueDate: string;
    amount: number;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    taxAmount: number;
    subtotal: number;
  } | null;
  onClose: () => void;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export const InvoiceForm = ({ initialData, onClose }: InvoiceFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    vendor: "",
    invoiceNumber: "",
    date: new Date().toISOString().split('T')[0],
    dueDate: "",
    notes: "",
    status: "draft" as "draft" | "pending" | "sent"
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0 }
  ]);

  const [taxRate, setTaxRate] = useState(10);

  useEffect(() => {
    if (initialData) {
      setFormData({
        vendor: initialData.vendor,
        invoiceNumber: initialData.invoiceNumber,
        date: initialData.date,
        dueDate: initialData.dueDate,
        notes: "",
        status: "draft"
      });
      setLineItems(initialData.items.map((item, idx) => ({
        id: String(idx + 1),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })));
    }
  }, [initialData]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0 }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = (asDraft: boolean) => {
    if (!formData.vendor || !formData.invoiceNumber) {
      toast({
        title: "Missing required fields",
        description: "Please fill in vendor and invoice number",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: asDraft ? "Invoice saved as draft" : "Invoice created",
      description: `Invoice ${formData.invoiceNumber} has been ${asDraft ? 'saved' : 'created'} successfully`
    });
    onClose();
  };

  return (
    <div className="space-y-6">
      {initialData && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm text-primary">
              ✓ Data extracted from scanned bill. Review and edit as needed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor / Company *</Label>
          <Input
            id="vendor"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            placeholder="Enter vendor name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice Number *</Label>
          <Input
            id="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
            placeholder="INV-001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Invoice Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Line Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
        
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <Card key={item.id} className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 md:col-span-5 space-y-1">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Unit Price</Label>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Total</Label>}
                    <div className="h-10 px-3 flex items-center bg-muted rounded-md text-foreground">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Totals */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tax</span>
              <Select value={String(taxRate)} onValueChange={(v) => setTaxRate(parseInt(v))}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="font-medium">${taxAmount.toFixed(2)}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="font-semibold text-foreground">Total</span>
            <span className="text-xl font-bold text-primary">${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes or payment instructions..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button variant="outline" onClick={() => handleSubmit(true)} className="flex-1 gap-2">
          <Save className="h-4 w-4" />
          Save Draft
        </Button>
        <Button onClick={() => handleSubmit(false)} className="flex-1 gap-2">
          <Send className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>
    </div>
  );
};
