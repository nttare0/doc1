import { useParams, useLocation } from "wouter";
import { DocumentEditor } from "@/components/document-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Document Not Found</h1>
        <Button onClick={() => navigate("/")} data-testid="button-back-home">
          Go Back Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mr-4"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
      
      <DocumentEditor documentId={id} />
    </div>
  );
}