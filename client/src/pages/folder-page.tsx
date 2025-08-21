import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Plus,
  Lock,
  Unlock,
  Bot,
  Upload
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { DocumentCreator } from "@/components/document-creator";
import { GrokAssistant } from "@/components/grok-assistant";
import { FolderDocumentList } from "@/components/folder-document-list";
import { FolderSecurityModal } from "@/components/folder-security-modal";
import { FileUploader } from "@/components/file-uploader";
import type { Folder } from "@shared/schema";

export default function FolderPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isAccessVerified, setIsAccessVerified] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showDocumentCreator, setShowDocumentCreator] = useState(false);
  const [showGrokAssistant, setShowGrokAssistant] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);

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

  // Check folder access on mount
  useEffect(() => {
    if (folder) {
      if (!folder.hasSecurityCode) {
        setIsAccessVerified(true);
      } else {
        setShowSecurityModal(true);
      }
    }
  }, [folder]);

  const handleAccessGranted = () => {
    setIsAccessVerified(true);
    setShowSecurityModal(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600">Please log in to access folders.</p>
        </div>
      </div>
    );
  }

  if (folderLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Folder not found</h1>
          <p className="text-gray-600 mb-4">The folder you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="relative">
                  {folder.hasSecurityCode ? (
                    <Lock className="w-8 h-8 text-yellow-600" />
                  ) : (
                    <Unlock className="w-8 h-8 text-green-600" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-zeolf-text-primary">{folder.name}</h1>
                  {folder.description && (
                    <p className="text-zeolf-text-secondary">{folder.description}</p>
                  )}
                </div>
              </div>
              {folder.hasSecurityCode && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                  <Lock className="w-3 h-3 mr-1" />
                  Protected
                </Badge>
              )}
            </div>
            
            {/* Action Buttons */}
            {isAccessVerified && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowGrokAssistant(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                  data-testid="button-grok-assistant"
                >
                  <Bot className="w-4 h-4" />
                  AI Assistant
                </Button>
                <Button
                  onClick={() => setShowFileUpload(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                  data-testid="button-upload-file"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </Button>
                <Button
                  onClick={() => setShowDocumentCreator(true)}
                  className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
                  data-testid="button-create-document"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Document
                </Button>
              </div>
            )}
          </div>
          
          {/* Folder Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-gray-500">
            <span>Created {new Date(folder.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>Last updated {new Date(folder.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Content Area */}
        {isAccessVerified ? (
          <div className="space-y-6">
            {/* Document List */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-zeolf-text-primary">Documents</h2>
                  <p className="text-zeolf-text-secondary">
                    Manage documents in this folder
                  </p>
                </div>
              </div>
              
              <FolderDocumentList folderId={folderId!} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Lock className="w-16 h-16 mx-auto text-yellow-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Folder Access Required
            </h3>
            <p className="text-gray-600 mb-4">
              This folder is protected. Please enter the security code to access its contents.
            </p>
            <Button
              onClick={() => setShowSecurityModal(true)}
              className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
              data-testid="button-enter-security-code"
            >
              Enter Security Code
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <FolderSecurityModal
        open={showSecurityModal}
        onOpenChange={setShowSecurityModal}
        folderId={folderId!}
        folderName={folder.name}
        onAccessGranted={handleAccessGranted}
      />

      <DocumentCreator
        open={showDocumentCreator}
        onClose={() => setShowDocumentCreator(false)}
        folderId={folderId}
        onSuccess={() => {
          setShowDocumentCreator(false);
          toast({
            title: "Document created",
            description: "Your document has been created successfully",
          });
        }}
      />

      <FileUploader
        open={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        folderId={folderId!}
        onSuccess={() => {
          setShowFileUpload(false);
          toast({
            title: "File uploaded",
            description: "Your file has been uploaded successfully",
          });
        }}
      />

      <GrokAssistant
        open={showGrokAssistant}
        onClose={() => setShowGrokAssistant(false)}
      />
    </div>
  );
}