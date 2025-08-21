import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  Eye, 
  Edit,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
  Calendar,
  User,
  Folder,
  Grid3X3,
  List
} from "lucide-react";
import { Document } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDistance } from "date-fns";

const fileTypeIcons = {
  pdf: { icon: FileText, color: "text-red-600", bgColor: "bg-red-100" },
  word: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-100" },
  excel: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-100" },
  powerpoint: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-100" },
  unknown: { icon: File, color: "text-gray-600", bgColor: "bg-gray-100" },
};

const categoryLabels = {
  press_releases: "Press Releases",
  memos: "Memos", 
  internal_letters: "Internal Letters",
  contracts: "Contracts",
  follow_ups: "Follow-ups",
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface FileViewerProps {
  onClose: () => void;
}

export function FileViewer({ onClose }: FileViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState("modified");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", { category: selectedCategory, search: searchQuery }],
  });

  const downloadMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}/download`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const document = documents.find(d => d.id === documentId);
      return { blob, document };
    },
    onSuccess: ({ blob, document }) => {
      if (!document) return;
      
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.originalName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      toast({
        title: "Download completed",
        description: `${document.name} has been downloaded for offline editing`,
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

  const handleDownload = (documentId: string) => {
    downloadMutation.mutate(documentId);
  };

  const handleView = (documentId: string) => {
    setLocation(`/documents/${documentId}`);
  };

  const handleEdit = (documentId: string) => {
    setLocation(`/document/edit/${documentId}`);
  };

  const filteredAndSortedDocuments = documents
    .filter(doc => {
      if (selectedCategory && doc.category !== selectedCategory) return false;
      if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return b.fileSize - a.fileSize;
        case "modified":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  if (isLoading) {
    return (
      <Card className="w-full h-96">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-zeolf-text">
            <Folder className="w-5 h-5 inline mr-2" />
            Document Library
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-file-viewer">
            ×
          </Button>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-documents"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory} data-testid="select-category-filter">
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy} data-testid="select-sort-by">
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modified">Modified</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-1">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-list-view"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              data-testid="button-grid-view"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {filteredAndSortedDocuments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No documents found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-2">
            {filteredAndSortedDocuments.map((document) => {
              const fileTypeConfig = fileTypeIcons[document.fileType as keyof typeof fileTypeIcons] || fileTypeIcons.unknown;
              const Icon = fileTypeConfig.icon;
              
              return (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  data-testid={`document-row-${document.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 ${fileTypeConfig.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${fileTypeConfig.color}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zeolf-text truncate" title={document.name}>
                        {document.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>{document.fileType.toUpperCase()}</span>
                        <span>{formatFileSize(document.fileSize)}</span>
                        <span>Modified {formatDistance(new Date(document.updatedAt), new Date(), { addSuffix: true })}</span>
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabels[document.category as keyof typeof categoryLabels]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(document.id)}
                      title="View document"
                      data-testid={`button-view-${document.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(document.id)}
                      title="Edit document"
                      data-testid={`button-edit-${document.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document.id)}
                      disabled={downloadMutation.isPending}
                      title="Download for offline editing"
                      data-testid={`button-download-${document.id}`}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAndSortedDocuments.map((document) => {
              const fileTypeConfig = fileTypeIcons[document.fileType as keyof typeof fileTypeIcons] || fileTypeIcons.unknown;
              const Icon = fileTypeConfig.icon;
              
              return (
                <Card 
                  key={document.id}
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  data-testid={`document-card-${document.id}`}
                >
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className={`w-12 h-12 ${fileTypeConfig.bgColor} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                        <Icon className={`w-6 h-6 ${fileTypeConfig.color}`} />
                      </div>
                      
                      <h3 className="font-medium text-zeolf-text mb-2 truncate" title={document.name}>
                        {document.name}
                      </h3>
                      
                      <p className="text-xs text-gray-500 mb-3">
                        {document.fileType.toUpperCase()} • {formatFileSize(document.fileSize)}
                      </p>
                      
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(document.id)}
                          data-testid={`button-view-${document.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(document.id)}
                          data-testid={`button-edit-${document.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(document.id)}
                          disabled={downloadMutation.isPending}
                          data-testid={`button-download-${document.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}