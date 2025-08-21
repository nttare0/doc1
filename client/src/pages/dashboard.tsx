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
  Settings,
  Download,
  Eye,
  Edit
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { FileLibrary } from "@/components/file-library";

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

            </div>
            
            {/* Navigation Menu */}
            <nav className="space-y-2 mb-8">
              <Button
                variant="secondary"
                className="w-full justify-start"
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
                    variant="ghost"
                    className="w-full justify-between text-sm p-3"
                    data-testid={`nav-category-${category}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span>{categoryLabels[category as keyof typeof categoryLabels]}</span>
                    </div>
                    <span className="text-xs text-zeolf-text-secondary">
                      0
                    </span>
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

            
            {/* File Library - Folder-based Document Management */}
            <FileLibrary />
          </div>
        </main>
      </div>


      



    </div>
  );
}
