import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Lightbulb, Search, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface GrokAssistantProps {
  onTemplateGenerated?: (template: string) => void;
  onResearchCompleted?: (research: string) => void;
  documentType?: string;
  currentContent?: string;
}

export function GrokAssistant({ 
  onTemplateGenerated, 
  onResearchCompleted,
  documentType = "",
  currentContent = ""
}: GrokAssistantProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("template");
  const { toast } = useToast();

  // Template Generation
  const [templateForm, setTemplateForm] = useState({
    documentType: documentType || "memo",
    title: "",
    fileType: "word",
    recipientName: "",
    recipientAddress: "",
    recipientTitle: "",
    isInternal: true,
  });

  const templateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/ai/generate-template", data);
      return await response.json();
    },
    onSuccess: (data) => {
      onTemplateGenerated?.(data.template);
      toast({
        title: "Template generated",
        description: "Your document template has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error generating template",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Research
  const [researchForm, setResearchForm] = useState({
    topic: "",
    documentType: documentType || "memo",
    context: "",
  });

  const researchMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/ai/research", data);
      return await response.json();
    },
    onSuccess: (data) => {
      onResearchCompleted?.(data.research);
      toast({
        title: "Research completed",
        description: "AI research has been completed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error performing research",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Content Improvement
  const improveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/ai/improve-content", data);
      return await response.json();
    },
    onSuccess: (data) => {
      onTemplateGenerated?.(data.improvedContent);
      toast({
        title: "Content improved",
        description: "Your document content has been enhanced.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error improving content",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2"
          data-testid="button-grok-assistant"
        >
          <Bot className="w-4 h-4" />
          AI Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-zeolf-primary" />
            Grok AI Assistant
          </DialogTitle>
          <DialogDescription>
            Get AI-powered help with document templates, research, and content improvement.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template" data-testid="tab-template">
              <FileText className="w-4 h-4 mr-2" />
              Template
            </TabsTrigger>
            <TabsTrigger value="research" data-testid="tab-research">
              <Search className="w-4 h-4 mr-2" />
              Research
            </TabsTrigger>
            <TabsTrigger value="improve" data-testid="tab-improve">
              <Lightbulb className="w-4 h-4 mr-2" />
              Improve
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Document Template</CardTitle>
                <CardDescription>
                  Create a professional document template based on your specifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Document Type</Label>
                    <Select 
                      value={templateForm.documentType}
                      onValueChange={(value) => setTemplateForm(prev => ({...prev, documentType: value}))}
                    >
                      <SelectTrigger data-testid="select-template-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="press_release">Press Release</SelectItem>
                        <SelectItem value="memo">Memo</SelectItem>
                        <SelectItem value="internal_letter">Internal Letter</SelectItem>
                        <SelectItem value="external_letter">External Letter</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="report">Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>File Type</Label>
                    <Select 
                      value={templateForm.fileType}
                      onValueChange={(value) => setTemplateForm(prev => ({...prev, fileType: value}))}
                    >
                      <SelectTrigger data-testid="select-template-filetype">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="word">Word Document</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                        <SelectItem value="powerpoint">PowerPoint Presentation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Document Title</Label>
                  <Textarea
                    placeholder="Enter the document title or subject"
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm(prev => ({...prev, title: e.target.value}))}
                    rows={2}
                    data-testid="input-template-title"
                  />
                </div>

                {(templateForm.documentType.includes("letter") || templateForm.documentType === "external_letter") && (
                  <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium">Recipient Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Recipient Name</Label>
                        <input
                          className="w-full p-2 border rounded"
                          placeholder="Full name"
                          value={templateForm.recipientName}
                          onChange={(e) => setTemplateForm(prev => ({...prev, recipientName: e.target.value}))}
                          data-testid="input-recipient-name"
                        />
                      </div>
                      <div>
                        <Label>Title</Label>
                        <input
                          className="w-full p-2 border rounded"
                          placeholder="Job title"
                          value={templateForm.recipientTitle}
                          onChange={(e) => setTemplateForm(prev => ({...prev, recipientTitle: e.target.value}))}
                          data-testid="input-recipient-title"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Textarea
                        placeholder="Full address"
                        value={templateForm.recipientAddress}
                        onChange={(e) => setTemplateForm(prev => ({...prev, recipientAddress: e.target.value}))}
                        rows={3}
                        data-testid="input-recipient-address"
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => templateMutation.mutate(templateForm)}
                  disabled={templateMutation.isPending || !templateForm.title}
                  className="w-full bg-zeolf-primary hover:bg-zeolf-primary-dark"
                  data-testid="button-generate-template"
                >
                  {templateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Template...
                    </>
                  ) : (
                    "Generate Template"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="research" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Research Assistant</CardTitle>
                <CardDescription>
                  Get comprehensive research information for your document.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Research Topic</Label>
                  <Textarea
                    placeholder="What do you want to research? Be specific about the topic or question."
                    value={researchForm.topic}
                    onChange={(e) => setResearchForm(prev => ({...prev, topic: e.target.value}))}
                    rows={3}
                    data-testid="input-research-topic"
                  />
                </div>

                <div>
                  <Label>Document Type</Label>
                  <Select 
                    value={researchForm.documentType}
                    onValueChange={(value) => setResearchForm(prev => ({...prev, documentType: value}))}
                  >
                    <SelectTrigger data-testid="select-research-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="press_release">Press Release</SelectItem>
                      <SelectItem value="memo">Memo</SelectItem>
                      <SelectItem value="internal_letter">Internal Letter</SelectItem>
                      <SelectItem value="external_letter">External Letter</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Additional Context (Optional)</Label>
                  <Textarea
                    placeholder="Provide any additional context or specific requirements for the research"
                    value={researchForm.context}
                    onChange={(e) => setResearchForm(prev => ({...prev, context: e.target.value}))}
                    rows={3}
                    data-testid="input-research-context"
                  />
                </div>

                <Button
                  onClick={() => researchMutation.mutate(researchForm)}
                  disabled={researchMutation.isPending || !researchForm.topic}
                  className="w-full bg-zeolf-primary hover:bg-zeolf-primary-dark"
                  data-testid="button-start-research"
                >
                  {researchMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    "Start Research"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="improve" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Improve Document Content</CardTitle>
                <CardDescription>
                  Enhance your existing document with AI-powered improvements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Content</Label>
                  <Textarea
                    placeholder="Paste your document content here to improve it"
                    value={currentContent}
                    rows={8}
                    data-testid="input-improve-content"
                    readOnly={!!currentContent}
                  />
                </div>

                <Button
                  onClick={() => improveMutation.mutate({ 
                    content: currentContent, 
                    documentType: documentType || "memo" 
                  })}
                  disabled={improveMutation.isPending || !currentContent}
                  className="w-full bg-zeolf-primary hover:bg-zeolf-primary-dark"
                  data-testid="button-improve-content"
                >
                  {improveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Improving Content...
                    </>
                  ) : (
                    "Improve Content"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}