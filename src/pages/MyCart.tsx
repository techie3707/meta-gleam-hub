import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Download,
  Trash2,
  ShoppingCart,
  Loader2,
  ArrowUpDown,
  AlertTriangle,
} from "lucide-react";
import {
  removeFromCart,
  clearUserCart,
  CartItemInfo,
  parseCartItem,
} from "@/api/cartApi";
import { downloadPDFWithWatermark } from "@/api/bitstreamApi";
import { getUserById } from "@/api/userApi";
import { siteConfig } from "@/config/siteConfig";

type SortKey = "name" | "date" | null;
type SortConfig = { key: SortKey; direction: "asc" | "desc" };

const MyCart = () => {
  const [cartItems, setCartItems] = useState<CartItemInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "desc",
  });
  const [watermarkSelections, setWatermarkSelections] = useState<{
    [key: string]: boolean;
  }>({});
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { userId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchUserCart();
    } else {
      toast({
        title: "Authentication Required",
        description: "Please log in to view your cart",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [userId]);

  /**
   * Fetch user's cart from backend
   */
  const fetchUserCart = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const user = await getUserById(userId);
      const rawValues: string[] = (user?.metadata?.["eperson.cart"] ?? []).map(
        (e: any) => e.value
      );

      // Fetch bitstream details for each cart item
      const items: CartItemInfo[] = await Promise.all(
        rawValues.map(async (raw) => {
          const parsed = parseCartItem(raw);
          if (!parsed) return null;

          let name = "Unknown";

          if (parsed.bitstreamId) {
            try {
              const authToken = localStorage.getItem(
                siteConfig.auth.tokenKey
              ) || "";
              const resp = await fetch(
                `${siteConfig.apiEndpoint}/api/core/bitstreams/${parsed.bitstreamId}`,
                {
                  headers: {
                    Authorization: `Bearer ${authToken}`,
                  },
                }
              );

              if (resp.ok) {
                const data = await resp.json();
                name =
                  data.metadata?.["dc.title"]?.[0]?.value || data.name || name;
              }
            } catch (err) {
              console.error(
                `Failed to fetch bitstream ${parsed.bitstreamId}:`,
                err
              );
            }
          }

          return { ...parsed, name } as CartItemInfo;
        })
      );

      const validItems = items.filter((item) => item !== null);
      setCartItems(validItems);

      // Initialize watermark selections
      const initialSelections: { [key: string]: boolean } = {};
      validItems.forEach((item) => {
        initialSelections[item.fullValue] = false;
      });
      setWatermarkSelections(initialSelections);
    } catch (err) {
      console.error("Failed to load cart", err);
      toast({
        title: "Error",
        description: "Failed to load cart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download PDF with optional watermark
   */
  const handleDownload = async (item: CartItemInfo) => {
    try {
      setDownloading((prev) => new Set([...prev, item.fullValue]));

      await downloadPDFWithWatermark(
        item.bitstreamId,
        item.name,
        item.itemId,
        item.pages,
        watermarkSelections[item.fullValue] || false
      );

      toast({
        title: "Success",
        description: `${item.name} downloaded successfully!`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading((prev) => {
        const updated = new Set(prev);
        updated.delete(item.fullValue);
        return updated;
      });
    }
  };

  /**
   * Remove item from cart
   */
  const handleRemoveItem = async (cartItemValue: string) => {
    if (!userId) return;

    try {
      await removeFromCart(userId, cartItemValue);
      setCartItems((prev) =>
        prev.filter((item) => item.fullValue !== cartItemValue)
      );
      setWatermarkSelections((prev) => {
        const updated = { ...prev };
        delete updated[cartItemValue];
        return updated;
      });

      toast({
        title: "Success",
        description: "Item removed from cart",
      });
    } catch (error) {
      console.error("Failed to remove item", error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    }
  };

  /**
   * Clear entire cart
   */
  const handleClearCart = async () => {
    if (!userId) return;

    try {
      await clearUserCart(userId);
      setCartItems([]);
      setWatermarkSelections({});
      setShowClearDialog(false);

      toast({
        title: "Success",
        description: "Cart cleared successfully",
      });
    } catch (error) {
      console.error("Failed to clear cart", error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    }
  };

  /**
   * Sort items
   */
  const handleSort = (key: SortKey) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const sortedItems = [...cartItems].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal)
      return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal)
      return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const getSortSymbol = (key: SortKey) =>
    sortConfig.key === key ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : "";

  const SortHeader = ({
    label,
    sortKey,
  }: {
    label: string;
    sortKey: SortKey;
  }) => (
    <TableHead
      onClick={() => handleSort(sortKey)}
      className="cursor-pointer hover:bg-muted"
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {sortKey && <ArrowUpDown className="h-4 w-4" />}
        <span className="text-xs">{getSortSymbol(sortKey)}</span>
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">My Cart</h1>
            <p className="text-muted-foreground">
              Manage your saved documents and download them with watermarking
            </p>
          </div>
          {cartItems.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>

        {/* Empty State */}
        {cartItems.length === 0 ? (
          <Card className="border-dashed">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Cart is empty</h2>
              <p className="text-muted-foreground mb-6 text-center">
                You haven't added any documents to your cart yet.
                <br />
                Browse documents and click "Add to MyList" to get started.
              </p>
              <Button onClick={() => navigate("/search")}>
                Browse Documents
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Warning Info */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You can download individual pages or the entire document. Check
                the Watermark box to add a watermark before downloading.
              </AlertDescription>
            </Alert>

            {/* Cart Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">#</TableHead>
                      <SortHeader label="Document Name" sortKey="name" />
                      <SortHeader label="Date Added" sortKey="date" />
                      <TableHead>Pages</TableHead>
                      <TableHead>Watermark</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedItems.map((item, idx) => (
                      <TableRow key={item.fullValue} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.name || "-"}
                        </TableCell>
                        <TableCell>{item.date || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.pages ? `Pages: ${item.pages}` : "All pages"}
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={watermarkSelections[item.fullValue] || false}
                            onCheckedChange={(checked) =>
                              setWatermarkSelections((prev) => ({
                                ...prev,
                                [item.fullValue]: checked === true,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(item)}
                              disabled={downloading.has(item.fullValue)}
                            >
                              {downloading.has(item.fullValue) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveItem(item.fullValue)
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Stats */}
            <div className="text-sm text-muted-foreground">
              Total items in cart: <strong>{cartItems.length}</strong>
            </div>
          </>
        )}
      </div>

      {/* Clear Cart Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {cartItems.length} item(s) from your cart.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCart}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Cart
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default MyCart;
