import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://propredict.me"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Terms of Service",
        "item": "https://propredict.me/terms-of-service"
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Terms of Service – ProPredict</title>
        <meta name="description" content="Read the terms and conditions for using ProPredict. Understand your rights and responsibilities." />
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>
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
        <h1 className="text-xl font-bold mb-1">Terms of Service</h1>
        <p className="text-xs text-muted-foreground mb-4">Last updated: January 10, 2026</p>

         <div className="space-y-3">
           {/* Important Notice */}
           <div className="border border-amber-500/50 bg-amber-500/10 rounded-lg p-3">
             <div className="flex items-start gap-2">
               <Lock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
               <div>
                 <h3 className="font-semibold text-sm text-amber-500 mb-1">Important Notice – No Gambling Services</h3>
                 <p className="text-xs text-muted-foreground">
                   ProPredict does <strong className="text-foreground">NOT</strong> provide gambling or wagering services and does not allow users to place wagers.
                 </p>
               </div>
             </div>
           </div>

           {/* 1 */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">1. Acceptance of Terms</h3>
             <p className="text-xs text-muted-foreground">
               By accessing or using ProPredict ("the Service"), you agree to comply with and be bound by these Terms of Service. If you do not agree with these Terms, you must discontinue use of the Service immediately.
             </p>
           </div>

           {/* 2 */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">2. Description of the Service</h3>
             <p className="text-xs text-muted-foreground mb-2">
               ProPredict is a sports analytics platform that provides AI-generated football analysis, statistical insights, and probability-based evaluations.
             </p>
             <p className="text-xs text-muted-foreground font-medium mb-1">The Service includes:</p>
             <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-2">
               <li>Sports predictions and analytical insights</li>
               <li>Match statistics and historical performance data</li>
               <li>AI-based modeling and probability estimates</li>
               <li>Informational sports-related content</li>
             </ul>
             <p className="text-xs text-muted-foreground font-medium mb-1">ProPredict is strictly an informational and educational platform.</p>
             <p className="text-xs text-muted-foreground font-medium mb-1 mt-2">ProPredict does NOT:</p>
             <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
               <li>Provide gambling or wagering services</li>
               <li>Facilitate real-money transactions related to sports</li>
               <li>Process or accept wagers</li>
               <li>Operate as a bookmaker</li>
               <li>Connect users to gambling operators</li>
             </ul>
           </div>

           {/* 3 */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">3. Informational Purpose Disclaimer</h3>
             <p className="text-xs text-muted-foreground mb-2">
               All content available through ProPredict is provided for informational and entertainment purposes only.
             </p>
             <p className="text-xs text-muted-foreground mb-2">
               Football outcomes are influenced by unpredictable variables. Statistical modeling estimates probabilities based on historical data patterns and does not guarantee results.
             </p>
             <p className="text-xs text-muted-foreground mb-2">
               ProPredict does not provide financial, investment, legal, or gambling advice.
             </p>
             <p className="text-xs text-muted-foreground">
               Users are solely responsible for how they interpret and use the information provided by the Service.
             </p>
           </div>

           {/* 4 */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">4. Advertisements</h3>
             <p className="text-xs text-muted-foreground mb-2">
               ProPredict may display advertisements on the website and mobile application through third-party advertising partners, including Google AdSense and Google AdMob.
             </p>
             <p className="text-xs text-muted-foreground">
               Advertising providers may use cookies, device identifiers, or similar technologies to deliver personalized or non-personalized advertisements in accordance with their own privacy policies.
             </p>
           </div>

           {/* 5 */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">5. Subscriptions and Payments</h3>
             <p className="text-xs text-muted-foreground mb-2">
               Certain premium features may require a paid subscription.
             </p>
             <p className="text-xs text-muted-foreground mb-2">
               For website purchases, payments may be processed through authorized payment providers. For mobile applications, subscriptions are managed through the respective app store platform.
             </p>
             <p className="text-xs text-muted-foreground">
               Billing, renewals, and cancellations are subject to the policies of the platform where the subscription was purchased.
             </p>
           </div>

           {/* 6 */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">6. Age Requirement</h3>
             <p className="text-xs text-muted-foreground mb-1">
               You must be at least <strong className="text-foreground">18 years old</strong> to access or use ProPredict.
             </p>
             <p className="text-xs text-muted-foreground">
               By using the Service, you confirm that you meet this minimum age requirement.
             </p>
           </div>

           {/* 7 */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">7. Limitation of Liability</h3>
             <p className="text-xs text-muted-foreground mb-1">
               To the maximum extent permitted by applicable law, ProPredict shall not be liable for any direct, indirect, incidental, consequential, or financial losses arising from:
             </p>
             <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-2">
               <li>Use or misuse of the Service</li>
               <li>Reliance on analytical content</li>
               <li>Inaccuracies or interruptions</li>
             </ul>
             <p className="text-xs text-muted-foreground">
               Use of the Service is at your own risk.
             </p>
           </div>

           {/* 8 */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">8. Modifications to the Terms</h3>
             <p className="text-xs text-muted-foreground">
               We reserve the right to update or modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms.
             </p>
           </div>

           {/* 9 */}
           <div className="border border-border rounded-lg p-3">
             <h3 className="font-semibold text-sm mb-1.5">9. Contact Information</h3>
             <p className="text-xs text-muted-foreground">If you have any questions regarding these Terms of Service, you may contact us at:</p>
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

export default TermsOfService;
