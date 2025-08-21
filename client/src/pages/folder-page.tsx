import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Edit, 
  Eye, 
  Plus,
  Lock,
  Unlock,
  Search,
  Grid3X3,
  List,
  Bot
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { DocumentCreator } from "@/components/document-creator";
import { GrokAssistant } from "@/components/grok-assistant";
import { Link } from "wouter";
import type { Folder, Document } from "@shared/schema";

export default function FolderPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [securityCode, setSecurityCode] = useState("");
  const [isAccessVerified, setIsAccessVerified] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [showDocumentCreator, setShowDocumentCreator] = useState(false);
  const [showGrokAssistant, setShowGrokAssistant] = useState(false);

  // Fetch folder details
  const { data: folder, isLoading: folderLoading } = useQuery<Folder>({
    queryKey: ["/api/folders", folderId],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
    enabled: !!folderId,
  });

  // Fetch folder documents
  const { data: documents = [], isLoading: documentsLoading, refetch: refetchDocuments } = useQuery<Document[]>({
    queryKey: ["/api/folders", folderId, "documents"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
    enabled: !!folderId && isAccessVerified,
  });

  // Verify folder access
  const verifyAccessMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", `/api/folders/${folderId}/verify-access`, {
        securityCode: code,
      });
      return await response.json();
    },
    onSuccess: () => {
      setIsAccessVerified(true);
      setShowSecurityDialog(false);
      toast({
        title: "Access granted",
        description: "You can now view the folder contents.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Access denied",
        description: error.message || "Invalid security code.",
        variant: "destructive",
      });
    },
  });

  // Download document mutation
  const downloadDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}/download`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.headers.get("content-disposition")?.split("filename=")[1] || "document";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "The document is being downloaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Download failed",
        description: error.message || "Could not download document.",
        variant: "destructive",
      });
    },
  });

  // Download PDF mutation
  const downloadPDFMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}/download/pdf`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("PDF download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document-${documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "PDF download started",
        description: "The PDF is being downloaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "PDF download failed",
        description: error.message || "Could not download PDF.",
        variant: "destructive",
      });
    },
  });

  // Check access when folder is loaded
  useEffect(() => {
    if (folder) {
      if (!folder.hasSecurityCode) {
        setIsAccessVerified(true);
      } else {
        setShowSecurityDialog(true);
      }
    }
  }, [folder]);

  // Handle document actions
  const handleViewDocument = (document: Document) => {
    downloadDocumentMutation.mutate(document.id);
  };

  const handleUpdateDocument = (document: Document) => {
    // Create file input for update
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`/api/documents/${document.id}/update`, {
          method: "PUT",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) throw new Error("Update failed");

        toast({
          title: "Document updated",
          description: "The document has been updated successfully.",
        });
        
        refetchDocuments();
      } catch (error: any) {
        toast({
          title: "Update failed",
          description: error.message || "Could not update document.",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const handleDownloadPDF = (document: Document) => {
    downloadPDFMutation.mutate(document.id);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (folderLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zeolf-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading folder...</p>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Folder not found</h1>
          <p className="text-gray-600 mb-4">The folder you're looking for doesn't exist.</p>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              {folder.hasSecurityCode ? (
                <Lock className="w-6 h-6 text-yellow-500" />
              ) : (
                <Unlock className="w-6 h-6 text-green-500" />
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{folder.name}</h1>
                {folder.description && (
                  <p className="text-gray-600">{folder.description}</p>
                )}
              </div>
            </div>
          </div>
          
          {isAccessVerified && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowGrokAssistant(true)}
                variant="outline"
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
              >
                <Bot className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
              <Button
                onClick={() => setShowDocumentCreator(true)}
                className="bg-zeolf-primary hover:bg-zeolf-primary-dark"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Document
              </Button>
            </div>
          )}
        </div>

        {isAccessVerified ? (
          <>
            {/* Search and View Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-documents"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-grid-view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  data-testid="button-list-view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Documents */}
            {documentsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? "No documents found" : "No documents yet"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery 
                    ? "Try adjusting your search terms"
                    : "Create your first document to get started"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setShowDocumentCreator(true)}
                    className="bg-zeolf-primary hover:bg-zeolf-primary-dark"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Document
                  </Button>
                )}
              </div>
            ) : (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                : "space-y-3"
              }>
                {filteredDocuments.map((document) => (
                  <Card 
                    key={document.id}
                    className="hover:shadow-md transition-all duration-200 group"
                    data-testid={`document-card-${document.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-8 h-8 text-zeolf-primary" />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium line-clamp-1">
                              {document.name}
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-1">
                              {document.originalName}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {document.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>{document.fileType.toUpperCase()}</span>
                        <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Document Action Buttons */}
                      <div className="flex items-center justify-center gap-2">
                        {/* View Button (Auto-download for offline edit) */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDocument(document)}
                          title="View & Download for Offline Edit"
                          data-testid={`button-view-${document.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {/* Update Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateDocument(document)}
                          title="Update Document (Same File ID)"
                          data-testid={`button-update-${document.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {/* Download PDF Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(document)}
                          title="Download PDF Only"
                          data-testid={`button-download-pdf-${document.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Lock className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Protected Folder
            </h3>
            <p className="text-gray-600 mb-4">
              This folder requires a security code to access.
            </p>
            <Button onClick={() => setShowSecurityDialog(true)}>
              Enter Security Code
            </Button>
          </div>
        )}

        {/* Security Code Dialog */}
        <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Security Code</DialogTitle>
              <DialogDescription>
                This folder is protected. Please enter the security code to access its contents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Security code"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value)}
                data-testid="input-security-code"
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSecurityDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => verifyAccessMutation.mutate(securityCode)}
                  disabled={verifyAccessMutation.isPending || !securityCode}
                >
                  {verifyAccessMutation.isPending ? "Verifying..." : "Access Folder"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Document Creator */}
        {showDocumentCreator && (
          <DocumentCreator
            folderId={folderId}
            onClose={() => setShowDocumentCreator(false)}
            onSuccess={() => {
              setShowDocumentCreator(false);
              refetchDocuments();
            }}
          />
        )}

        {/* Grok Assistant */}
        {showGrokAssistant && (
          <GrokAssistant onClose={() => setShowGrokAssistant(false)} />
        )}
      </div>
    </div>
  );
}