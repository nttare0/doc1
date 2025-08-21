import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Download, 
  Share, 
  Edit, 
  FileText,
  File,
  FileSpreadsheet,
  Presentation
} from "lucide-react";
import { Document } from "@shared/schema";
import { format } from "date-fns";

const fileTypeIcons = {
  pdf: { icon: FileText, color: "text-red-600", bgColor: "bg-red-100" },
  word: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-100" },
  excel: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-100" },
  powerpoint: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-100" },
  unknown: { icon: File, color: "text-gray-600", bgColor: "bg-gray-100" },
};

export default function DocumentViewer() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const documentId = params.id;

  const { data: document, isLoading } = useQuery<Document>({
    queryKey: ["/api/documents", documentId],
    enabled: !!documentId,
  });

  const handleBack = () => {
    setLocation("/");
  };

  const handleDownload = () => {
    if (document) {
      window.open(`/api/documents/${document.id}/download`);
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log("Share document");
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log("Edit document");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zeolf-bg">
        <div className="bg-white border-b border-gray-200 p-4">
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-lg p-8">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-zeolf-bg flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zeolf-text mb-2">Document not found</h2>
          <p className="text-zeolf-text-secondary mb-6">
            The document you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={handleBack} className="bg-zeolf-blue hover:bg-zeolf-blue-dark">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  const fileTypeConfig = fileTypeIcons[document.fileType as keyof typeof fileTypeIcons] || fileTypeIcons.unknown;
  const Icon = fileTypeConfig.icon;

  return (
    <div className="min-h-screen bg-zeolf-bg" data-testid="document-viewer">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${fileTypeConfig.bgColor} rounded flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${fileTypeConfig.color}`} />
              </div>
              <div>
                <h1 className="font-medium text-zeolf-text" data-testid="document-title">
                  {document.name}
                </h1>
                <p className="text-sm text-zeolf-text-secondary">
                  {(document.fileSize / 1024 / 1024).toFixed(2)} MB • 
                  Last modified {format(new Date(document.updatedAt), "PPP 'at' p")}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              data-testid="button-download"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              data-testid="button-share"
            >
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
              size="sm"
              onClick={handleEdit}
              data-testid="button-edit"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          {/* ZEOLF Company Header */}
          <div className="border-b-2 border-zeolf-blue p-8 bg-gradient-to-r from-zeolf-blue/5 to-zeolf-accent/5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-zeolf-blue mb-2">ZEOLF TECHNOLOGY</h1>
                <p className="text-zeolf-text-secondary">Document Management Solutions</p>
              </div>
              <div className="text-right text-sm text-zeolf-text-secondary">
                <p>Created: {format(new Date(document.createdAt), "PPP")}</p>
                <p>Doc #: ZT-{document.category.toUpperCase()}-{document.id.substr(0, 8)}</p>
              </div>
            </div>
          </div>
          
          {/* Document Body */}
          <div className="p-8">
            <div className="mb-6">
              <Badge variant="secondary" className="mb-4">
                {document.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
              <h2 className="text-2xl font-semibold text-zeolf-text mb-4">
                {document.name}
              </h2>
            </div>
            
            {/* Document Preview Placeholder */}
            <div className="bg-gray-50 rounded-lg p-8 text-center min-h-96 flex items-center justify-center">
              <div>
                <Icon className={`w-20 h-20 ${fileTypeConfig.color} mx-auto mb-4`} />
                <h3 className="text-lg font-medium text-zeolf-text mb-2">Document Preview</h3>
                <p className="text-zeolf-text-secondary mb-6">
                  Click download to view the full document content
                </p>
                <Button
                  onClick={handleDownload}
                  className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
                  data-testid="button-download-preview"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download {document.originalName}
                </Button>
              </div>
            </div>
            
            {/* Document Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-zeolf-text-secondary text-center">
                This document is confidential and proprietary to ZEOLF Technology. 
                Distribution is restricted to authorized personnel only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
