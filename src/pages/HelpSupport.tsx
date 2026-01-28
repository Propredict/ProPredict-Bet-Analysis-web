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
  User,
  Sparkles,
  Smartphone,
  Lock,
  Clock,
  ArrowLeft
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
});

const HelpSupport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const faqCategories = [
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
      title: "Tips & Predictions",
      icon: Sparkles,
      color: "text-accent",
      questions: [
        {
          q: "How accurate are your predictions?",
          a: "Our AI predictions are based on comprehensive statistical analysis of team performance, historical data, and current form. While we strive for high accuracy, remember that sports outcomes are inherently unpredictable."
        },
        {
          q: "How do I unlock tips?",
          a: "Free users can access Daily tips. To unlock Exclusive and Premium tips, upgrade your subscription plan. Each tier provides access to more detailed analysis and higher-confidence predictions."
        },
        {
          q: "When are new tips posted?",
          a: "New tips are posted daily, typically several hours before matches begin. Premium members receive early access to predictions as soon as they're generated."
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
          a: "Go to Settings > Notifications to configure your push notification preferences. You can customize alerts for goals, match starts, and tip updates."
        },
        {
          q: "The app is not loading properly",
          a: "Try clearing your browser cache and refreshing the page. If issues persist, try using a different browser or contact our support team."
        },
        {
          q: "How do I report a bug?",
          a: "Use the contact form below to report any bugs. Please include details about what you were doing, the device/browser you're using, and any error messages you see."
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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/settings")}
        className="mb-3 h-7 text-xs gap-1"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Settings
      </Button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-full border border-primary">
          <HelpCircle className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-semibold text-foreground">Help & Support</h1>
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
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqCategories.map((category) => (
              <div key={category.title}>
                <div className="flex items-center gap-2 mb-2">
                  <category.icon className={`h-3.5 w-3.5 ${category.color}`} />
                  <h3 className="text-xs font-medium text-foreground">{category.title}</h3>
                </div>
                <Accordion type="single" collapsible className="space-y-1">
                  {category.questions.map((faq, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`${category.title}-${index}`}
                      className="border border-border rounded-md px-3 data-[state=open]:bg-muted/30"
                    >
                      <AccordionTrigger className="text-[11px] sm:text-xs text-foreground hover:no-underline py-2">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-[10px] sm:text-xs text-muted-foreground pb-2">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
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
  );
};

export default HelpSupport;
