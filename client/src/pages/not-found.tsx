import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zeolf-bg">
      <Card className="w-full max-w-md mx-4 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-zeolf-error" />
          </div>
          <CardTitle className="text-3xl font-bold text-zeolf-text-primary">404</CardTitle>
          <p className="text-zeolf-text-secondary">Page Not Found</p>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-zeolf-text-secondary">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="space-y-2">
            <Link href="/">
              <Button className="w-full bg-zeolf-blue hover:bg-zeolf-blue-dark" data-testid="button-home">
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
