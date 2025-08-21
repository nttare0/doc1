import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDocumentSchema, type CreateDocument } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FileText, FileSpreadsheet, Presentation, Loader2 } from "lucide-react";

interface DocumentCreatorProps {
  open?: boolean;
  onClose?: () => void;
  folderId?: string;
  onDocumentCreated?: () => void;
  onSuccess?: () => void;
}

const documentTypeOptions = [
  { value: "press_release", label: "Press Release", code: "PR" },
  { value: "memo", label: "Memo", code: "MEMO" },
  { value: "internal_letter", label: "Internal Letter", code: "IL" },
  { value: "external_letter", label: "External Letter", code: "EL" },
  { value: "contract", label: "Contract", code: "CON" },
  { value: "follow_up", label: "Follow-up", code: "FU" },
  { value: "report", label: "Report", code: "RPT" },
];

const fileTypeIcons = {
  word: FileText,
  excel: FileSpreadsheet,
  powerpoint: Presentation,
};

export function DocumentCreator({ open, onClose, folderId, onDocumentCreated, onSuccess }: DocumentCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRecipientFields, setShowRecipientFields] = useState(false);

  const form = useForm<CreateDocument>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      documentType: "memo",
      title: "",
      fileType: "word",
      isInternal: true,
      recipientName: "",
      recipientAddress: "",
      recipientTitle: "",
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: CreateDocument) => {
      const requestData = folderId ? { ...data, folderId } : data;
      const response = await apiRequest("POST", "/api/documents/create", requestData);
      return await response.json();
    },
    onSuccess: (document) => {
      toast({
        title: "Document created successfully",
        description: `${document.name} has been created with code ${document.documentCode}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      if (folderId) {
        queryClient.invalidateQueries({ queryKey: ["/api/folders", folderId, "documents"] });
      }
      if (open !== undefined) {
        onClose?.();
      } else {
        setIsOpen(false);
      }
      form.reset();
      onDocumentCreated?.();
      onSuccess?.();
      // Redirect to document editor
      window.location.href = `/document/edit/${document.id}`;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const watchDocumentType = form.watch("documentType");
  const watchFileType = form.watch("fileType");

  // Show recipient fields for letters
  const isLetter = watchDocumentType === "internal_letter" || watchDocumentType === "external_letter";

  const onSubmit = (data: CreateDocument) => {
    createDocumentMutation.mutate(data);
  };

  const selectedDocType = documentTypeOptions.find(opt => opt.value === watchDocumentType);
  const FileTypeIcon = fileTypeIcons[watchFileType];

  const dialogOpen = open !== undefined ? open : isOpen;
  const handleOpenChange = onClose || ((open: boolean) => setIsOpen(open));

  const DialogComponent = () => (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {open === undefined && (
        <Button 
          className="bg-zeolf-primary hover:bg-zeolf-primary-dark"
          onClick={() => setIsOpen(true)}
          data-testid="button-create-document"
        >
          <FileText className="w-4 h-4 mr-2" />
          Create Document
        </Button>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="document-creator-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTypeIcon className="h-5 w-5" />
            Create New Document
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Document Type Selection */}
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-document-type">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                              {option.code}
                            </span>
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Type Selection */}
            <FormField
              control={form.control}
              name="fileType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Format</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-file-type">
                        <SelectValue placeholder="Select file format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="word">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Microsoft Word Document
                        </div>
                      </SelectItem>
                      <SelectItem value="excel">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Microsoft Excel Spreadsheet
                        </div>
                      </SelectItem>
                      <SelectItem value="powerpoint">
                        <div className="flex items-center gap-2">
                          <Presentation className="h-4 w-4" />
                          Microsoft PowerPoint Presentation
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={`Enter ${selectedDocType?.label.toLowerCase()} title...`}
                      data-testid="input-document-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Internal/External Toggle for Letters */}
            {isLetter && (
              <FormField
                control={form.control}
                name="isInternal"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <FormLabel>Letter Type</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {field.value ? "Internal letter (within organization)" : "External letter (to outside recipients)"}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-letter-type"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* Recipient Information for Letters */}
            {isLetter && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Recipient Information</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRecipientFields(!showRecipientFields)}
                    data-testid="toggle-recipient-fields"
                  >
                    {showRecipientFields ? "Hide" : "Add"} Recipient Details
                  </Button>
                </div>
                
                {showRecipientFields && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recipientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter recipient's full name" data-testid="input-recipient-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recipientTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Title/Position</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Chief Executive Officer, Department Manager" data-testid="input-recipient-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recipientAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Enter complete mailing address"
                              rows={3}
                              data-testid="input-recipient-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Document Preview Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Document Preview</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Type:</span> {selectedDocType?.label}</p>
                <p><span className="font-medium">Code:</span> {selectedDocType?.code}-2024-XXX (auto-generated)</p>
                <p><span className="font-medium">Format:</span> {watchFileType.toUpperCase()}</p>
                <p><span className="font-medium">Header:</span> ZEOLF Technology logo with creation date</p>
                <p><span className="font-medium">Footer:</span> Document type and code number</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createDocumentMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createDocumentMutation.isPending}
                data-testid="button-create-document"
              >
                {createDocumentMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Document
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  return <DialogComponent />;
}