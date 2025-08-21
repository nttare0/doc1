import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Upload, Share, Eye, Users, FileText, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { ActivityLog } from "@shared/schema";
import { formatDistance } from "date-fns";

const actionIcons = {
  login: { icon: Users, color: "text-zeolf-blue", bgColor: "bg-zeolf-blue/10" },
  logout: { icon: Users, color: "text-gray-600", bgColor: "bg-gray-100" },
  upload: { icon: Upload, color: "text-zeolf-success", bgColor: "bg-zeolf-success/10" },
  download: { icon: Download, color: "text-zeolf-blue", bgColor: "bg-zeolf-blue/10" },
  view: { icon: Eye, color: "text-zeolf-accent", bgColor: "bg-zeolf-accent/10" },
  share: { icon: Share, color: "text-zeolf-warning", bgColor: "bg-zeolf-warning/10" },
  edit: { icon: FileText, color: "text-zeolf-warning", bgColor: "bg-zeolf-warning/10" },
  create_user: { icon: Users, color: "text-zeolf-success", bgColor: "bg-zeolf-success/10" },
  update_user: { icon: Users, color: "text-zeolf-warning", bgColor: "bg-zeolf-warning/10" },
  default: { icon: AlertCircle, color: "text-gray-600", bgColor: "bg-gray-100" },
};

const actionLabels = {
  login: "User Login",
  logout: "User Logout", 
  upload: "Document Uploaded",
  download: "Document Downloaded",
  view: "Document Viewed",
  share: "Document Shared",
  edit: "Document Edited",
  create_user: "User Created",
  update_user: "User Updated",
};

export default function ActivityLogs() {
  const { user: currentUser } = useAuth();
  const [filterAction, setFilterAction] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [limit, setLimit] = useState("50");

  const { data: activityLogs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity-logs", { limit: parseInt(limit) }],
    enabled: currentUser?.role === "super_admin",
  });

  // Filter logs based on selected filters
  const filteredLogs = activityLogs.filter(log => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterDate && !log.createdAt.startsWith(filterDate)) return false;
    return true;
  });

  const getActionConfig = (action: string) => {
    return actionIcons[action as keyof typeof actionIcons] || actionIcons.default;
  };

  const getActionLabel = (action: string) => {
    return actionLabels[action as keyof typeof actionLabels] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatLogDescription = (log: ActivityLog) => {
    const details = log.details as any;
    
    switch (log.action) {
      case 'login':
        return `User logged into the system`;
      case 'logout':
        return `User logged out of the system`;
      case 'upload':
        return `Uploaded "${details?.documentName || 'document'}" (${details?.fileSize ? (details.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'unknown size'})`;
      case 'download':
        return `Downloaded "${details?.documentName || 'document'}" (${details?.fileSize ? (details.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'unknown size'})`;
      case 'view':
        return `Viewed ${details?.documentName ? `"${details.documentName}"` : 'document'}`;
      case 'share':
        return `Shared "${details?.documentName || 'document'}" with ${details?.sharedWith ? 'user' : 'team'}`;
      case 'create_user':
        return `Created new user "${details?.newUserName || 'user'}" with role ${details?.newUserRole || 'user'}`;
      case 'update_user':
        return `Updated user permissions`;
      default:
        return `Performed ${log.action.replace(/_/g, ' ')} action`;
    }
  };

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-zeolf-bg flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-zeolf-text mb-2">Access Denied</h2>
            <p className="text-zeolf-text-secondary mb-4">
              Super admin access is required to view this page.
            </p>
            <Link href="/">
              <Button className="bg-zeolf-blue hover:bg-zeolf-blue-dark">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zeolf-bg" data-testid="activity-logs">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-zeolf-text">Activity Logs</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-40" data-testid="select-filter-action">
                <SelectValue placeholder="All Activities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Activities</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
                <SelectItem value="download">Download</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="share">Share</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
                <SelectItem value="create_user">User Creation</SelectItem>
                <SelectItem value="update_user">User Update</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-40"
              data-testid="input-filter-date"
            />
            
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-24" data-testid="select-limit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
            <p className="text-sm text-zeolf-text-secondary">
              Showing {filteredLogs.length} of {activityLogs.length} activities
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zeolf-text mb-2">No activity found</h3>
                <p className="text-zeolf-text-secondary">
                  {filterAction || filterDate 
                    ? "Try adjusting your filters to see more activities"
                    : "System activities will appear here as users interact with the platform"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => {
                  const actionConfig = getActionConfig(log.action);
                  const Icon = actionConfig.icon;
                  
                  return (
                    <div 
                      key={log.id} 
                      className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`activity-log-${log.id}`}
                    >
                      <div className={`w-10 h-10 ${actionConfig.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${actionConfig.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-zeolf-text">
                            {getActionLabel(log.action)}
                          </h3>
                          <span className="text-sm text-zeolf-text-secondary flex-shrink-0">
                            {formatDistance(new Date(log.createdAt), new Date(), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <p className="text-zeolf-text-secondary text-sm mb-3">
                          {formatLogDescription(log)}
                        </p>
                        
                        <div className="flex items-center flex-wrap gap-3 text-xs text-zeolf-text-secondary">
                          <Badge variant="outline" className="text-xs">
                            User ID: {log.userId.substr(0, 8)}
                          </Badge>
                          
                          {log.ipAddress && (
                            <span>IP: {log.ipAddress}</span>
                          )}
                          
                          {log.resourceType && (
                            <span>Resource: {log.resourceType}</span>
                          )}
                          
                          {log.resourceId && (
                            <span>ID: {log.resourceId.substr(0, 8)}...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
