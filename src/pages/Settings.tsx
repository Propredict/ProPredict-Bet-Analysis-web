import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, FileText, Shield, Trash2, ScrollText, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();

  const legalItems = [
    { label: "Disclaimer", icon: Shield, path: "/disclaimer" },
    { label: "Privacy Policy", icon: FileText, path: "/privacy-policy" },
    { label: "Terms of Service", icon: ScrollText, path: "/terms-of-service" },
    { label: "Data Deletion", icon: Trash2, path: "/data-deletion" },
  ];

  return (
    <DashboardLayout>
      <div className="p-2 sm:p-4 md:p-6 section-gap">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-3 h-7 text-xs gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Dashboard
        </Button>

        <div className="space-y-3">
          {/* Account Section */}
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <Button
                variant="ghost"
                onClick={() => navigate("/profile")}
                className="w-full justify-between h-9 text-xs"
              >
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  <span>Profile Settings</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>

          {/* Legal & Compliance Section */}
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base">Legal & Compliance</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 space-y-1">
              {legalItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className="w-full justify-between h-9 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
