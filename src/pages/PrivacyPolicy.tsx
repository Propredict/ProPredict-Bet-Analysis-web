import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="p-2 sm:p-4 md:p-6 section-gap">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-3 h-7 text-xs gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Button>

        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-4 text-xs sm:text-sm text-muted-foreground">
            <p>
              This Privacy Policy describes how your personal information is collected, used, and shared when you use our application.
            </p>

            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Information We Collect</h3>
              <p>
                When you use our app, we collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">How We Use Your Information</h3>
              <p>
                We use the information that we collect to help us screen for potential risk and fraud, and more generally to improve and optimize our application.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Sharing Your Information</h3>
              <p>
                We do not share your Personal Information with third parties except to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Data Retention</h3>
              <p>
                When you use our application, we will maintain your information for our records unless and until you ask us to delete this information.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Changes</h3>
              <p>
                We may update this privacy policy from time to time in order to reflect changes to our practices or for other operational, legal or regulatory reasons.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Contact Us</h3>
              <p>
                For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PrivacyPolicy;
