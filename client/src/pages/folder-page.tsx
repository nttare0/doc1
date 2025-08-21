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

  // Fetch folder details
  const { data: folder, isLoading: folderLoading } = useQuery<Folder>({
    queryKey: ["/api/folders", folderId],
    queryFn: getQueryFn(),
    enabled: !!folderId,
  });

  // Fetch folder documents
  const { data: documents = [], isLoading: documentsLoading, refetch: refetchDocuments } = useQuery<Document[]>({
    queryKey: ["/api/folders", folderId, "documents"],
    queryFn: getQueryFn(),
    enabled: !!folderId && isAccessVerified,
  });

  // Check folder access on load
  useEffect(() => {
    if (folder && folder.hasSecurityCode && !isAccessVerified) {
      setShowSecurityDialog(true);
    } else if (folder && !folder.hasSecurityCode) {
      setIsAccessVerified(true);
    }
  }, [folder, isAccessVerified]);

  // Verify folder access mutation
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
        description: "You now have access to this folder.",
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

  // Document action mutations
  const downloadDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("GET", `/api/documents/${documentId}/download`);
      const blob = await response.blob();
      const document = documents.find(d => d.id === documentId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document?.originalName || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Your document is being downloaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Download failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Category colors and icons
  const categoryConfig = {
    press_releases: { color: "bg-blue-100 text-blue-800", label: "Press Release" },
    memos: { color: "bg-green-100 text-green-800", label: "Memo" },
    internal_letters: { color: "bg-yellow-100 text-yellow-800", label: "Internal Letter" },
    external_letters: { color: "bg-purple-100 text-purple-800", label: "External Letter" },
    contracts: { color: "bg-red-100 text-red-800", label: "Contract" },
    follow_ups: { color: "bg-orange-100 text-orange-800", label: "Follow-up" },
    reports: { color: "bg-gray-100 text-gray-800", label: "Report" },
  };

  if (folderLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Folder not found</h1>
        <p className="text-gray-600 mb-4">The requested folder does not exist or has been deleted.</p>
        <Link href="/dashboard">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zeolf-background">
      {/* Security Dialog */}
      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Folder Access Required
            </DialogTitle>
            <DialogDescription>
              This folder is protected with a security code. Please enter the code to access its contents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter security code"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value)}
              data-testid="input-folder-security-code"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSecurityDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => verifyAccessMutation.mutate(securityCode)}
                disabled={!securityCode || verifyAccessMutation.isPending}
                data-testid="button-verify-access"
              >
                {verifyAccessMutation.isPending ? "Verifying..." : "Access Folder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zeolf-text-primary flex items-center gap-2">
                {folder.hasSecurityCode ? (
                  <Lock className="w-6 h-6 text-yellow-500" />
                ) : (
                  <Unlock className="w-6 h-6 text-green-500" />
                )}
                {folder.name}
              </h1>
              {folder.description && (
                <p className="text-zeolf-text-secondary mt-1">{folder.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <GrokAssistant />
            <DocumentCreator 
              folderId={folderId}
              onDocumentCreated={() => refetchDocuments()}
            />
          </div>
        </div>

        {!isAccessVerified ? (
          <div className="text-center py-12">
            <Lock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
            <p className="text-gray-600">Please verify your access to view folder contents.</p>
          </div>
        ) : (
          <>
            {/* Search and View Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-80"
                    data-testid="input-search-documents"
                  />
                </div>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? "No documents found" : "No documents yet"}
                </h2>
                <p className="text-gray-600 mb-4">
                  {searchQuery 
                    ? "Try adjusting your search terms"
                    : "Create your first document to get started"}
                </p>
                {!searchQuery && (
                  <DocumentCreator 
                    folderId={folderId}
                    onDocumentCreated={() => refetchDocuments()}
                  />
                )}
              </div>
            ) : (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                : "space-y-3"
              }>
                {filteredDocuments.map((document) => (
                  <Card 
                    key={document.id} 
                    className="hover:shadow-md transition-shadow"
                    data-testid={`document-card-${document.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-sm font-medium line-clamp-2">
                            {document.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              className={`text-xs ${
                                categoryConfig[document.category as keyof typeof categoryConfig]?.color || 
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {categoryConfig[document.category as keyof typeof categoryConfig]?.label || 
                               document.category}
                            </Badge>
                            <span className="text-xs text-gray-500 capitalize">
                              {document.fileType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(document.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1">
                          {/* View (Auto-download) Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocumentMutation.mutate(document.id)}
                            disabled={downloadDocumentMutation.isPending}
                            title="View (Auto-download for offline editing)"
                            data-testid={`button-view-${document.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {/* Update Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Update document"
                            data-testid={`button-update-${document.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          {/* Download PDF Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Download as PDF"
                            data-testid={`button-download-pdf-${document.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}