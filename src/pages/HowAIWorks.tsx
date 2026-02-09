import { Helmet } from "react-helmet-async";
import { Brain, Database, Users, GitCompare, Cpu, Layers, Shield, CheckCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const HowAIWorks = () => {
  return (
    <>
      <Helmet>
        <title>How AI Predictions Work – ProPredict</title>
        <meta
          name="description"
          content="Learn how ProPredict uses AI, machine learning, and football statistics to generate match predictions and insights for informational purposes."
        />
      </Helmet>

      <div className="space-y-3 md:space-y-4">
        {/* Page Header */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/20">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-foreground">How AI Predictions Work</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Understanding ProPredict's AI-powered analysis system</p>
            </div>
          </div>
        </div>

        {/* Introduction Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Introduction</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              ProPredict is an AI-powered sports analysis platform designed to help users better understand football matches through data, statistics, and machine learning models. Our system analyzes large volumes of historical and real-time data to generate predictions, insights, and structured match evaluations.
            </p>
            <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
              <p className="text-[10px] md:text-xs text-primary font-medium">
                ⚠️ All information provided on ProPredict is for informational and educational purposes only. We do not promote or facilitate gambling activities.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Data Collection */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-accent/20">
                  <Database className="h-4 w-4 text-accent" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-foreground">Data Collection & Match Selection</h3>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                Our AI system continuously collects and processes football-related data from multiple sources:
              </p>
              <ul className="space-y-1">
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Upcoming fixtures across major and minor leagues</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Team performance history</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>League standings and trends</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Match schedules and contextual factors</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Team Statistics */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-success/20">
                  <Users className="h-4 w-4 text-success" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-foreground">Team & Player Statistics</h3>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                For every analyzed match, ProPredict evaluates statistical indicators:
              </p>
              <ul className="space-y-1">
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Recent team form (home and away)</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Goals scored and conceded</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Win, draw, and loss patterns</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Offensive and defensive consistency</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* H2H Analysis */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-warning/20">
                  <GitCompare className="h-4 w-4 text-warning" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-foreground">Head-to-Head (H2H) Analysis</h3>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                Our AI reviews previous encounters between teams to identify:
              </p>
              <ul className="space-y-1">
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Long-term dominance patterns</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Goal frequency trends</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Match tempo and outcomes</span>
                </li>
              </ul>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-2 italic">
                H2H data is combined with current form and league context.
              </p>
            </CardContent>
          </Card>

          {/* AI Modeling */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-primary/20">
                  <Cpu className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-foreground">AI Modeling & Prediction Logic</h3>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                Key characteristics of our machine learning approach:
              </p>
              <ul className="space-y-1">
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Multi-factor analysis (not single statistic)</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Adaptive weighting of recent vs historical data</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Continuous learning as new matches are played</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Probability distributions, not fixed outcomes</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Smart Tickets */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-violet-500/20">
                  <Layers className="h-4 w-4 text-violet-500" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-foreground">AI Combos & Combined Analysis</h3>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                ProPredict groups matches into structured combinations by evaluating:
              </p>
              <ul className="space-y-1">
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Statistical compatibility between matches</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Risk balance across different leagues</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Overall data confidence levels</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Transparency */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-destructive/20">
                  <Shield className="h-4 w-4 text-destructive" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-foreground">Transparency & Responsible Use</h3>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                We strongly encourage users to:
              </p>
              <ul className="space-y-1">
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Use predictions as analytical reference only</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Make independent decisions</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>Treat all insights as informational content</span>
                </li>
              </ul>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-2 italic">
                Football has unpredictable factors like injuries and refereeing.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Conclusion */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-primary/20">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-xs md:text-sm font-semibold text-foreground">Conclusion</h3>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              ProPredict combines AI, statistics, and football data analysis to offer users a clearer and more structured view of upcoming matches. Our goal is to provide transparency, education, and data-driven insights — not to promote gambling or financial risk-taking.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default HowAIWorks;
