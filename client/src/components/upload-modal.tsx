import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CloudUpload, X, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { value: "press_releases", label: "Press Releases" },
  { value: "memos", label: "Memos" },
  { value: "internal_letters", label: "Internal Letters" },
  { value: "contracts", label: "Contracts" },
  { value: "follow_ups", label: "Follow-ups" },
];

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [customName, setCustomName] = useState("");
  const [addHeader, setAddHeader] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload successful",
        description: "Document has been uploaded successfully",
      });
      
      // Reset form
      setFile(null);
      setCategory("");
      setCustomName("");
      setAddHeader(true);
      
      // Close modal
      onOpenChange(false);
      
      // Invalidate queries to refresh document list
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Only PDF, Word, Excel, and PowerPoint files are allowed",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (50MB limit)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 50MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
      if (!customName) {
        setCustomName(selectedFile.name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !category) {
      toast({
        title: "Missing information",
        description: "Please select a file and category",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (customName) {
      formData.append('name', customName);
    }
    formData.append('addHeader', addHeader.toString());

    uploadMutation.mutate(formData);
  };

  const handleClose = () => {
    if (!uploadMutation.isPending) {
      setFile(null);
      setCategory("");
      setCustomName("");
      setAddHeader(true);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" data-testid="upload-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Upload Document
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={uploadMutation.isPending}
              data-testid="button-close-upload"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Upload a file to add it to your document collection. Supported formats: PDF, Word, Excel, PowerPoint.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-zeolf-blue bg-zeolf-blue/5"
                : "border-gray-300 hover:border-zeolf-blue"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="upload-drop-zone"
          >
            <CloudUpload className="w-12 h-12 text-zeolf-text-secondary mx-auto mb-4" />
            
            {file ? (
              <div className="space-y-2">
                <p className="text-zeolf-text font-medium">{file.name}</p>
                <p className="text-sm text-zeolf-text-secondary">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
                  data-testid="button-remove-file"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-zeolf-text mb-2">Drag and drop files here</p>
                <p className="text-sm text-zeolf-text-secondary mb-4">or</p>
                <Button
                  type="button"
                  className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
                  onClick={() => document.getElementById('file-input')?.click()}
                  data-testid="button-browse-files"
                >
                  Browse Files
                </Button>
                <p className="text-xs text-zeolf-text-secondary">
                  Supports PDF, Word, Excel, PowerPoint (max 50MB)
                </p>
              </div>
            )}
            
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              data-testid="input-file"
            />
          </div>

          {/* Document Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="category" className="text-zeolf-text">Category *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="customName" className="text-zeolf-text">Document Name</Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Auto-generated based on content"
                data-testid="input-document-name"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoHeader"
                checked={addHeader}
                onCheckedChange={(checked) => setAddHeader(checked === true)}
                data-testid="checkbox-auto-header"
              />
              <Label htmlFor="autoHeader" className="text-sm text-zeolf-text">
                Add ZEOLF company header automatically
              </Label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploadMutation.isPending}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
              disabled={!file || !category || uploadMutation.isPending}
              data-testid="button-submit-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
