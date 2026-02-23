import { Helmet } from "react-helmet-async";
import { Brain, Database, Users, GitCompare, Cpu, Layers, Shield, CheckCircle, Sparkles, TrendingUp, BarChart3, ArrowRight, Target, RefreshCw, LineChart, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AdSlot from "@/components/ads/AdSlot";

const DataFlowStep = ({ step, title, description, icon: Icon }: { step: number; title: string; description: string; icon: React.ElementType }) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
      {step}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      </div>
      <p className="text-[10px] md:text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);

const AccuracyBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] md:text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}%</span>
    </div>
    <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const HowAIWorks = () => {
  return (
    <>
      <Helmet>
        <title>AI Methodology – How AI Predictions Work | ProPredict</title>
        <meta
          name="description"
          content="Learn how ProPredict uses machine learning, predictive analytics, and data science to estimate outcome probabilities for football matches based on historical and real-time data."
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
              <h1 className="text-sm sm:text-base font-bold text-foreground">🧠 How Our AI Prediction Model Works</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                Learn how ProPredict uses machine learning and data analytics to estimate outcome probabilities based on historical and real-time data.
              </p>
            </div>
          </div>
        </div>

        {/* Introduction Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">AI Prediction Methodology</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              ProPredict uses advanced predictive analytics and machine learning to analyze structured sports data and estimate statistically probable outcomes for upcoming football matches. This process is grounded in data science and probability modeling.
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Our system evaluates multiple data points, including historical match statistics, team performance trends, player and squad metrics, recent form indicators and situational variables.
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              The AI model processes this information using trained algorithms that identify patterns and relationships within the data. Based on these patterns, the model produces probability estimates for potential match outcomes.
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              These predictions are analytical insights generated from data, not guaranteed outcomes. The goal is to help users understand the statistical likelihood of events using modern AI techniques.
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              ProPredict continuously refines its models by comparing past predictions with observed results, improving accuracy over time through model evaluation and iterative learning.
            </p>
            <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
              <p className="text-[10px] md:text-xs text-primary font-medium">
                ⚠️ All predictions are statistical estimates intended for informational and educational purposes only.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Visual Data Flow Diagram */}
        <Card className="bg-card border-border">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-primary/20">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Data → AI Model → Probability Score</h2>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-0 justify-between p-3 rounded-lg bg-muted/30 border border-border">
              {[
                { icon: Database, label: "Raw Data", sub: "Stats & Metrics" },
                { icon: RefreshCw, label: "Preprocessing", sub: "Cleaning & Normalization" },
                { icon: Cpu, label: "AI Model", sub: "Pattern Recognition" },
                { icon: Target, label: "Probability", sub: "Outcome Estimation" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 md:gap-0">
                  <div className="flex flex-col items-center text-center min-w-[80px]">
                    <div className="p-2 rounded-lg bg-primary/15 mb-1">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-[10px] font-semibold text-foreground">{item.label}</span>
                    <span className="text-[8px] text-muted-foreground">{item.sub}</span>
                  </div>
                  {i < 3 && <ArrowRight className="h-4 w-4 text-primary/50 mx-1 hidden md:block" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* What Data We Use */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-accent/20">
                  <Database className="h-4 w-4 text-accent" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-foreground">What Data We Use</h3>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                Our AI system continuously collects and processes structured football data from multiple verified sources:
              </p>
              <ul className="space-y-1">
                {[
                  "Historical match results and score distributions",
                  "Team performance trends (home & away)",
                  "Goals scored and conceded patterns",
                  "Squad strength and player availability indicators",
                  "League standings, form tables, and seasonal context",
                  "Situational variables (derby matches, scheduling density)",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* How Predictions Are Calculated */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-success/20">
                  <Cpu className="h-4 w-4 text-success" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-foreground">How Predictions Are Calculated</h3>
              </div>
              <div className="space-y-3">
                <DataFlowStep step={1} title="Data Collection" description="Automated ingestion of match statistics, team metrics, and contextual variables from verified data providers." icon={Database} />
                <DataFlowStep step={2} title="Data Preprocessing" description="Cleaning, normalization, and feature engineering to prepare structured datasets for model input." icon={RefreshCw} />
                <DataFlowStep step={3} title="Model Training" description="Machine learning algorithms identify statistical patterns and correlations across thousands of historical matches." icon={Cpu} />
                <DataFlowStep step={4} title="Outcome Probability Estimation" description="The trained model produces probability distributions for potential match outcomes (not fixed results)." icon={Target} />
                <DataFlowStep step={5} title="Validation & Refinement" description="Continuous backtesting against observed results to iteratively improve model accuracy over time." icon={TrendingUp} />
              </div>
            </CardContent>
          </Card>

          {/* H2H Analysis */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-warning/20">
                  <GitCompare className="h-4 w-4 text-warning" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-foreground">Head-to-Head Statistical Analysis</h3>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                Our AI reviews historical encounters between teams to identify recurring statistical patterns:
              </p>
              <ul className="space-y-1">
                {[
                  "Long-term dominance and performance patterns",
                  "Goal frequency and scoring distribution trends",
                  "Match tempo and outcome correlation",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-2 italic">
                H2H data is combined with current form and league context for multi-factor analysis.
              </p>
            </CardContent>
          </Card>

          {/* AI Modeling */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-primary/20">
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-foreground">Predictive Modeling Approach</h3>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                Key characteristics of our machine learning and probability forecasting approach:
              </p>
              <ul className="space-y-1">
                {[
                  "Multi-factor analysis across diverse data dimensions",
                  "Adaptive weighting of recent vs historical data",
                  "Continuous learning as new matches are played",
                  "Probability distributions, not fixed outcome claims",
                  "Statistical confidence scoring for each analytical signal",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Accuracy & Backtesting Section */}
        <Card className="bg-card border-border">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-success/20">
                <BarChart3 className="h-4 w-4 text-success" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Accuracy & Backtesting</h2>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mb-3">
              Transparency is a core principle. We continuously evaluate our model's performance through backtesting — comparing predicted probabilities against actual outcomes to measure and improve accuracy.
            </p>
            <div className="space-y-2.5 mb-3">
              <AccuracyBar label="Main Market Accuracy" value={62} color="bg-primary" />
              <AccuracyBar label="Over/Under Analysis" value={58} color="bg-success" />
              <AccuracyBar label="Both Teams Scoring" value={55} color="bg-warning" />
              <AccuracyBar label="Combined Forecasts" value={49} color="bg-accent" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Matches Analyzed", value: "50K+" },
                { label: "Leagues Covered", value: "120+" },
                { label: "Model Updates", value: "Daily" },
              ].map((stat, i) => (
                <div key={i} className="text-center p-2 rounded-lg bg-muted/30 border border-border">
                  <div className="text-sm font-bold text-primary">{stat.value}</div>
                  <div className="text-[8px] md:text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Example Prediction Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-primary/20">
                <LineChart className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Example: AI Probability Estimation</h2>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="text-center flex-1">
                  <div className="text-xs font-bold text-foreground">Team A</div>
                  <div className="text-[10px] text-muted-foreground">Home</div>
                </div>
                <div className="text-xs font-semibold text-primary px-3">VS</div>
                <div className="text-center flex-1">
                  <div className="text-xs font-bold text-foreground">Team B</div>
                  <div className="text-[10px] text-muted-foreground">Away</div>
                </div>
              </div>
              <div className="flex gap-1 mb-2">
                <div className="flex-1 text-center p-1.5 rounded bg-primary/15">
                  <div className="text-[10px] text-muted-foreground">Home</div>
                  <div className="text-xs font-bold text-primary">45%</div>
                </div>
                <div className="flex-1 text-center p-1.5 rounded bg-muted/50">
                  <div className="text-[10px] text-muted-foreground">Draw</div>
                  <div className="text-xs font-bold text-foreground">28%</div>
                </div>
                <div className="flex-1 text-center p-1.5 rounded bg-accent/15">
                  <div className="text-[10px] text-muted-foreground">Away</div>
                  <div className="text-xs font-bold text-accent">27%</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">
                  Confidence: <span className="font-semibold text-primary">78%</span> — Based on 15 data factors analyzed
                </span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 italic">
              * This is a simplified example. Actual model output considers dozens of variables and produces detailed probability distributions.
            </p>
          </CardContent>
        </Card>

        {/* What This Means For You */}
        <Card className="bg-card border-border">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-destructive/20">
                <Shield className="h-4 w-4 text-destructive" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">What This Means For You</h2>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
              Our predictions are statistical estimates intended for informational use only. They help you explore match data through the lens of predictive data analysis, probability forecasting, and machine learning sports analytics.
            </p>
            <ul className="space-y-1 mb-2">
              {[
                "Use predictions as analytical reference material",
                "Always make independent, informed decisions",
                "Treat all insights as data-driven informational content",
                "Understand that football has unpredictable factors (injuries, refereeing, conditions)",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
              <p className="text-[10px] md:text-xs text-primary font-medium">
                ⚠️ ProPredict does not promote or facilitate any financial risk-taking. All content is for informational and educational purposes only.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Model Limitations & Transparency */}
        <Card className="bg-card border-border">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-warning/20">
                <Shield className="h-4 w-4 text-warning" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Model Limitations & Transparency</h2>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
              No predictive model can account for every variable in a live sporting event. While our system leverages thousands of data points and statistical features, certain factors remain inherently unpredictable — such as last-minute injuries, weather disruptions, refereeing decisions, and individual player psychology.
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
              Our model operates on the principle of probabilistic reasoning: it does not claim to know the future, but rather estimates the statistical likelihood of outcomes based on observed historical patterns. This distinction is fundamental to how ProPredict works and how its outputs should be interpreted.
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
              We believe in full transparency regarding our methodology and its constraints. Our accuracy metrics are published openly, and we actively track how our probability estimates compare with real-world results across thousands of matches and multiple leagues worldwide. This ongoing evaluation process helps us identify areas for improvement and ensures our users have realistic expectations.
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              ProPredict is committed to responsible AI usage. We do not exaggerate the capabilities of our system, and we strongly encourage all users to treat the predictions as one of many informational inputs — never as definitive forecasts or guarantees of any kind.
            </p>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border-primary/30">
          <CardContent className="p-4 md:p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm md:text-base font-bold text-foreground">Experience Our AI Model in Action</h2>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mb-3 max-w-md mx-auto">
              See how our machine learning sports analytics platform processes real match data and generates live probability forecasts.
            </p>
            <Link to="/ai-predictions">
              <Button size="sm" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                View Live Predictions
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Footer Ad */}
        <AdSlot />
      </div>
    </>
  );
};

export default HowAIWorks;
