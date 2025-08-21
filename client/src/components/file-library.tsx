import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Folder, 
  FolderOpen, 
  Lock, 
  Unlock,
  Search,
  Grid3X3,
  List,
  Clock,
  Users,
  Plus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getQueryFn } from "@/lib/queryClient";
import { FolderCreator } from "./folder-creator";
import type { Folder as FolderType } from "@shared/schema";

export function FileLibrary() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFolderCreator, setShowFolderCreator] = useState(false);

  // Fetch all folders
  const { data: folders = [], isLoading } = useQuery<FolderType[]>({
    queryKey: ["/api/folders"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
  });

  // Filter folders based on search
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (folder.description && folder.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleFolderClick = (folderId: string) => {
    navigate(`/folders/${folderId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zeolf-text-primary">Document Folders</h2>
          <p className="text-zeolf-text-secondary">
            Organize your documents in secure folders
          </p>
        </div>
        <Button
          onClick={() => setShowFolderCreator(true)}
          className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
          data-testid="button-create-folder-plus"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Search and View Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-folders"
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

      {/* Folder Grid/List */}
      {filteredFolders.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? "No folders found" : "No folders yet"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery 
              ? "Try adjusting your search terms"
              : "Create your first folder to organize your documents"}
          </p>
          {!searchQuery && <FolderCreator />}
        </div>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
          : "space-y-3"
        }>
          {filteredFolders.map((folder) => (
            <Card 
              key={folder.id}
              className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] group"
              onClick={() => handleFolderClick(folder.id)}
              data-testid={`folder-card-${folder.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {folder.hasSecurityCode ? (
                        <div className="relative">
                          <Folder className="w-8 h-8 text-zeolf-primary group-hover:hidden" />
                          <FolderOpen className="w-8 h-8 text-zeolf-primary hidden group-hover:block" />
                          <Lock className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500 bg-white rounded-full p-0.5" />
                        </div>
                      ) : (
                        <div className="relative">
                          <Folder className="w-8 h-8 text-zeolf-primary group-hover:hidden" />
                          <FolderOpen className="w-8 h-8 text-zeolf-primary hidden group-hover:block" />
                          <Unlock className="w-3 h-3 absolute -top-1 -right-1 text-green-500 bg-white rounded-full p-0.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium line-clamp-1">
                        {folder.name}
                      </CardTitle>
                      {folder.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                          {folder.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {folder.hasSecurityCode && (
                    <Badge variant="outline" className="text-xs">
                      Protected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(folder.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>Private</span>
                  </div>
                </div>
                
                {/* Hover Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-3">
                  <Button 
                    size="sm" 
                    className="w-full bg-zeolf-primary hover:bg-zeolf-primary-dark"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFolderClick(folder.id);
                    }}
                  >
                    Open Folder
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {filteredFolders.length > 0 && (
        <div className="flex items-center justify-center gap-6 pt-6 text-sm text-gray-500 border-t">
          <span>{filteredFolders.length} folders</span>
          <span>•</span>
          <span>{filteredFolders.filter(f => f.hasSecurityCode).length} protected</span>
          <span>•</span>
          <span>{filteredFolders.filter(f => !f.hasSecurityCode).length} open access</span>
        </div>
      )}

      {/* Folder Creator Modal */}
      {showFolderCreator && (
        <FolderCreator 
          onSuccess={() => setShowFolderCreator(false)}
        />
      )}
    </div>
  );
}