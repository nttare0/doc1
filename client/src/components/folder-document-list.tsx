import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  FileText, 
  Download, 
  Eye, 
  Upload, 
  MoreVertical,
  Calendar,
  User,
  Code,
  Trash2,
  Edit3,
  Share2,
  Clock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Document } from "@shared/schema";

interface FolderDocumentListProps {
  folderId: string;
}

const getFileTypeIcon = (fileType: string) => {
  switch (fileType) {
    case 'pdf':
      return '📄';
    case 'word':
      return '📝';
    case 'excel':
      return '📊';
    case 'powerpoint':
      return '📈';
    default:
      return '📄';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'press_release':
      return 'bg-blue-100 text-blue-800';
    case 'memo':
      return 'bg-green-100 text-green-800';
    case 'internal_letter':
      return 'bg-yellow-100 text-yellow-800';
    case 'external_letter':
      return 'bg-purple-100 text-purple-800';
    case 'contract':
      return 'bg-red-100 text-red-800';
    case 'follow_up':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function FolderDocumentList({ folderId }: FolderDocumentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents for this folder
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/folders", folderId, "documents"],
    queryFn: async ({ queryKey }) => {
      const url = queryKey.join("/");
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
  });

  // Download document mutation
  const downloadMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}/download`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Download failed");
      return response.blob();
    },
    onSuccess: (blob, documentId) => {
      const document = documents.find(d => d.id === documentId);
      if (document) {
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        // Use proper filename with document name and file extension
        a.download = `${document.name}.${document.fileType}`;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
        
        toast({
          title: "Download started",
          description: `${document.name} is being downloaded for offline editing`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Download failed",
        description: "Unable to download the document",
        variant: "destructive",
      });
    },
  });

  // Download PDF mutation
  const downloadPdfMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}/download/pdf`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("PDF download failed");
      return response.blob();
    },
    onSuccess: (blob, documentId) => {
      const document = documents.find(d => d.id === documentId);
      if (document) {
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${document.name}.pdf`;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
        
        toast({
          title: "PDF downloaded",
          description: `${document.name} PDF has been downloaded`,
        });
      }
    },
    onError: () => {
      toast({
        title: "PDF download failed",
        description: "Unable to generate or download PDF version",
        variant: "destructive",
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ documentId, file }: { documentId: string; file: File }) => {
      console.log('Starting document update for ID:', documentId, 'with file:', file.name);
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/documents/${documentId}/update`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || "Update failed");
      }
      
      return await response.json();
    },
    onSuccess: (data, { documentId }) => {
      console.log('Document update successful:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/folders", folderId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId] });
      toast({
        title: "Document updated",
        description: "File has been updated successfully with the same document ID",
      });
    },
    onError: (error: any) => {
      console.error('Document update error:', error);
      toast({
        title: "Update failed",
        description: error.message || "Please ensure you upload a valid document file",
        variant: "destructive",
      });
    },
  });

  // Handle file input change for document update
  const handleFileUpdate = (documentId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== FOLDER UPDATE BUTTON CLICKED ===');
    console.log('Document ID:', documentId);
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected for update:', file.name, 'Size:', file.size);
      updateDocumentMutation.mutate({ documentId, file });
      // Reset the input so the same file can be selected again if needed
      event.target.value = '';
    } else {
      console.log('No file selected for update');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <Card>
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No documents yet
        </h3>
        <p className="text-gray-600 mb-4">
          Create your first document in this folder to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <Card key={document.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-2xl">
                  {getFileTypeIcon(document.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold line-clamp-1">
                    {document.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getCategoryColor(document.category)}>
                      {document.category.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {document.documentCode && (
                      <Badge variant="outline" className="text-xs">
                        <Code className="w-3 h-3 mr-1" />
                        {document.documentCode}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Online
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>Created by {document.uploadedBy}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                </div>
                {document.updatedAt !== document.createdAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Modified {new Date(document.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Three Operation Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadMutation.mutate(document.id)}
                disabled={downloadMutation.isPending}
                className="flex items-center gap-2"
                data-testid={`button-view-${document.id}`}
              >
                <Eye className="w-4 h-4" />
                View (Download)
              </Button>
              
              <label className="relative cursor-pointer">
                <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2">
                  {updateDocumentMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Update
                </div>
                <input
                  type="file"
                  onChange={(e) => handleFileUpdate(document.id, e)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  data-testid={`input-file-update-${document.id}`}
                  disabled={updateDocumentMutation.isPending}
                />
              </label>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadPdfMutation.mutate(document.id)}
                disabled={downloadPdfMutation.isPending}
                className="flex items-center gap-2"
                data-testid={`button-download-pdf-${document.id}`}
              >
                <Download className="w-4 h-4" />
                PDF Only
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}