import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import DocumentViewer from "@/pages/document-viewer";
import DocumentEditorPage from "@/pages/document-editor";
import UserManagement from "@/pages/admin/user-management";
import ActivityLogs from "@/pages/admin/activity-logs";
import FolderPage from "@/pages/folder-page";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/folders/:folderId" component={FolderPage} />
      <ProtectedRoute path="/documents/:id" component={DocumentViewer} />
      <ProtectedRoute path="/document/edit/:id" component={DocumentEditorPage} />
      <ProtectedRoute path="/admin/users" component={UserManagement} />
      <ProtectedRoute path="/admin/activity" component={ActivityLogs} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
