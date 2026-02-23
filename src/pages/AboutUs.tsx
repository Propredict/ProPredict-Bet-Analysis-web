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
      
       <div>
         <div className="flex items-center gap-2 mb-1">
           <Shield className="w-5 h-5 text-primary" />
           <h1 className="text-xl font-bold">About ProPredict</h1>
         </div>
         <p className="text-xs text-primary font-medium mb-4">Advanced AI Sports Analytics Platform</p>

         <div className="space-y-3">
           {/* Who We Are */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">Who We Are</h3>
             <p className="text-xs text-muted-foreground leading-relaxed mb-2">
               ProPredict is an AI-powered sports analytics platform focused on structured football data analysis and predictive modeling. Our system combines historical match statistics, performance indicators, and machine learning algorithms to generate probability-based insights designed to enhance understanding of match dynamics.
             </p>
             <p className="text-xs text-muted-foreground leading-relaxed">
               We analyze large datasets across multiple competitions to identify performance patterns, trends, and measurable indicators that may influence football outcomes. By integrating statistical modeling with contextual variables, ProPredict delivers transparent, data-driven insights in a clear and accessible format.
             </p>
           </div>

           {/* What We Do */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">What We Do</h3>
             <p className="text-xs text-muted-foreground mb-1.5">Our AI models evaluate key analytical factors including:</p>
             <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
               <li>Team form and performance consistency</li>
               <li>Head-to-head statistical history</li>
               <li>Goal expectancy and scoring efficiency metrics</li>
               <li>Possession trends and tactical structures</li>
               <li>Contextual match variables such as venue, schedule intensity, and fatigue impact</li>
             </ul>
             <p className="text-xs text-muted-foreground mt-1.5">Each insight is generated using historical data modeling and probability estimation techniques.</p>
           </div>

           {/* Our Approach */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">Our Approach</h3>
             <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">
               Football outcomes are influenced by dynamic and unpredictable variables. Statistical analysis estimates probabilities — not certainties.
             </p>
             <p className="text-xs text-muted-foreground">
               ProPredict does not guarantee results, outcomes, or performance. Our platform is designed strictly for informational, research, and educational purposes.
             </p>
           </div>

           {/* No Gambling Policy */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">No Gambling Policy</h3>
             <p className="text-xs text-muted-foreground font-medium mb-1.5">
               ProPredict does <strong className="text-foreground">NOT</strong> provide gambling, wagering, or real-money gaming services.
             </p>
             <p className="text-xs text-muted-foreground">
               We do not facilitate financial transactions, process wagers, or connect users with bookmakers or betting operators.
             </p>
           </div>

           {/* Our Mission */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">Our Mission</h3>
             <p className="text-xs text-muted-foreground leading-relaxed">
               Our mission is to make advanced sports analytics accessible, structured, and easy to interpret — empowering users with knowledge and data-driven insights rather than speculative promises.
             </p>
           </div>

           {/* Contact */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">Contact</h3>
             <p className="text-xs text-muted-foreground mb-1">For any inquiries, please contact us at:</p>
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
