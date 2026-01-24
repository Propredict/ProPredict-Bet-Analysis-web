import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, ShieldCheck, Mail, Clock, ArrowLeft } from "lucide-react";

const DataDeletion = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    // In production, this should send the request to your backend or support email
    setSubmitted(true);
    toast.success("Data deletion request submitted successfully");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container px-4 py-8 flex-1">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/settings")} 
          className="mb-3 h-7 text-xs gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Settings
        </Button>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Trash2 className="w-10 h-10 text-destructive" />
            <div>
              <h1 className="text-4xl font-bold">Data Deletion Request</h1>
              <p className="text-muted-foreground">Request the deletion of your personal data</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Privacy Rights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Your Privacy Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Depending on your jurisdiction, you may have the right to request deletion of your personal data. When
                  you submit a deletion request, we will take reasonable steps to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                  <li>Delete or anonymize your account and profile information</li>
                  <li>Remove your email address from active systems</li>
                  <li>Deactivate subscriptions linked to your account</li>
                  <li>Remove stored preferences and settings</li>
                  <li>Exclude you from marketing communications</li>
                </ul>
              </CardContent>
            </Card>

            {/* What to Expect */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  What to Expect
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>
                    <strong>Processing Time:</strong> We aim to process requests within 30 days
                  </li>
                  <li>
                    <strong>Verification:</strong> We may contact you to confirm ownership of the account
                  </li>
                  <li>
                    <strong>Confirmation:</strong> You will receive an email once processing is completed
                  </li>
                  <li>
                    <strong>Retained Data:</strong> Certain data may be retained where required by law
                  </li>
                  <li>
                    <strong>Service Providers:</strong> Where applicable, we may request deletion from providers under
                    our control
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Form */}
            {!submitted ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Submit Deletion Request
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email used for your account"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Please enter the email associated with your ProPredict account
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason for Deletion (Optional)</Label>
                      <Textarea
                        id="reason"
                        placeholder="Optional feedback"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm text-destructive font-medium">⚠️ This action cannot be undone</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Once your data is deleted, you will lose access to your account and any associated features. A
                        new account will be required to use ProPredict again.
                      </p>
                    </div>

                    <Button type="submit" variant="destructive" className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Submit Deletion Request
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary">
                <CardContent className="py-12 text-center">
                  <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Request Submitted</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your data deletion request has been received. We will process it and notify you at{" "}
                    <strong>{email}</strong>.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Alternative Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Alternative Contact Method</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">You may also request data deletion by contacting us directly:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                  <li>
                    Email:{" "}
                    <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">
                      propredictsupp@gmail.com
                    </a>
                  </li>
                  <li>
                    Subject: <strong>Data Deletion Request</strong>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DataDeletion;
