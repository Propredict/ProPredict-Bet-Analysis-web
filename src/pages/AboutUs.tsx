import { Helmet } from "react-helmet-async";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AboutUs = () => {
  const navigate = useNavigate();
  
  return (
    <>
      <Helmet>
        <title>About Us – AI Sports Predictions | ProPredict</title>
        <meta name="description" content="ProPredict is an AI-powered sports analysis platform providing match insights, predictions, and statistics for informational and entertainment purposes." />
      </Helmet>
      <div className="section-gap">
      <Button 
        variant="ghost" 
        className="mb-2 h-7 text-xs gap-1" 
        onClick={() => navigate("/settings")}
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Settings
      </Button>
      
       <div className="max-w-3xl mx-auto">
         <div className="flex items-center gap-2 mb-1">
           <Shield className="w-5 h-5 text-primary" />
           <h1 className="text-xl font-bold">About ProPredict</h1>
         </div>
         <p className="text-xs text-primary font-medium mb-4">Advanced AI Sports Analytics Platform</p>

         <div className="space-y-3">
           {/* Advanced AI Sports Analysis */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">About ProPredict – Advanced AI Sports Analysis</h3>
             <div className="space-y-2">
               <p className="text-xs text-muted-foreground leading-relaxed">
                 ProPredict is an AI-powered sports analytics platform focused on football data analysis and predictive modeling. Our system combines historical match statistics, performance indicators, and machine learning algorithms to generate structured probability-based insights.
               </p>
               <p className="text-xs text-muted-foreground leading-relaxed">
                 Unlike traditional platforms, ProPredict does not provide gambling services or financial advice. We offer transparent, data-driven analysis to help users understand patterns and trends in football matches.
               </p>
               <p className="text-xs text-muted-foreground leading-relaxed">
                 Our AI models analyze key data points including team form, head-to-head statistics, goal expectancy indicators, possession trends, and contextual match variables — generating insights for informational and educational purposes only.
               </p>
               <p className="text-xs text-muted-foreground leading-relaxed">
                 ProPredict does not guarantee outcomes. Football is influenced by unpredictable factors, and statistical analysis estimates probabilities — not certainties. Our mission is to make sports analytics accessible, structured, and easy to interpret — empowering users with knowledge rather than promises.
               </p>
             </div>
           </div>

           {/* Original intro */}
           <div className="border border-border rounded-lg p-3">
             <p className="text-xs text-muted-foreground leading-relaxed mb-2">
               ProPredict is an advanced AI-powered sports analytics platform focused on structured football data analysis and predictive modeling. Our technology combines historical match statistics, performance indicators, and machine learning algorithms to generate probability-based insights designed to enhance understanding of match dynamics.
             </p>
             <p className="text-xs text-muted-foreground leading-relaxed">
               We analyze large datasets across multiple competitions to identify patterns, trends, and performance signals that may influence football outcomes. By integrating statistical modeling with contextual variables, ProPredict delivers transparent, data-driven insights in a structured and accessible format.
             </p>
           </div>

           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">What We Do</h3>
             <p className="text-xs text-muted-foreground mb-1.5">Our AI models evaluate key analytical factors including:</p>
             <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
               <li>Team form and performance consistency</li>
               <li>Head-to-head statistical history</li>
               <li>Goal expectancy and scoring efficiency metrics</li>
               <li>Possession patterns and tactical structures</li>
               <li>Match context variables such as venue, schedule intensity, and fatigue impact</li>
             </ul>
             <p className="text-xs text-muted-foreground mt-1.5">Each analysis is generated using historical data modeling and probability estimation techniques.</p>
           </div>

           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">Our Approach</h3>
             <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">
               Football outcomes are influenced by dynamic and unpredictable variables. Statistical modeling estimates probabilities — not certainties. ProPredict does not guarantee results, outcomes, or performance.
             </p>
             <p className="text-xs text-muted-foreground">
               Our platform is designed for informational, research, and educational purposes only.
             </p>
           </div>

           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">No Gambling Policy</h3>
             <p className="text-xs text-muted-foreground font-medium mb-1.5">
               ProPredict does NOT provide gambling, wagering, or real-money gaming services.
             </p>
             <p className="text-xs text-muted-foreground mb-2">
               We do not facilitate financial transactions, process wagers, or connect users to gambling operators.
             </p>
             <p className="text-xs text-muted-foreground italic">
               Our mission is to make advanced sports analytics accessible, structured, and easy to interpret — empowering users with data insights rather than speculative promises.
             </p>
           </div>

           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">Contact</h3>
             <p className="text-xs text-muted-foreground">If you have any questions, feel free to contact us:</p>
             <a href="mailto:propredictsupp@gmail.com" className="text-xs text-primary hover:underline">
               propredictsupp@gmail.com
             </a>
           </div>
         </div>
       </div>
    </div>
    </>
  );
};

export default AboutUs;
