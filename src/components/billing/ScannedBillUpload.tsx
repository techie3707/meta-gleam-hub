import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, Loader2, X, ScanLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScannedBillUploadProps {
  onExtracted: (data: ExtractedBillData) => void;
}

interface ExtractedBillData {
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
}

export const ScannedBillUpload = ({ onExtracted }: ScannedBillUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (JPG, PNG, WebP)",
        variant: "destructive"
      });
      return;
    }
    setFile(file);
  };

  const processFile = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProgress(0);

    // Simulate OCR processing with progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate extracted data (in real app, this would use OCR API)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    clearInterval(progressInterval);
    setProgress(100);

    const extractedData: ExtractedBillData = {
      vendor: "Tech Solutions Inc.",
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: 2450.00,
      items: [
        { description: "Software License", quantity: 5, unitPrice: 400.00, total: 2000.00 },
        { description: "Support Package", quantity: 1, unitPrice: 250.00, total: 250.00 }
      ],
      taxAmount: 200.00,
      subtotal: 2250.00
    };

    toast({
      title: "Bill scanned successfully",
      description: "Data has been extracted and is ready for review"
    });

    setTimeout(() => {
      setIsProcessing(false);
      onExtracted(extractedData);
    }, 500);
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }
          `}
          onClick={() => document.getElementById('bill-upload')?.click()}
        >
          <input
            id="bill-upload"
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-primary/10">
              <ScanLine className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Drop your scanned bill here</p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse (PDF, JPG, PNG, WebP)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <Card className="bg-muted/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {isProcessing && (
                  <div className="mt-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress < 100 ? 'Extracting data...' : 'Complete!'}
                    </p>
                  </div>
                )}
              </div>
              {!isProcessing && (
                <Button variant="ghost" size="icon" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              {isProcessing && progress === 100 && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {file && !isProcessing && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={removeFile} className="flex-1">
            Cancel
          </Button>
          <Button onClick={processFile} className="flex-1 gap-2">
            <ScanLine className="h-4 w-4" />
            Extract Data
          </Button>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing your bill...</span>
        </div>
      )}
    </div>
  );
};
