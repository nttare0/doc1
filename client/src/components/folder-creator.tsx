import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderPlus, Lock } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const createFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(100, "Name too long"),
  description: z.string().optional(),
  hasSecurityCode: z.boolean().default(false),
  securityCode: z.string().optional(),
});

type CreateFolderData = z.infer<typeof createFolderSchema>;

interface FolderCreatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function FolderCreator({ isOpen, onClose, onSuccess }: FolderCreatorProps) {
  const [open, setOpen] = useState(false);
  
  // Use external control when provided, otherwise use internal state
  const dialogOpen = isOpen !== undefined ? isOpen : open;
  const setDialogOpen = (newOpen: boolean) => {
    if (isOpen !== undefined) {
      if (!newOpen) onClose?.();
    } else {
      setOpen(newOpen);
    }
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateFolderData>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: {
      name: "",
      description: "",
      hasSecurityCode: false,
      securityCode: "",
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: CreateFolderData) => {
      const folderData = {
        ...data,
        description: data.description || null,
        securityCode: data.hasSecurityCode ? data.securityCode : null,
      };

      const response = await apiRequest("POST", "/api/folders", folderData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Folder created",
        description: "Your new folder has been created successfully.",
      });
      form.reset();
      setDialogOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating folder",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchHasSecurityCode = form.watch("hasSecurityCode");

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {/* Only show trigger when not controlled externally */}
      {isOpen === undefined && (
        <DialogTrigger asChild>
          <Button 
            size="sm" 
            className="bg-zeolf-primary hover:bg-zeolf-primary-dark text-white"
            data-testid="button-create-folder"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Create New Folder
          </DialogTitle>
          <DialogDescription>
            Create a new folder to organize your documents. Optionally add a security code for restricted access.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit((data) => createFolderMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Folder Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter folder name"
                      data-testid="input-folder-name"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter folder description"
                      rows={2}
                      data-testid="input-folder-description"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasSecurityCode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Security Code Protection
                    </FormLabel>
                    <FormDescription>
                      Require a security code to access this folder
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-security-code"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchHasSecurityCode && (
              <FormField
                control={form.control}
                name="securityCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Code</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Enter security code"
                        data-testid="input-security-code"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Users will need this code to access the folder contents
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-testid="button-cancel-folder"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createFolderMutation.isPending}
                data-testid="button-submit-folder"
                className="bg-zeolf-primary hover:bg-zeolf-primary-dark"
              >
                {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}