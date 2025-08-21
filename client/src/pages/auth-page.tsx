import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [loginCode, setLoginCode] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode.trim()) return;
    
    loginMutation.mutate({ loginCode: loginCode.trim() });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    registerMutation.mutate({
      name: newUserName.trim(),
      role: newUserRole,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zeolf-blue to-zeolf-blue-dark flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Hero Section */}
        <div className="text-center lg:text-left text-white space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
            <FileText className="w-10 h-10" />
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold mb-4">
            ZEOLF
          </h1>
          
          <h2 className="text-xl lg:text-2xl font-semibold mb-4">
            Document Management System
          </h2>
          
          <p className="text-lg text-white/90 max-w-lg">
            Secure document organization, collaborative editing, and integrated 
            video conferencing for company members. Professional document management 
            inspired by SharePoint and Google Workspace.
          </p>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0 text-sm">
            <div className="bg-white/10 p-3 rounded-lg">
              <div className="font-semibold">Secure Storage</div>
              <div className="text-white/80">Enterprise-grade security</div>
            </div>
            <div className="bg-white/10 p-3 rounded-lg">
              <div className="font-semibold">Collaboration</div>
              <div className="text-white/80">Team document sharing</div>
            </div>
            <div className="bg-white/10 p-3 rounded-lg">
              <div className="font-semibold">Video Meetings</div>
              <div className="text-white/80">Integrated conferencing</div>
            </div>
            <div className="bg-white/10 p-3 rounded-lg">
              <div className="font-semibold">Activity Tracking</div>
              <div className="text-white/80">Comprehensive logging</div>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-zeolf-text">Access ZEOLF DMS</CardTitle>
            <CardDescription>
              Enter your login code to access the document management system
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Create User</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="loginCode" className="text-zeolf-text">Login Code</Label>
                    <Input
                      id="loginCode"
                      data-testid="input-login-code"
                      type="text"
                      placeholder="ZT-ABC-123"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      className="focus:ring-zeolf-blue focus:border-zeolf-blue"
                      disabled={loginMutation.isPending}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-zeolf-blue hover:bg-zeolf-blue-dark"
                    disabled={loginMutation.isPending || !loginCode.trim()}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
                
                <p className="text-sm text-zeolf-text-secondary text-center">
                  Contact your administrator for access codes
                </p>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newUserName" className="text-zeolf-text">Full Name</Label>
                    <Input
                      id="newUserName"
                      data-testid="input-new-user-name"
                      type="text"
                      placeholder="John Doe"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="focus:ring-zeolf-blue focus:border-zeolf-blue"
                      disabled={registerMutation.isPending}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newUserRole" className="text-zeolf-text">Role</Label>
                    <select
                      id="newUserRole"
                      data-testid="select-user-role"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zeolf-blue focus:border-transparent outline-none"
                      disabled={registerMutation.isPending}
                    >
                      <option value="user">User</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-zeolf-blue hover:bg-zeolf-blue-dark"
                    disabled={registerMutation.isPending || !newUserName.trim()}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating User...
                      </>
                    ) : (
                      "Generate Login Code"
                    )}
                  </Button>
                </form>
                
                <p className="text-sm text-zeolf-text-secondary text-center">
                  Only super admins can create new user accounts
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
