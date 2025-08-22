import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  Download, 
  Upload,
  FileText, 
  FileSpreadsheet, 
  Presentation,
  Calendar,
  Code,
  Building2,
  Loader2
} from "lucide-react";

interface DocumentEditorProps {
  documentId: string;
}

interface DocumentContent {
  title: string;
  body: string;
  cells?: { [key: string]: string }; // For Excel
  slides?: Array<{ title: string; content: string }>; // For PowerPoint
}

export function DocumentEditor({ documentId }: DocumentEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState<DocumentContent>({
    title: "",
    body: "",
    cells: {},
    slides: [{ title: "", content: "" }]
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Fetch document data
  const { data: document, isLoading } = useQuery<Document>({
    queryKey: ["/api/documents", documentId],
  });

  // Auto-save mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async (updatedContent: DocumentContent) => {
      const response = await apiRequest("PUT", `/api/documents/${documentId}/content`, {
        content: updatedContent
      });
      return await response.json();
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast({
        title: "Document saved",
        description: "Your changes have been saved automatically",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export to PDF mutation
  const exportToPdfMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/export-pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document?.name || 'document'}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "PDF exported",
        description: "Your document has been exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update document file mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("keepSameId", "true");
      
      const response = await fetch(`/api/documents/${documentId}/update`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Update failed");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId] });
      setShowUpdateModal(false);
      toast({
        title: "Document updated",
        description: "File has been updated successfully with the same document ID",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed", 
        description: error.message || "Could not update document file",
        variant: "destructive",
      });
    },
  });

  // Load initial content
  useEffect(() => {
    if (document?.content) {
      setContent(document.content as DocumentContent);
    }
  }, [document]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        saveDocumentMutation.mutate(content);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, content, saveDocumentMutation]);

  const handleContentChange = (field: keyof DocumentContent, value: any) => {
    setContent(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    saveDocumentMutation.mutate(content);
  };

  const handleExport = () => {
    exportToPdfMutation.mutate();
  };

  const handleFileUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateDocumentMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    );
  }

  const getFileIcon = () => {
    switch (document.fileType) {
      case "excel": return <FileSpreadsheet className="h-5 w-5" />;
      case "powerpoint": return <Presentation className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const renderEditor = () => {
    switch (document.fileType) {
      case "word":
        return (
          <div className="space-y-4">
            <input
              type="text"
              value={content.title}
              onChange={(e) => handleContentChange("title", e.target.value)}
              className="w-full text-2xl font-bold border-none outline-none bg-transparent"
              placeholder="Document Title"
              data-testid="input-document-title"
            />
            <Separator />
            <textarea
              value={content.body}
              onChange={(e) => handleContentChange("body", e.target.value)}
              className="w-full h-96 p-4 border rounded-lg resize-none outline-none"
              placeholder="Start writing your document content..."
              data-testid="textarea-document-body"
            />
          </div>
        );

      case "excel":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Spreadsheet Editor</h3>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 20 }, (_, i) => (
                <input
                  key={i}
                  type="text"
                  value={content.cells?.[`cell_${i}`] || ""}
                  onChange={(e) => 
                    handleContentChange("cells", {
                      ...content.cells,
                      [`cell_${i}`]: e.target.value
                    })
                  }
                  className="p-2 border rounded text-sm"
                  placeholder={`Cell ${String.fromCharCode(65 + (i % 4))}${Math.floor(i / 4) + 1}`}
                  data-testid={`input-cell-${i}`}
                />
              ))}
            </div>
          </div>
        );

      case "powerpoint":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Presentation Editor</h3>
            {content.slides?.map((slide, index) => (
              <Card key={index} className="p-4">
                <CardHeader>
                  <CardTitle className="text-lg">Slide {index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) => {
                      const newSlides = [...(content.slides || [])];
                      newSlides[index] = { ...slide, title: e.target.value };
                      handleContentChange("slides", newSlides);
                    }}
                    className="w-full text-lg font-semibold border-none outline-none bg-transparent"
                    placeholder="Slide Title"
                    data-testid={`input-slide-title-${index}`}
                  />
                  <textarea
                    value={slide.content}
                    onChange={(e) => {
                      const newSlides = [...(content.slides || [])];
                      newSlides[index] = { ...slide, content: e.target.value };
                      handleContentChange("slides", newSlides);
                    }}
                    className="w-full h-32 p-2 border rounded resize-none"
                    placeholder="Slide Content"
                    data-testid={`textarea-slide-content-${index}`}
                  />
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newSlides = [...(content.slides || []), { title: "", content: "" }];
                handleContentChange("slides", newSlides);
              }}
              data-testid="button-add-slide"
            >
              Add Slide
            </Button>
          </div>
        );

      default:
        return <p>Unsupported file type for editing</p>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Document Header */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon()}
              <div>
                <h1 className="text-2xl font-bold">{document.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>ZEOLF Technology</span>
                  <Separator orientation="vertical" className="h-4" />
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <Code className="h-4 w-4" />
                  <span>{document.documentCode}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{document.category}</Badge>
              <Badge variant="secondary">{document.fileType.toUpperCase()}</Badge>
            </div>
          </div>
        </CardHeader>
        
        {/* Company Header */}
        <CardContent className="pt-0">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg text-blue-700 dark:text-blue-300">ZEOLF TECHNOLOGY</h2>
                <p className="text-sm text-blue-600 dark:text-blue-400">Document Management System</p>
              </div>
              <div className="text-right text-sm text-blue-600 dark:text-blue-400">
                <p>Created: {new Date(document.createdAt).toLocaleDateString()}</p>
                <p>Code: {document.documentCode}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="text-orange-600">
              Unsaved Changes
            </Badge>
          )}
          {saveDocumentMutation.isPending && (
            <Badge variant="secondary" className="text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Saving...
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saveDocumentMutation.isPending || !hasUnsavedChanges}
            data-testid="button-save-document"
          >
            {saveDocumentMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
              disabled={updateDocumentMutation.isPending}
              data-testid="button-update-document"
              onClick={() => window.document.getElementById('file-update-input')?.click()}
            >
              {updateDocumentMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Update
            </Button>
            <input
              id="file-update-input"
              type="file"
              onChange={handleFileUpdate}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              data-testid="input-file-update"
            />
          </div>
          
          <Button
            onClick={handleExport}
            disabled={exportToPdfMutation.isPending}
            data-testid="button-export-pdf"
          >
            {exportToPdfMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Document Editor */}
      <Card>
        <CardContent className="p-6">
          {renderEditor()}
        </CardContent>
      </Card>

      {/* Document Footer Preview */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border-t-2 border-gray-300">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-medium">ZEOLF Technology - {document.category.replace('_', ' ').toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p>Document Code: {document.documentCode}</p>
                <p>Generated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}