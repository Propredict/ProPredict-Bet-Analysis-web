import { Helmet } from "react-helmet-async";
import { Brain, ArrowLeft, Database, Users, GitCompare, Cpu, Layers, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const HowAIWorks = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>How AI Predictions Work – ProPredict</title>
        <meta
          name="description"
          content="Learn how ProPredict uses AI, machine learning, and football statistics to generate match predictions and insights for informational purposes."
        />
      </Helmet>

      <div className="section-gap">
        <Button
          variant="ghost"
          className="mb-2 h-7 text-xs gap-1"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Dashboard
        </Button>

        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">How AI Predictions Work</h1>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Understanding ProPredict's AI-powered analysis system
          </p>

          {/* Introduction Card */}
          <div className="border border-border rounded-lg p-3 mb-4 bg-primary/5">
            <h3 className="font-semibold text-sm mb-1.5">Introduction</h3>
            <p className="text-xs text-muted-foreground mb-2">
              ProPredict is an AI-powered sports analysis platform designed to help users better understand football matches through data, statistics, and machine learning models. Our system analyzes large volumes of historical and real-time data to generate predictions, insights, and structured match evaluations.
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              All information provided on ProPredict is for informational and educational purposes only. We do not promote or facilitate gambling activities.
            </p>
          </div>

          {/* Accordion Sections */}
          <Accordion type="single" collapsible className="space-y-2">
            {/* Data Collection */}
            <AccordionItem value="data-collection" className="border border-border rounded-lg px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Data Collection & Match Selection</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground pb-3">
                <p className="mb-2">Our AI system continuously collects and processes football-related data from multiple sources, including:</p>
                <ul className="list-disc list-inside space-y-1 mb-2">
                  <li>Upcoming fixtures across major and minor leagues</li>
                  <li>Team performance history</li>
                  <li>League standings and trends</li>
                  <li>Match schedules and contextual factors</li>
                </ul>
                <p>Each match is evaluated individually before being included in AI analysis. Matches with insufficient data or unreliable statistics are automatically excluded to ensure higher analytical quality.</p>
              </AccordionContent>
            </AccordionItem>

            {/* Team Statistics */}
            <AccordionItem value="team-stats" className="border border-border rounded-lg px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Team & Player Statistics Analysis</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground pb-3">
                <p className="mb-2">For every analyzed match, ProPredict evaluates a wide range of statistical indicators, such as:</p>
                <ul className="list-disc list-inside space-y-1 mb-2">
                  <li>Recent team form (home and away)</li>
                  <li>Goals scored and conceded</li>
                  <li>Win, draw, and loss patterns</li>
                  <li>Offensive and defensive consistency</li>
                  <li>League-specific performance trends</li>
                </ul>
                <p>These statistics help the AI understand how teams typically perform under different conditions.</p>
              </AccordionContent>
            </AccordionItem>

            {/* H2H Analysis */}
            <AccordionItem value="h2h" className="border border-border rounded-lg px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Head-to-Head (H2H) Analysis</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground pb-3">
                <p className="mb-2">Head-to-head history is an important contextual factor in match analysis. Our AI reviews previous encounters between teams to identify:</p>
                <ul className="list-disc list-inside space-y-1 mb-2">
                  <li>Long-term dominance patterns</li>
                  <li>Goal frequency trends</li>
                  <li>Match tempo and outcomes</li>
                </ul>
                <p>H2H data is never used in isolation but combined with current form and league context to avoid outdated conclusions.</p>
              </AccordionContent>
            </AccordionItem>

            {/* AI Modeling */}
            <AccordionItem value="ai-modeling" className="border border-border rounded-lg px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Modeling & Prediction Logic</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground pb-3">
                <p className="mb-2">ProPredict uses machine learning models trained on historical football data. These models analyze patterns and correlations across thousands of matches to estimate possible match outcomes.</p>
                <p className="mb-2 font-medium">Key characteristics of our AI approach:</p>
                <ul className="list-disc list-inside space-y-1 mb-2">
                  <li>Multi-factor analysis (not based on a single statistic)</li>
                  <li>Adaptive weighting of recent vs historical data</li>
                  <li>Continuous learning as new matches are played</li>
                </ul>
                <p>Predictions are generated based on probability distributions rather than fixed outcomes, helping users understand possible scenarios instead of guaranteed results.</p>
              </AccordionContent>
            </AccordionItem>

            {/* Smart Tickets */}
            <AccordionItem value="smart-tickets" className="border border-border rounded-lg px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Smart Tickets & Combined Analysis</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground pb-3">
                <p className="mb-2">In addition to individual match insights, ProPredict can group selected matches into structured combinations. These combinations are generated by evaluating:</p>
                <ul className="list-disc list-inside space-y-1 mb-2">
                  <li>Statistical compatibility between matches</li>
                  <li>Risk balance across different leagues</li>
                  <li>Overall data confidence levels</li>
                </ul>
                <p>This feature is designed to demonstrate how multiple data-driven insights can be viewed together, not as a recommendation or guaranteed strategy.</p>
              </AccordionContent>
            </AccordionItem>

            {/* Transparency */}
            <AccordionItem value="transparency" className="border border-border rounded-lg px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Transparency & Responsible Use</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground pb-3">
                <p className="mb-2">ProPredict does not claim certainty or guaranteed accuracy. Football is influenced by many unpredictable factors such as injuries, refereeing decisions, and real-time events.</p>
                <p className="mb-2 font-medium">We strongly encourage users to:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use predictions as analytical reference only</li>
                  <li>Make independent decisions</li>
                  <li>Treat all insights as informational content</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Conclusion */}
          <div className="border border-primary/30 rounded-lg p-3 mt-4 bg-primary/5">
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Conclusion</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              ProPredict combines AI, statistics, and football data analysis to offer users a clearer and more structured view of upcoming matches. Our goal is to provide transparency, education, and data-driven insights — not to promote gambling or financial risk-taking.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default HowAIWorks;
