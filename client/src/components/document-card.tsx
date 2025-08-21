import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MoreHorizontal, 
  Download, 
  Share, 
  Eye,
  FileText,
  FileSpreadsheet,
  Presentation,
  File
} from "lucide-react";
import { Document } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { formatDistance } from "date-fns";

interface DocumentCardProps {
  document: Document;
}

const fileTypeIcons = {
  pdf: { icon: FileText, color: "text-red-600", bgColor: "bg-red-100" },
  word: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-100" },
  excel: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-100" },
  powerpoint: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-100" },
  unknown: { icon: File, color: "text-gray-600", bgColor: "bg-gray-100" },
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function DocumentCard({ document }: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fileTypeConfig = fileTypeIcons[document.fileType as keyof typeof fileTypeIcons] || fileTypeIcons.unknown;
  const Icon = fileTypeConfig.icon;

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${document.id}/download`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.originalName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: `${document.name} is being downloaded`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleView = () => {
    setLocation(`/documents/${document.id}`);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadMutation.mutate();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement share functionality
    toast({
      title: "Share functionality",
      description: "Document sharing will be implemented here",
    });
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
      onClick={handleView}
      data-testid={`document-card-${document.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 ${fileTypeConfig.bgColor} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${fileTypeConfig.color}`} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            data-testid={`button-menu-${document.id}`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
        
        <h3 className="font-medium text-zeolf-text mb-1 truncate" title={document.name}>
          {document.name}
        </h3>
        
        <p className="text-sm text-zeolf-text-secondary mb-2">
          {document.fileType.toUpperCase()} • {formatFileSize(document.fileSize)}
        </p>
        
        <p className="text-xs text-zeolf-text-secondary">
          Modified {formatDistance(new Date(document.updatedAt), new Date(), { addSuffix: true })}
        </p>

        {/* Category Badge */}
        <div className="mt-2">
          <Badge variant="secondary" className="text-xs">
            {document.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        </div>

        {/* Quick Actions */}
        {showMenu && (
          <div className="absolute top-12 right-4 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2 text-sm"
              onClick={handleView}
              data-testid={`button-view-${document.id}`}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2 text-sm"
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
              data-testid={`button-download-${document.id}`}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2 text-sm"
              onClick={handleShare}
              data-testid={`button-share-${document.id}`}
            >
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
