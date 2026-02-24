import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  HelpCircle, 
  Mail, 
  Shield, 
  CreditCard,
  MessageSquare,
  Swords,
  User,
  Sparkles,
  Smartphone,
  Lock,
  Clock,
  ArrowLeft
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import emailjs from "@emailjs/browser";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
});

const HelpSupport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const glossaryRef = useRef<HTMLDivElement>(null);
  const faqParam = searchParams.get("faq");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-scroll and open glossary FAQ when navigating with ?faq=predictions-glossary
  useEffect(() => {
    if (faqParam === "predictions-glossary" && glossaryRef.current) {
      setTimeout(() => {
        glossaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [faqParam]);

  const supportCards = [
    {
      icon: Mail,
      title: "Email Support",
      description: "propredictsupp@gmail.com",
      color: "text-primary",
    },
    {
      icon: Shield,
      title: "Privacy Inquiries",
      description: "propredictsupp@gmail.com",
      color: "text-muted-foreground",
    },
    {
      icon: CreditCard,
      title: "Billing Support",
      description: "propredictsupp@gmail.com",
      color: "text-muted-foreground",
    },
  ];

  const faqCategories: { title: string; icon: any; color: string; questions: { q: string; a: React.ReactNode; highlight?: boolean }[] }[] = [
    {
      title: "Account & Subscription",
      icon: User,
      color: "text-primary",
      questions: [
        {
          q: "How do I upgrade to Premium?",
          a: "You can upgrade to Premium by visiting the 'Get Premium' page from the sidebar or clicking on the subscription badge in the header. Choose your preferred plan and complete the payment process."
        },
        {
          q: "How do I cancel my subscription?",
          a: "To cancel your subscription, go to Profile Settings and look for the subscription management section. You can cancel anytime and retain access until your current billing period ends."
        },
        {
          q: "How does billing work?",
          a: "You can choose between monthly or annual billing. Annual plans offer savings compared to monthly. You can upgrade or downgrade your plan anytime, and changes take effect immediately with prorated billing adjustments."
        },
      ],
    },
    {
      title: "AI Predictions",
      icon: Sparkles,
      color: "text-accent",
      questions: [
        {
          q: "How accurate are your predictions?",
          a: "Our AI predictions are based on comprehensive statistical analysis of team performance, historical data, and current form. While we strive for high accuracy, remember that sports outcomes are inherently unpredictable."
        },
        {
          q: "How do I access predictions?",
          a: "Free users can access Daily Predictions. To access Pro Insights and Premium Predictions, upgrade your subscription plan. Each tier provides access to more detailed analysis and higher-confidence predictions."
        },
        {
          q: "When are new predictions posted?",
          a: "New predictions are posted daily, typically several hours before matches begin. Premium members receive early access to predictions as soon as they're generated."
        },
        {
          highlight: true,
           q: "What do the prediction markets and values mean?",
          a: (
            <ul className="space-y-1.5 list-none pl-0">
              <li><span className="font-semibold text-foreground">1X2</span> — 1 = Home Win, X = Draw, 2 = Away Win.</li>
              <li><span className="font-semibold text-foreground">BTTS (Both Teams to Score)</span> — Yes = both teams expected to score; No = at least one team keeps a clean sheet.</li>
              <li><span className="font-semibold text-foreground">Over/Under 1.5</span> — Over = 2+ total goals; Under = 0 or 1 goal.</li>
              <li><span className="font-semibold text-foreground">Over/Under 2.5</span> — Over = 3+ total goals; Under = 0, 1, or 2 goals.</li>
              <li><span className="font-semibold text-foreground">Over/Under 3.5</span> — Over = 4+ total goals; Under = 3 or fewer goals.</li>
              <li><span className="font-semibold text-foreground">Double Chance</span> — 1X = Home Win or Draw, X2 = Away Win or Draw, 12 = Home or Away Win (no draw).</li>
              <li><span className="font-semibold text-foreground">Correct Score</span> — The exact final score predicted by AI.</li>
              <li><span className="font-semibold text-foreground">DNB (Draw No Bet)</span> — If the match ends in a draw, the selection is void and confidence remains at 1 (push).</li>
              <li><span className="font-semibold text-foreground">T1 2+</span> — Home team scores 2 or more goals.</li>
              <li><span className="font-semibold text-foreground">T2 2+</span> — Away team scores 2 or more goals.</li>
              <li><span className="font-semibold text-foreground">ATX (Any Time Draw)</span> — A draw occurs at any point during the match (half-time or full-time).</li>
              <li><span className="font-semibold text-foreground">HT/FT (Half Time/Full Time)</span> — Predict the result at both half-time and full-time (e.g., 1/X = Home leads at HT, Draw at FT).</li>
              <li><span className="font-semibold text-foreground">GG/NG</span> — GG (Goal Goal) = both teams score; NG (No Goal) = at least one team does not score. Same as BTTS Yes/No.</li>
              <li><span className="font-semibold text-foreground">Clean Sheet</span> — A team concedes zero goals in the match.</li>
              <li><span className="font-semibold text-foreground">Win to Nil</span> — A team wins the match without conceding any goals.</li>
              <li><span className="font-semibold text-foreground">Handicap (-1, -2)</span> — A virtual goal advantage/disadvantage applied to a team before kickoff (e.g., -1 = team must win by 2+ goals).</li>
              <li><span className="font-semibold text-foreground">First Half Over/Under</span> — Goals total applies only to the first half (e.g., 1H Over 0.5 = at least 1 goal before half-time).</li>
              <li><span className="font-semibold text-foreground">Exact Goals</span> — Predict the exact number of total goals in the match (e.g., Exact 3 = exactly 3 goals scored).</li>
              <li><span className="font-semibold text-foreground">Odd/Even Goals</span> — Whether the total number of goals is an odd or even number.</li>
              <li><span className="font-semibold text-foreground">Confidence %</span> — How confident the AI model is in the prediction (higher = stronger signal).</li>
              <li><span className="font-semibold text-foreground">Combined Confidence Score</span> — The multiplied confidence of all selections in a combo.</li>
            </ul>
          )
        },
        {
          q: "What are AI Combos and how do they differ from single predictions?",
          a: "AI Predictions are individual match predictions (e.g., Team A to win, Over 2.5 goals). AI Combos bundle multiple AI Predictions into a single combined selection — similar to an accumulator. All selections in a combo must be correct for it to count as a win. Combos carry a higher Combined Confidence Score because the individual confidence values are multiplied together. They offer more detailed analysis but are riskier since every prediction must hit. Single predictions are safer and easier to follow, while combos are for users who want higher-value multi-match insights."
        },
      ],
    },
    {
      title: "Match Previews",
      icon: Sparkles,
      color: "text-emerald-400",
      questions: [
        {
          q: "What are Match Previews?",
          a: "Match Previews provide a detailed pre-match analysis for today's fixtures. Each preview includes form guides, head-to-head records, recent results, and key stats to help you understand the matchup before kickoff."
        },
        {
          q: "How do I use the statistics in Match Previews?",
          a: (
            <ul className="space-y-1.5 list-none pl-0">
              <li><span className="font-semibold text-foreground">Form Guide</span> — Shows each team's recent results (W/D/L) over the last 5 matches.</li>
              <li><span className="font-semibold text-foreground">Head-to-Head (H2H)</span> — Historical results between the two teams in previous meetings.</li>
              <li><span className="font-semibold text-foreground">Goals Scored/Conceded</span> — Average goals per match to gauge attacking and defensive strength.</li>
              <li><span className="font-semibold text-foreground">Home/Away Performance</span> — How each team performs at home vs away.</li>
              <li><span className="font-semibold text-foreground">League Filter</span> — Use the league search to quickly find matches from a specific competition.</li>
            </ul>
          )
        },
        {
          q: "Why don't I see tomorrow's matches?",
          a: "Match Previews only display today's fixtures. Finished matches are automatically filtered out so you always see the most relevant upcoming games."
        },
      ],
    },
    {
      title: "App & Technical",
      icon: Smartphone,
      color: "text-blue-400",
      questions: [
        {
          q: "How do I enable notifications?",
          a: "Go to Settings > Notifications to configure your push notification preferences. You can customize alerts for goals, match starts, and prediction updates."
        },
        {
          q: "The app is not loading properly",
          a: "Try clearing your browser cache and refreshing the page. If issues persist, try using a different browser or contact our support team."
        },
        {
          q: "How do I report a bug?",
          a: "Use the contact form below to report any bugs. Please include details about what you were doing, the device/browser you're using, and any error messages you see."
        },
        {
          q: "When is the content updated?",
          a: "All AI predictions, match previews, and statistics are refreshed daily at 00:00 UTC (midnight). Prediction results are automatically checked and updated every 30 minutes after matches finish. If you're in a different timezone, new content may appear slightly earlier or later relative to your local time."
        },
      ],
    },
    {
      title: "AI vs Members Arena",
      icon: Swords,
      color: "text-orange-400",
      questions: [
        {
          q: "What is the AI vs Members Arena?",
          a: "The Arena is a gamified prediction challenge where you compete against our AI. Pick outcomes for selected matches across Match Result (1X2), Goals (Over/Under 2.5), or BTTS markets — and earn points for every correct prediction."
        },
        {
          q: "How do I earn points and what's the reward?",
          a: "Each correct prediction earns you +1 point. Reach 1000 points and you earn a free 30-day Pro Access extension. Your points only reset after you claim the reward, so you never lose progress."
        },
        {
          q: "How many predictions can I make per day?",
          a: "Daily limits depend on your plan: Free users get 4 predictions per day, Pro users get 5, and Premium users get 6. Predictions are available for priority league matches only."
        },
        {
          q: "When are Arena predictions resolved?",
          a: "Predictions are automatically resolved every 30 minutes after matches finish. Your stats, points, and notifications update in real time — no manual action needed."
        },
        {
          q: "What do 'AI agrees' and 'AI challenged' badges mean?",
          a: "'AI agrees' means the AI's prediction matches yours — a confidence signal. 'AI challenged' means your pick differs from the AI's, adding a competitive edge to the experience."
        },
      ],
    },
    {
      title: "Privacy & Security",
      icon: Lock,
      color: "text-destructive",
      questions: [
        {
          q: "How is my data protected?",
          a: "We use industry-standard encryption and security measures to protect your data. Your personal information is never shared with third parties without your consent."
        },
        {
          q: "How do I delete my account?",
          a: "To delete your account and all associated data, visit Settings > Legal & Compliance > Data Deletion, or contact our support team directly."
        },
        {
          q: "Do you share my data with third parties?",
          a: "We do not sell or share your personal data with third parties for marketing purposes. Please review our Privacy Policy for complete details on data handling."
        },
      ],
    },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      contactSchema.parse(formData);
      
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const adminTemplateId = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !adminTemplateId || !publicKey) {
        throw new Error("EmailJS configuration is missing");
      }

      // Send admin notification email only
      await emailjs.send(
        serviceId,
        adminTemplateId,
        {
          name: formData.name,
          email: formData.email,
          title: formData.subject,
          message: formData.message,
        },
        publicKey
      );
      
      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24-48 hours.",
      });
      
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error("EmailJS error:", error);
        toast({
          title: "Failed to send message",
          description: "Please try again or email us directly.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>FAQ & Support – AI Sports Predictions | ProPredict</title>
        <meta name="description" content="Get help with ProPredict. Browse FAQs about subscriptions, AI predictions, and technical issues, or contact our support team." />
      </Helmet>
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(faqParam === "predictions-glossary" ? "/" : "/settings")}
        className="mb-3 h-7 text-xs gap-1"
      >
        <ArrowLeft className="h-3 w-3" />
        {faqParam === "predictions-glossary" ? "Back to Dashboard" : "Back to Settings"}
      </Button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-full border border-primary">
          <HelpCircle className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-semibold text-foreground">FAQ & Support</h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Get help with ProPredict</p>
        </div>
      </div>

      {/* Support Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {supportCards.map((card) => (
          <Card key={card.title} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-3 text-center">
              <card.icon className={`h-5 w-5 mx-auto mb-1.5 ${card.color}`} />
              <p className="text-xs font-medium text-foreground">{card.title}</p>
              <p className="text-[10px] text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <Card className="mb-4">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">Frequently Asked Questions</h2>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">
            Find answers to common questions about predictions, subscriptions, features, and more.
          </p>

          <div className="space-y-3">
            {faqCategories.map((category) => {
              const isGlossaryCategory = category.title === "Tips & Predictions";
              const glossaryDefaultValue = (faqParam === "predictions-glossary" && isGlossaryCategory) ? "Tips & Predictions-3" : undefined;
              return (
              <div key={category.title} ref={isGlossaryCategory ? glossaryRef : undefined}>
                <div className="flex items-center gap-2 mb-2">
                  <category.icon className={`h-3.5 w-3.5 ${category.color}`} />
                  <h3 className="text-xs font-medium text-foreground">{category.title}</h3>
                </div>
                <Accordion type="single" collapsible className="space-y-1" defaultValue={glossaryDefaultValue}>
                  {category.questions.map((faq, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`${category.title}-${index}`}
                      className={`border rounded-md px-3 data-[state=open]:bg-muted/30 ${faq.highlight ? "border-destructive/60 bg-destructive/5" : "border-border"}`}
                    >
                      <AccordionTrigger className={`text-[11px] sm:text-xs hover:no-underline py-2 ${faq.highlight ? "text-destructive font-semibold" : "text-foreground"}`}>
                        {faq.highlight && <span className="mr-1.5">🔥</span>}
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-[10px] sm:text-xs text-muted-foreground pb-2">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contact Form */}
      <Card className="mb-4">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">Contact Support</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name" className="text-[10px] sm:text-xs">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`mt-1 h-8 text-xs ${errors.name ? "border-destructive" : ""}`}
                />
                {errors.name && <p className="text-[9px] text-destructive mt-0.5">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="email" className="text-[10px] sm:text-xs">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`mt-1 h-8 text-xs ${errors.email ? "border-destructive" : ""}`}
                />
                {errors.email && <p className="text-[9px] text-destructive mt-0.5">{errors.email}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="subject" className="text-[10px] sm:text-xs">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={formData.subject}
                onChange={(e) => handleInputChange("subject", e.target.value)}
                className={`mt-1 h-8 text-xs ${errors.subject ? "border-destructive" : ""}`}
              />
              {errors.subject && <p className="text-[9px] text-destructive mt-0.5">{errors.subject}</p>}
            </div>

            <div>
              <Label htmlFor="message" className="text-[10px] sm:text-xs">Message *</Label>
              <Textarea
                id="message"
                placeholder="Describe your issue or question in detail..."
                value={formData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                className={`mt-1 text-xs min-h-[80px] resize-y ${errors.message ? "border-destructive" : ""}`}
              />
              {errors.message && <p className="text-[9px] text-destructive mt-0.5">{errors.message}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full h-8 text-xs"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Response Time Notice */}
      <Card className="bg-muted/30">
        <CardContent className="p-3 flex items-center justify-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">
            Average response time: <span className="text-foreground font-medium">24-48 hours</span> · For urgent billing issues, please include your transaction ID
          </p>
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default HelpSupport;
