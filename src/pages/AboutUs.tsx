import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Users, Shield, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/settings")} 
            className="mb-3 h-7 text-xs gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Settings
          </Button>
          <h1 className="text-4xl font-bold mb-4">About Us</h1>
          <p className="text-muted-foreground mb-8">Learn more about ProPredict and our mission</p>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  ProPredict is dedicated to providing sports enthusiasts with AI-powered predictions and 
                  insights to enhance their understanding of football matches. Our goal is to deliver 
                  accurate analysis and valuable information to help users make informed decisions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  What We Offer
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>AI-powered match predictions with detailed analysis</li>
                  <li>Live scores and real-time match updates</li>
                  <li>Comprehensive league statistics and standings</li>
                  <li>Expert betting tips from experienced analysts</li>
                  <li>Curated betting tickets with multiple selections</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Our Team
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Our team consists of passionate sports analysts, data scientists, and developers 
                  who work together to bring you the most accurate predictions possible. We combine 
                  advanced AI algorithms with human expertise to deliver reliable insights.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Our Commitment
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  We are committed to responsible gambling practices. ProPredict is strictly for 
                  entertainment purposes and is intended for users aged 18 and above. We do not 
                  accept bets or process any payments. Always gamble responsibly.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
