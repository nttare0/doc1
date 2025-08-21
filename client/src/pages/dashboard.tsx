import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Upload, 
  Video, 
  ChevronDown, 
  Grid3X3, 
  List, 
  FileText,
  Folder,
  Star,
  Clock,
  Share,
  Newspaper,
  FileCheck,
  Mail,
  File,
  Reply,
  Users,
  BarChart3,
  MoreHorizontal,
  Settings
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Document } from "@shared/schema";
import { DocumentCard } from "@/components/document-card";
import { UploadModal } from "@/components/upload-modal";
import { VideoConference } from "@/components/video-conference";
import { DocumentCreator } from "@/components/document-creator";

const categoryIcons = {
  press_releases: { icon: Newspaper, color: "text-zeolf-accent", bgColor: "bg-zeolf-accent/10" },
  memos: { icon: FileCheck, color: "text-zeolf-warning", bgColor: "bg-zeolf-warning/10" },
  internal_letters: { icon: Mail, color: "text-zeolf-success", bgColor: "bg-zeolf-success/10" },
  contracts: { icon: File, color: "text-zeolf-error", bgColor: "bg-zeolf-error/10" },
  follow_ups: { icon: Reply, color: "text-zeolf-blue", bgColor: "bg-zeolf-blue/10" },
};

const categoryLabels = {
  press_releases: "Press Releases",
  memos: "Memos",
  internal_letters: "Internal Letters",
  contracts: "Contracts",
  follow_ups: "Follow-ups",
};

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("modified");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVideoConference, setShowVideoConference] = useState(false);
  const [showDocumentCreator, setShowDocumentCreator] = useState(false);

  // Fetch documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", { category: selectedCategory, search: searchQuery }],
    enabled: !!user,
  });

  // Fetch document statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/documents/stats"],
    enabled: !!user,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the query key change
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zeolf-bg">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-zeolf-blue rounded flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-zeolf-text">ZEOLF DMS</h1>
            </div>
            
            <nav className="flex items-center space-x-2 text-sm">
              <span className="text-zeolf-text-secondary">Documents</span>
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <span className="text-zeolf-blue">Company Files</span>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 focus:ring-zeolf-blue"
                data-testid="input-search"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </form>
            
            {/* Video Conference Button */}
            <Button 
              onClick={() => setShowVideoConference(true)}
              className="bg-zeolf-accent hover:bg-zeolf-accent/90 text-white"
              data-testid="button-new-meeting"
            >
              <Video className="w-4 h-4 mr-2" />
              New Meeting
            </Button>
            
            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-zeolf-blue rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <span className="text-zeolf-text font-medium">{user.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            {/* Quick Actions */}
            <div className="mb-6 space-y-3">
              <Button 
                onClick={() => setShowDocumentCreator(true)}
                className="w-full bg-zeolf-blue hover:bg-zeolf-blue-dark text-white"
                data-testid="button-create-document"
              >
                <FileText className="w-4 h-4 mr-2" />
                Create Document
              </Button>
              
              <Button 
                onClick={() => setShowUploadModal(true)}
                variant="outline"
                className="w-full border-zeolf-blue text-zeolf-blue hover:bg-zeolf-blue/5"
                data-testid="button-upload"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            </div>
            
            {/* Navigation Menu */}
            <nav className="space-y-2 mb-8">
              <Button
                variant={selectedCategory === "" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedCategory("")}
                data-testid="nav-all-documents"
              >
                <Folder className="w-4 h-4 mr-3" />
                All Documents
              </Button>
              <Button variant="ghost" className="w-full justify-start" data-testid="nav-starred">
                <Star className="w-4 h-4 mr-3" />
                Starred
              </Button>
              <Button variant="ghost" className="w-full justify-start" data-testid="nav-recent">
                <Clock className="w-4 h-4 mr-3" />
                Recent
              </Button>
              <Link href="/shared">
                <Button variant="ghost" className="w-full justify-start" data-testid="nav-shared">
                  <Share className="w-4 h-4 mr-3" />
                  Shared with me
                </Button>
              </Link>
            </nav>
            
            {/* Document Categories */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-zeolf-text-secondary mb-3">Categories</h3>
              <nav className="space-y-1">
                {Object.entries(categoryIcons).map(([category, { icon: Icon, color, bgColor }]) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "secondary" : "ghost"}
                    className="w-full justify-between text-sm p-3"
                    onClick={() => setSelectedCategory(selectedCategory === category ? "" : category)}
                    data-testid={`nav-category-${category}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span>{categoryLabels[category as keyof typeof categoryLabels]}</span>
                    </div>
                    {stats && (
                      <span className="text-xs text-zeolf-text-secondary">
                        {stats[category as keyof typeof stats]}
                      </span>
                    )}
                  </Button>
                ))}
              </nav>
            </div>
            
            {/* Admin Section (Super Admin Only) */}
            {user.role === "super_admin" && (
              <div>
                <h3 className="text-sm font-medium text-zeolf-text-secondary mb-3">Administration</h3>
                <nav className="space-y-1">
                  <Link href="/admin/users">
                    <Button variant="ghost" className="w-full justify-start text-sm" data-testid="nav-user-management">
                      <Users className="w-4 h-4 mr-3" />
                      User Management
                    </Button>
                  </Link>
                  <Link href="/admin/activity">
                    <Button variant="ghost" className="w-full justify-start text-sm" data-testid="nav-activity-logs">
                      <BarChart3 className="w-4 h-4 mr-3" />
                      Activity Logs
                    </Button>
                  </Link>
                </nav>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* View Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-zeolf-text">Company Documents</h2>
                <span className="text-sm text-zeolf-text-secondary">
                  {documents.length} documents
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    data-testid="button-grid-view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    data-testid="button-list-view"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40" data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modified">Sort by: Modified</SelectItem>
                    <SelectItem value="name">Sort by: Name</SelectItem>
                    <SelectItem value="size">Sort by: Size</SelectItem>
                    <SelectItem value="type">Sort by: Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Document Grid */}
            {documentsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2 mb-2" />
                      <Skeleton className="h-3 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zeolf-text mb-2">No documents found</h3>
                <p className="text-zeolf-text-secondary mb-6">
                  {searchQuery || selectedCategory 
                    ? "Try adjusting your search or filters"
                    : "Get started by uploading your first document"
                  }
                </p>
                <Button 
                  onClick={() => setShowUploadModal(true)}
                  className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
                  data-testid="button-upload-empty"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {documents.map((document) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <UploadModal 
        open={showUploadModal} 
        onOpenChange={setShowUploadModal}
      />
      
      <VideoConference 
        open={showVideoConference}
        onOpenChange={setShowVideoConference}
      />
      
      <DocumentCreator 
        open={showDocumentCreator}
        onClose={() => setShowDocumentCreator(false)}
      />
    </div>
  );
}
