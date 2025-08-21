import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Edit, UserCheck, UserX, Copy, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistance } from "date-fns";

export default function UserManagement() {
  const { user: currentUser, registerMutation } = useAuth();
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.role === "super_admin",
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "User status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    registerMutation.mutate(
      { name: newUserName.trim(), role: newUserRole },
      {
        onSuccess: () => {
          setNewUserName("");
          setNewUserRole("user");
          setShowAddUserModal(false);
        },
      }
    );
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    updateUserMutation.mutate({
      userId,
      updates: { isActive: !currentStatus },
    });
  };

  const handleCopyLoginCode = (loginCode: string) => {
    navigator.clipboard.writeText(loginCode);
    toast({
      title: "Login code copied",
      description: "Login code has been copied to clipboard",
    });
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
    <div className="min-h-screen bg-zeolf-bg" data-testid="user-management">
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
            <h1 className="text-xl font-semibold text-zeolf-text">User Management</h1>
          </div>
          
          <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
            <DialogTrigger asChild>
              <Button 
                className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
                data-testid="button-add-user"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Login Code
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="add-user-modal">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <Label htmlFor="newUserName">Full Name</Label>
                  <Input
                    id="newUserName"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="John Doe"
                    required
                    data-testid="input-user-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="newUserRole">Role</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger data-testid="select-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddUserModal(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
                    disabled={!newUserName.trim() || registerMutation.isPending}
                    data-testid="button-create-user"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Users Table */}
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>System Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Login Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-zeolf-blue rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-zeolf-text">{user.name}</div>
                            <div className="text-sm text-zeolf-text-secondary capitalize">
                              {user.role.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {user.loginCode}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLoginCode(user.loginCode)}
                            data-testid={`button-copy-${user.id}`}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant={user.isActive ? "default" : "secondary"}
                          className={user.isActive ? "bg-zeolf-success" : ""}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="text-sm text-zeolf-text-secondary">
                        {user.lastActive 
                          ? formatDistance(new Date(user.lastActive), new Date(), { addSuffix: true })
                          : "Never"
                        }
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                            disabled={updateUserMutation.isPending || user.id === currentUser?.id}
                            data-testid={`button-toggle-${user.id}`}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="w-3 h-3 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {users.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-zeolf-text mb-2">No users found</h3>
                <p className="text-zeolf-text-secondary mb-4">
                  Create the first user account to get started.
                </p>
                <Button 
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-zeolf-blue hover:bg-zeolf-blue-dark"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
