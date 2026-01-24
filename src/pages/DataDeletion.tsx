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

    setSubmitted(true);
    toast.success("Data deletion request submitted successfully");
  };

  return (
    <div className="section-gap">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/settings")} 
        className="mb-2 h-7 text-xs gap-1"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Settings
      </Button>
      
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h1 className="text-xl font-bold">Data Deletion Request</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Request the deletion of your personal data</p>

        <div className="space-y-3">
          {/* Privacy Rights */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Your Privacy Rights
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Depending on your jurisdiction, you may have the right to request deletion of your personal data. When
              you submit a deletion request, we will take reasonable steps to:
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li>Delete or anonymize your account and profile information</li>
              <li>Remove your email address from active systems</li>
              <li>Deactivate subscriptions linked to your account</li>
              <li>Remove stored preferences and settings</li>
              <li>Exclude you from marketing communications</li>
            </ul>
          </div>

          {/* What to Expect */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              What to Expect
            </h3>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li><strong className="text-foreground">Processing Time:</strong> We aim to process requests within 30 days</li>
              <li><strong className="text-foreground">Verification:</strong> We may contact you to confirm ownership of the account</li>
              <li><strong className="text-foreground">Confirmation:</strong> You will receive an email once processing is completed</li>
              <li><strong className="text-foreground">Retained Data:</strong> Certain data may be retained where required by law</li>
              <li><strong className="text-foreground">Service Providers:</strong> Where applicable, we may request deletion from providers under our control</li>
            </ul>
          </div>

          {/* Form */}
          {!submitted ? (
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-primary" />
                Submit Deletion Request
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email used for your account"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Please enter the email associated with your ProPredict account
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reason" className="text-xs">Reason for Deletion (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Optional feedback"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                  <p className="text-xs text-destructive font-medium">⚠️ This action cannot be undone</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Once your data is deleted, you will lose access to your account and any associated features.
                  </p>
                </div>

                <Button type="submit" variant="destructive" size="sm" className="w-full">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Submit Deletion Request
                </Button>
              </form>
            </div>
          ) : (
            <div className="border border-primary rounded-lg p-4 text-center">
              <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-2" />
              <h2 className="text-base font-bold mb-1">Request Submitted</h2>
              <p className="text-xs text-muted-foreground">
                Your data deletion request has been received. We will process it and notify you at{" "}
                <strong className="text-foreground">{email}</strong>.
              </p>
            </div>
          )}

          {/* Alternative Contact */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">Alternative Contact Method</h3>
            <p className="text-xs text-muted-foreground mb-1.5">You may also request data deletion by contacting us directly:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li>
                Email:{" "}
                <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">
                  propredictsupp@gmail.com
                </a>
              </li>
              <li>
                Subject: <strong className="text-foreground">Data Deletion Request</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataDeletion;
