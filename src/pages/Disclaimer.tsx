import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Disclaimer = () => {
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
            <CardTitle className="text-sm sm:text-base">Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-4 text-xs sm:text-sm text-muted-foreground">
            <p>Content will be added here.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Disclaimer;
