import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Shield, Lock, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FolderSecurityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  onAccessGranted: () => void;
}

export function FolderSecurityModal({
  open,
  onOpenChange,
  folderId,
  folderName,
  onAccessGranted,
}: FolderSecurityModalProps) {
  const [securityCode, setSecurityCode] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const verifyAccessMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", `/api/folders/${folderId}/verify-access`, {
        securityCode: code,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Access granted",
        description: `You now have access to ${folderName}`,
      });
      onAccessGranted();
      onOpenChange(false);
      setSecurityCode("");
      setError("");
    },
    onError: (error: any) => {
      setError(error.message || "Invalid security code");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityCode.trim()) {
      setError("Please enter the security code");
      return;
    }
    setError("");
    verifyAccessMutation.mutate(securityCode.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-600" />
            Protected Folder
          </DialogTitle>
          <DialogDescription>
            This folder requires a security code to access. Please enter the code to continue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-lg">{folderName}</h3>
            <p className="text-sm text-gray-600">Enter security code to access this folder</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="security-code">Security Code</Label>
              <Input
                id="security-code"
                type="password"
                placeholder="Enter security code"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value)}
                className="text-center tracking-widest"
                data-testid="input-security-code"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                data-testid="button-cancel-access"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={verifyAccessMutation.isPending}
                className="flex-1"
                data-testid="button-verify-access"
              >
                {verifyAccessMutation.isPending ? "Verifying..." : "Access Folder"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}