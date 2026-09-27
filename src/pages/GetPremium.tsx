import { useState, useEffect, useCallback } from "react";
import appBannerImg from "@/assets/google-play-banner.jfif";
import premiumHeroImg from "@/assets/premium-hero-stadium.jpg";
import premiumCrownImg from "@/assets/premium-crown.png";
import { Helmet } from "react-helmet-async";
import {
  Check,
  X,
  Zap,
  Target,
  Brain,
  Bell,
  Clock,
  Shield,
  Star,
  Crown,
  Sparkles,
  Quote,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";
import { purchaseSubscription } from "@/hooks/useRevenueCat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Web-only: Stripe price IDs
const STRIPE_PRICES = {
  basic: {
    monthly: "price_1SuCcpL8E849h6yxv6RvooUp",
    annual: "price_1SpZ5OL8E849h6yxLP3NB1pi",
  },
  premium: {
    monthly: "price_1U7aifL8E849h6yxdv1QWtqC",
    annual: "price_1U7ajzL8E849h6yxMwrads83",
  },
};

// Android-specific plans (RevenueCat) - matches reference image exactly
const androidPlans = {
  monthly: [
    {
      id: "free",
      name: "Free / Besplatno",
      price: "€0",
      period: "/forever / /zauvek",
       description: "Watch ads to access daily predictions / Gledaj reklame za dnevne predikcije",
      buttonText: "Current Plan / Trenutni plan",
      buttonVariant: "outline" as const,
      features: [
        { text: "Daily Predictions (watch ads to access) / Dnevne predikcije (gledaj reklame)", included: true },
        { text: "Live scores / Rezultati uživo", included: true },
        { text: "League standings / Tabela liga", included: true },
        { text: "Basic predictions / Osnovne predikcije", included: true },
        { text: "Match Previews / Pregledi utakmica", included: false },
        { text: "Premium Insights / Premium uvidi", included: false },
        { text: "Premium Ticket / Premium tiket", included: false },
        { text: "Ad-free experience / Bez reklama", included: false },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "€14.99",
      period: "/month / /mesecno",
       description: "Full access to all predictions / Potpun pristup svim predikcijama",
      buttonText: "Get Premium / Kupi Premium",
      buttonVariant: "default" as const,
      features: [
        { text: "All Premium Features / Sve Premium funkcije", included: true },
        { text: "All Free & Premium Predictions / Sve Free i Premium predikcije", included: true },
        { text: "Daily Free & Premium Tickets / Dnevni Free i Premium tiketi", included: true },
        { text: "Live Scores & League Standings / Rezultati uživo i tabele", included: true },
        { text: "All Free & Premium Tips / Svi Free i Premium tipovi", included: true },
        { text: "VIP Match Analysis / VIP analiza utakmica", included: true },
        { text: "Full AI Analysis / Puna AI analiza", included: true },
        { text: "Unlimited Match Previews / Neograničeni pregledi utakmica", included: true },
        { text: "Priority Support / Prioritetna podrška", included: true },
        { text: "Ad-Free Experience / Bez reklama", included: true },
      ],
    },
  ],
  annual: [
    {
      id: "free",
      name: "Free / Besplatno",
      price: "€0",
      period: "/forever / /zauvek",
      description: "Watch ads to access daily predictions / Gledaj reklame za dnevne predikcije",
      buttonText: "Current Plan / Trenutni plan",
      buttonVariant: "outline" as const,
      features: [
        { text: "Daily Predictions (watch ads to access) / Dnevne predikcije (gledaj reklame)", included: true },
        { text: "Live scores / Rezultati uživo", included: true },
        { text: "League standings / Tabela liga", included: true },
        { text: "Basic predictions / Osnovne predikcije", included: true },
        { text: "Match Previews / Pregledi utakmica", included: false },
        { text: "Premium Insights / Premium uvidi", included: false },
        { text: "Premium Ticket / Premium tiket", included: false },
        { text: "Ad-free experience / Bez reklama", included: false },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "€119.99",
      period: "/year / /godišnje",
      savings: "€10.00/mo · Save 33% / €10.00/mes · Uštedi 33%",
      description: "Full access to all predictions / Potpun pristup svim predikcijama",
      buttonText: "Get Premium / Kupi Premium",
      buttonVariant: "default" as const,
      features: [
        { text: "All Premium Features / Sve Premium funkcije", included: true },
        { text: "All Free & Premium Predictions / Sve Free i Premium predikcije", included: true },
        { text: "Daily Free & Premium Tickets / Dnevni Free i Premium tiketi", included: true },
        { text: "Live Scores & League Standings / Rezultati uživo i tabele", included: true },
        { text: "All Free & Premium Tips / Svi Free i Premium tipovi", included: true },
        { text: "VIP Match Analysis / VIP analiza utakmica", included: true },
        { text: "Full AI Analysis / Puna AI analiza", included: true },
        { text: "Unlimited Match Previews / Neograničeni pregledi utakmica", included: true },
        { text: "Priority Support / Prioritetna podrška", included: true },
        { text: "Ad-Free Experience / Bez reklama", included: true },
      ],
    },
  ],
};

// Web plans (Stripe) - unchanged
const webPlans = {
  monthly: [
    {
      id: "free",
      name: "Free / Besplatno",
      price: "€0",
      period: "/forever / /zauvek",
      description: "Basic access to get started / Osnovni pristup za početak",
      buttonText: "Current Plan / Trenutni plan",
      buttonVariant: "outline" as const,
      features: [
         { text: "Full access to Daily Predictions / Potpun pristup dnevnim predikcijama", included: true },
        { text: "Free AI Basic predictions / Besplatne osnovne AI predikcije", included: true },
        { text: "Live scores / Rezultati uživo", included: true },
        { text: "League standings / Tabela liga", included: true },
        { text: "Ads supported / Podržano reklamama", included: true },
        { text: "Match Previews / Pregledi utakmica", included: false },
        { text: "Exclusive content / Ekskluzivni sadržaj", included: false },
        { text: "Premium content / Premium sadržaj", included: false },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "€14.99",
      period: "/month / /mesecno",
      description: "Full access to all content / Potpun pristup svim sadržajima",
      buttonText: "Get Premium / Kupi Premium",
      buttonVariant: "default" as const,
      features: [
        { text: "All Premium Features / Sve Premium funkcije", included: true },
        { text: "All Free & Premium Predictions / Sve Free i Premium predikcije", included: true },
        { text: "Daily Free & Premium Tickets / Dnevni Free i Premium tiketi", included: true },
        { text: "Live Scores & League Standings / Rezultati uživo i tabele", included: true },
        { text: "All Free & Premium Tips / Svi Free i Premium tipovi", included: true },
        { text: "VIP Match Analysis / VIP analiza utakmica", included: true },
        { text: "Full AI Analysis / Puna AI analiza", included: true },
        { text: "Unlimited Match Previews / Neograničeni pregledi utakmica", included: true },
        { text: "Priority Support / Prioritetna podrška", included: true },
        { text: "Ad-Free Experience / Bez reklama", included: true },
      ],
    },
  ],
  annual: [
    {
      id: "free",
      name: "Free / Besplatno",
      price: "€0",
      period: "/forever / /zauvek",
      description: "Basic access to get started / Osnovni pristup za početak",
      buttonText: "Current Plan / Trenutni plan",
      buttonVariant: "outline" as const,
      features: [
        { text: "Full access to Daily Predictions / Potpun pristup dnevnim predikcijama", included: true },
        { text: "Free AI Basic predictions / Besplatne osnovne AI predikcije", included: true },
        { text: "Live scores / Rezultati uživo", included: true },
        { text: "League standings / Tabela liga", included: true },
        { text: "Ads supported / Podržano reklamama", included: true },
        { text: "Match Previews / Pregledi utakmica", included: false },
        { text: "Exclusive content / Ekskluzivni sadržaj", included: false },
        { text: "Premium content / Premium sadržaj", included: false },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "€119.99",
      period: "/year / /godišnje",
      savings: "€10.00/mo · Save 33% / €10.00/mes · Uštedi 33%",
      description: "Full access to all content / Potpun pristup svim sadržajima",
      buttonText: "Get Premium / Kupi Premium",
      buttonVariant: "default" as const,
      features: [
        { text: "All Premium Features / Sve Premium funkcije", included: true },
        { text: "All Free & Premium Predictions / Sve Free i Premium predikcije", included: true },
        { text: "Daily Free & Premium Tickets / Dnevni Free i Premium tiketi", included: true },
        { text: "Live Scores & League Standings / Rezultati uživo i tabele", included: true },
        { text: "All Free & Premium Tips / Svi Free i Premium tipovi", included: true },
        { text: "VIP Match Analysis / VIP analiza utakmica", included: true },
        { text: "Full AI Analysis / Puna AI analiza", included: true },
        { text: "Unlimited Match Previews / Neograničeni pregledi utakmica", included: true },
        { text: "Priority Support / Prioritetna podrška", included: true },
        { text: "Ad-Free Experience / Bez reklama", included: true },
      ],
    },
  ],
};

const benefits = [
  { icon: Target, title: "Premium AI Predictions / Premium AI predikcije", description: "AI analysis with 90%+ historical accuracy / AI analiza sa 90%+ tačnosti" },
  { icon: Zap, title: "VIP Tickets / VIP tiketi", description: "Curated multi-match AI analysis and insights / Odabrana multi-match AI analiza i uvidi" },
  { icon: Brain, title: "Full AI Analysis / Puna AI analiza", description: "Complete AI-powered match analysis and insights / Kompletna AI analiza utakmica i uvidi" },
  { icon: Bell, title: "Real-time Alerts / Obaveštenja uživo", description: "Instant notifications for new predictions / Trenutna obaveštenja za nove predikcije" },
  { icon: Clock, title: "Priority Access / Prioritetan pristup", description: "Get insights before match kickoff / Uvidi pre početka utakmice" },
  { icon: Shield, title: "Flexible & Risk-Free / Fleksibilno i bez rizika", description: "Cancel or switch plans anytime, no questions asked / Otkaži ili promeni plan u bilo kom trenutku" },
];

const stats = [
  { value: "92%", label: "Prediction Accuracy / Tačnost predikcija" },
  { value: "10K+", label: "Active Users / Aktivnih korisnika" },
  { value: "500+", label: "Daily Analyses / Dnevnih analiza" },
  { value: "4.9", label: "User Rating / Ocena korisnika", isStar: true },
];

const testimonials = [
  { name: "Luka87", badge: "Analyst", rating: 5, comment: "The AI predictions are incredibly accurate. I've been using ProPredict for 3 months and the insights have been game-changing." },
  { name: "MilanTips", badge: "Premium", rating: 5, comment: "Best sports analysis platform I've found. The premium combos alone are worth the subscription." },
  { name: "ProAnalyst", badge: "Expert", rating: 4, comment: "Solid AI analysis with great accuracy. The match previews give me an edge every matchday." },
  { name: "StefanPro", badge: "Premium", rating: 5, comment: "Upgraded to Premium last month — the VIP insights are next level. Highly recommend!" },
  { name: "GoalMaster99", badge: "Analyst", rating: 5, comment: "I love how the AI breaks down every match. The confidence ratings are surprisingly reliable." },
  { name: "DataKing", badge: "Expert", rating: 4, comment: "Clean interface, accurate predictions, and outstanding value. What more could you ask for?" },
];

const faqs = [
  { question: "Can I cancel anytime? / Mogu li otkazati u bilo kom trenutku?", answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period. / Da, možeš otkazati pretplatu u bilo kom trenutku. Pristup ostaje do kraja obračunskog perioda." },
  { question: "How do Premium AI Predictions work? / Kako rade Premium AI predikcije?", answer: "Our AI models provide carefully curated predictions with detailed analysis, giving you deeper insights to understand match dynamics. / Naši AI modeli pružaju pažljivo odabrane predikcije sa detaljnom analizom za dublje razumevanje utakmica." },
  { question: "Can I change my plan anytime? / Mogu li promeniti plan u bilo kom trenutku?", answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is adjusted accordingly. / Da, možeš nadograditi ili sniziti plan u bilo kom trenutku. Promene stupaju na snagu odmah." },
  { question: "How do payments and refunds work? / Kako funkcionišu plaćanja i povraćaj novca?", answer: "Payments are processed securely via Stripe on the website or Google Play in the Android app. You can manage or cancel your subscription anytime in your account settings. Refund requests are handled according to the store's policy — contact us and we will help. / Plaćanja se bezbedno obrađuju preko Stripe-a na sajtu ili Google Play-a u Android aplikaciji. Pretplatom upravljaš ili je otkažeš u bilo kom trenutku u podešavanjima naloga. Zahtevi za povraćaj novca se rešavaju prema pravilima prodavnice — kontaktiraj nas i pomoći ćemo." },
  { question: "How can I contact support? / Kako da kontaktiram podršku?", answer: "You can reach us anytime via the Live Chat in the app or by email at propredictsupp@gmail.com. Premium users get priority support with faster responses. / Možeš nas kontaktirati u bilo kom trenutku preko Live Chat-a u aplikaciji ili emailom na propredictsupp@gmail.com. Premium korisnici imaju prioritetnu podršku sa bržim odgovorima." },
  { question: "What's the difference between website (Stripe) and Android app (Google Play) billing? / Koja je razlika između naplate na sajtu (Stripe) i u Android aplikaciji (Google Play)?", answer: "On the website, payments are processed by Stripe in EUR (€) — you buy and manage the subscription with your ProPredict account. In the Android app, billing goes through Google Play using your Google account, charged in your local currency, so prices can differ slightly due to local taxes and currency conversion. How to check your starting price and renewal price: on the website, the exact price (e.g. promo €9.99 first month, then €14.99/month) is shown on the Stripe checkout page before you confirm, and you'll get an email receipt for every renewal; in the Android app, Google Play shows both the intro offer and the renewal price on the subscription screen before purchase, and anytime later under Google Play → Payments & subscriptions → Subscriptions. Either way, the discounted price renews at the regular price automatically unless you cancel before the renewal date. / Na sajtu plaćanje ide preko Stripe-a u eurima (€) — pretplatu kupuješ i upravljaš njome sa svojim ProPredict nalogom. U Android aplikaciji naplata ide preko Google Play-a sa tvojim Google nalogom, u lokalnoj valuti, pa cene mogu da se razlikuju zbog lokalnih poreza i konverzije. Kako da proveriš početnu cenu i cenu obnove: na sajtu tačna cena (npr. promo €9.99 prvi mesec, pa €14.99 mesečno) stoji na Stripe stranici za plaćanje pre potvrde, a za svaku obnovu dobijaš email potvrdu; u aplikaciji Google Play prikazuje i početnu ponudu i cenu obnove na ekranu pretplate pre kupovine, a kasnije u Google Play → Plaćanja i pretplate → Pretplate. U oba slučaja popust cena se nakon popusta automatski obnavlja po regularnoj ceni, osim ako otkažeš pre datuma obnove." },
];

function TestimonialsSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const t = testimonials[current];
  const badgeColor = t.badge === "Premium" 
    ? "bg-violet-500/20 text-violet-400 border-violet-500/40" 
    : t.badge === "Expert" 
    ? "bg-warning/20 text-warning border-warning/40"
    : "bg-primary/20 text-primary border-primary/40";

  return (
    <Card className="p-4 bg-gradient-to-b from-card to-card/80 border-border/50 relative overflow-hidden">
      <div className="flex items-start gap-3 animate-fade-in" key={current}>
        <Quote className="h-5 w-5 text-primary/40 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground">{t.name}</span>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${badgeColor}`}>
              {t.badge}
            </Badge>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="h-3 w-3 text-warning fill-warning" />
              ))}
              {Array.from({ length: 5 - t.rating }).map((_, i) => (
                <Star key={i} className="h-3 w-3 text-muted-foreground/30" />
              ))}
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed italic">
            "{t.comment}"
          </p>
        </div>
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </Card>
  );
}

export default function GetPremium() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const { plan: currentPlan, subscriptionSource, isAuthenticated, refetch: refetchPlan } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  const navigate = useNavigate();

  // Cross-platform protection flags
  const isStripeSubOnAndroid = isAndroidApp && subscriptionSource === "stripe" && currentPlan !== "free";
  const isGoogleSubOnWeb = !isAndroidApp && subscriptionSource === "google_play" && currentPlan !== "free";

  // Both Android and Web now support monthly/annual toggle
  const currentPlans = isAndroidApp ? androidPlans[billingPeriod] : webPlans[billingPeriod];

  // Listen for RevenueCat purchase success on Android
  useEffect(() => {
    if (!isAndroidApp) return;

    const handlePurchaseSuccess = (event: CustomEvent<{ entitlements?: { pro?: boolean; premium?: boolean } }>) => {
      toast.success("Subscription activated successfully!");
      // Refresh entitlements
      refetchPlan();
      // Navigate back after successful purchase
      setTimeout(() => navigate(-1), 500);
    };

    const handleMessage = (event: MessageEvent) => {
      const data = typeof event.data === "string" ? (() => { try { return JSON.parse(event.data); } catch { return {}; } })() : event.data;
      const { type } = data || {};
      if (
        type === "PURCHASE_SUCCESS" ||
        type === "REVENUECAT_PURCHASE_SUCCESS" ||
        type === "REVENUECAT_ENTITLEMENTS_UPDATE"
      ) {
        toast.success("Subscription activated successfully!");
        refetchPlan();
        setTimeout(() => navigate(-1), 500);
      }
      // Handle RESTORE_SUCCESS — re-fetch plan from Supabase after webhook syncs
      if (type === "RESTORE_SUCCESS") {
        toast.success("Purchases restored! Updating your plan…");
        // Give RevenueCat webhook time to write to Supabase
        setTimeout(() => {
          refetchPlan();
        }, 2000);
      }
    };

    window.addEventListener("revenuecat-purchase-success", handlePurchaseSuccess as EventListener);
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("revenuecat-purchase-success", handlePurchaseSuccess as EventListener);
      window.removeEventListener("message", handleMessage);
    };
  }, [isAndroidApp, refetchPlan, navigate]);

  const handleSubscribe = async (planId: string) => {
    if (planId === "free" || currentPlan === planId) return;

    // Cross-platform protection: block purchases from wrong platform
    if (isStripeSubOnAndroid) {
      toast.error("Please manage your subscription on our website.");
      return;
    }
    if (isGoogleSubOnWeb) {
      toast.error("Please manage your subscription in the Android app.");
      return;
    }

    // Auth guard: block purchases for non-authenticated users
    if (!isAuthenticated) {
      toast.error("Please sign in to subscribe.");
      navigate("/login");
      return;
    }

    // Android: HARD BLOCK - use native bridge, never Stripe
    const android = (window as any).Android;
    if (android) {
      // Pass currentPlan so purchaseSubscription can detect upgrade vs downgrade
      purchaseSubscription(planId as "basic" | "premium", billingPeriod, currentPlan);
      return;
    }

    // Web: Stripe checkout
    const priceId = planId === "basic" 
      ? STRIPE_PRICES.basic[billingPeriod]
      : planId === "premium"
      ? STRIPE_PRICES.premium[billingPeriod]
      : null;

    if (!priceId) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId,
          successUrl: `${window.location.origin}/profile?payment=success&purchased_plan=${planId}&billing=${billingPeriod}`,
          cancelUrl: `${window.location.origin}/get-premium`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create checkout session");
      }

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Helmet>
      <title>Get Premium – Upgrade Your Plan | ProPredict</title>
      <meta name="description" content="Upgrade to Premium for full access to AI predictions, match previews, and ad-free experience. Flexible monthly and annual plans." />
      <meta property="og:title" content="Get Premium – ProPredict" />
      <meta property="og:description" content="Upgrade for full access to AI predictions, match previews, and ad-free experience." />
      <meta property="og:image" content="https://propredict.me/og-image.png" />
      <meta property="og:url" content="https://propredict.me/get-premium" />
      <meta property="og:type" content="website" />
    </Helmet>
    <div className="section-gap w-full px-3 sm:px-6 lg:px-8">
      {/* Sponsored: Betway affiliate banner at top */}
      <div className="mb-4">
      </div>

      {/* Hero — stadium banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 shadow-lg">
        <img
          src={premiumHeroImg}
          alt="Football stadium at night under floodlights"
          className="absolute inset-0 h-full w-full object-cover"
          width={1920}
          height={768}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-sidebar/70 via-sidebar/50 to-background" />
        <div className="relative px-4 py-10 sm:py-14 text-center space-y-3">
          <div className="flex items-center justify-center gap-2.5">
            <Crown className="h-7 w-7 sm:h-9 sm:w-9 text-warning drop-shadow" />
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white drop-shadow-lg tracking-tight">
              Upgrade to Premium
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-white/85 max-w-lg mx-auto leading-relaxed">
            Get full access to all features and take your football predictions to the next level. / Otključaj sve funkcije i podigni svoje predikcije na viši nivo.
          </p>
        </div>
      </div>

      {/* Cross-platform subscription protection banners */}
      {isStripeSubOnAndroid && (
        <Card className="p-4 border-warning/50 bg-warning/10 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">Manage Your Subscription</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your subscription was purchased on our website.
            For security and billing reasons, upgrades and changes must be made there.
          </p>
          <Button
            variant="default"
            size="sm"
            className="w-full text-xs h-9"
            onClick={() => {
              window.open("https://propredict.me/get-premium", "_blank");
            }}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Go to Website
          </Button>
        </Card>
      )}

      {isGoogleSubOnWeb && (
        <Card className="p-4 border-warning/50 bg-warning/10 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">Manage Subscription in App</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your subscription was purchased through Google Play.
            Please manage or upgrade it in the Android app.
          </p>
          <Button
            variant="default"
            size="sm"
            className="w-full text-xs h-9"
            onClick={() => {
              window.open("https://play.google.com/store/apps/details?id=com.propredict.app", "_blank");
            }}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Open Android App
          </Button>
        </Card>
      )}

      {/* Android: Google Play info banner + Manage Subscription (only when NOT Stripe sub) */}
      {isAndroidApp && !isStripeSubOnAndroid && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
          Subscriptions are processed via Google Play. Tap <span className="font-medium text-foreground">Get Premium</span> to continue.

          </p>
          {currentPlan !== "free" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                const android = (window as any).Android;
                if (android?.manageSubscription) {
                  android.manageSubscription();
                } else {
                  window.open("https://play.google.com/store/account/subscriptions", "_blank");
                }
              }}
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Manage Subscription
            </Button>
          )}
        </div>
      )}

      {/* Billing Toggle - Both Web and Android */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-card border border-border shadow-sm">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-5 py-2 text-xs font-semibold rounded-full transition-all ${
              billingPeriod === "monthly"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly / Mesečno
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-5 py-2 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
              billingPeriod === "annual"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual / Godišnje
            <Badge className="bg-primary/15 text-primary border-0 text-[9px] px-1.5">Save 33%</Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {currentPlans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const isPremium = plan.id === "premium";
          const isFree = plan.id === "free";
          const showPromo = isPremium && !isAndroidApp && billingPeriod === "monthly" && Date.now() < Date.parse("2026-10-28T23:00:00Z");

          return (
            <Card
              key={plan.id}
              className={`relative p-5 transition-all overflow-hidden ${
                isPremium
                  ? "border-2 border-violet-500/70 bg-gradient-to-b from-violet-500/10 via-card to-card shadow-[0_0_30px_rgba(139,92,246,0.25)] ring-1 ring-violet-400/30"
                  : isFree
                  ? "bg-card border-border"
                  : "bg-card border-border"
              }`}
            >
              {isPremium && (
                <>
                  <Badge className="absolute -top-0 right-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 text-[9px] px-2.5 py-1 rounded-b-lg rounded-t-none shadow">
                    <Crown className="h-2.5 w-2.5 mr-1" />
                    Best Value / Najbolja vrednost
                  </Badge>
                  <img
                    src={premiumCrownImg}
                    alt=""
                    loading="lazy"
                    className="absolute -bottom-4 -right-4 w-24 h-24 sm:w-28 sm:h-28 object-contain opacity-90 pointer-events-none select-none"
                  />
                </>
              )}

              <div className="text-center space-y-2 pt-3">
                <h3 className={`text-base font-bold ${isPremium ? "text-foreground flex items-center justify-center gap-1.5" : "text-foreground"}`}>
                  {isPremium && <Crown className="h-4 w-4 text-warning" />}
                  {plan.name}
                </h3>
                {showPromo ? (
                  <div className="space-y-1.5">
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-[9px] px-2.5 font-bold tracking-wide">
                      1 MONTH DISCOUNT OFFER
                    </Badge>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-sm text-muted-foreground line-through">€14.99</span>
                      <span className="text-3xl font-extrabold text-primary">€9.99</span>
                      <span className="text-xs text-muted-foreground">/ first month</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Then €14.99/month. Cancel anytime. / Zatim €14.99 mesečno. Otkaži kada želiš.</p>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                )}
                {'savings' in plan && typeof plan.savings === 'string' && (
                  <p className="text-[10px] text-primary font-medium">{plan.savings}</p>
                )}
                <p className="text-[10px] text-muted-foreground">{plan.description}</p>
              </div>

              <Button
                className={`w-full mt-4 h-9 text-xs font-semibold ${
                  isPremium && !isCurrentPlan
                    ? "bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 hover:opacity-90 text-white border-0 shadow-lg shadow-violet-500/30"
                    : ""
                }`}
                variant={isCurrentPlan ? "outline" : plan.buttonVariant}
                disabled={isCurrentPlan || (isFree && currentPlan !== "free") || isLoading || (!isFree && (isStripeSubOnAndroid || isGoogleSubOnWeb))}
                onClick={() => handleSubscribe(plan.id)}
              >
                {isLoading
                  ? "Loading... / Učitavanje..."
                  : isCurrentPlan
                  ? "Current Plan / Trenutni plan"
                  : isFree
                  ? (currentPlan === "free" ? "Current Plan / Trenutni plan" : "Free Plan / Besplatan plan")
                  : isPremium
                  ? "Get Premium Now → / Kupi Premium sada"
                  : plan.buttonText
                }
              </Button>

              <ul className="mt-4 space-y-2 relative">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px]">
                    {f.included ? (
                      <Check className={`h-3.5 w-3.5 flex-shrink-0 ${isPremium ? "text-violet-400" : "text-primary"}`} />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    <span className={f.included ? "text-foreground" : "text-muted-foreground/50"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {/* Why Go Premium Section */}
      <div className="space-y-3">
        <h2 className="text-sm sm:text-base font-semibold text-foreground text-center">
          Why Go Premium? / Zašto Premium?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="relative p-3 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border border-primary/30 hover:border-primary/50 hover:from-primary/20 hover:via-primary/15 transition-all group overflow-hidden shadow-[0_0_10px_rgba(15,155,142,0.1)]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20 border border-primary/40 group-hover:bg-primary/30 transition-colors">
                  <benefit.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-foreground">{benefit.title}</h4>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Animated Social Proof Text */}
      <p className="text-center text-xs sm:text-sm text-primary/90 font-medium animate-fade-in">
        Join 10,000+ smart users improving their prediction accuracy daily. / Pridruži se 10,000+ pametnih korisnika koji unapređuju tačnost predikcija svaki dan.
      </p>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className={`text-center py-4 px-2 bg-gradient-to-b from-primary/10 via-card to-card border-primary/20 shadow-[0_0_15px_rgba(15,155,142,0.1)] ${
              stat.isStar ? "animate-pulse ring-1 ring-warning/30 shadow-[0_0_20px_rgba(245,196,81,0.15)]" : ""
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</span>
              {stat.isStar && <Star className="h-4 w-4 sm:h-5 sm:w-5 text-warning fill-warning" />}
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Testimonials Slider */}
      <TestimonialsSlider />

      {/* Urgency Line */}
      <p className="text-center text-[10px] sm:text-xs text-warning/80 font-medium">
        🔥 Over 247 users upgraded to Premium this month.
      </p>

      {/* App Download CTA - Website only */}
      {!isAndroidApp && (
        <div className="relative rounded-2xl overflow-hidden shadow-xl border border-white/10 bg-gradient-to-r from-[#0a1628] via-[#0d1f3c] to-[#0a2a4a]">
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Left: text + store badges */}
            <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Download the App
                </h2>
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed max-w-sm">
                  Get the full ProPredict experience on mobile. Live scores, AI predictions, tips and more. / Doživi pun ProPredict doživljaj na mobilnom — rezultati uživo, AI predikcije, tipovi i još mnogo toga.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://play.google.com/store/apps/details?id=com.propredict.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-black/80 border border-white/20 hover:border-white/40 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                    <path fill="#EA4335" d="M3.6 1.8 13.7 12 3.6 22.2c-.4-.3-.6-.8-.6-1.4V3.2c0-.6.2-1.1.6-1.4Z"/>
                    <path fill="#FBBC04" d="m17.4 8.3-3.7 3.7L3.6 1.8c.4-.3.9-.4 1.4-.1l12.4 6.6Z"/>
                    <path fill="#4285F4" d="m17.4 15.7-12.4 6.6c-.5.3-1 .2-1.4-.1l10.1-10.2 3.7 3.7Z"/>
                    <path fill="#34A853" d="M20.9 10.5c.8.5.8 1.5 0 2l-3.5 1.9-4-4 4-4 3.5 4.1Z" opacity="0"/>
                    <path fill="#34A853" d="m17.4 8.3 3.5 2c.8.5.8 1.4 0 1.9l-3.5 2-3.7-3.7 3.7-4.2Z"/>
                  </svg>
                  <span className="text-left leading-tight">
                    <span className="block text-[8px] uppercase tracking-wider text-white/70">Get it on</span>
                    <span className="block text-sm font-semibold text-white">Google Play</span>
                  </span>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.propredict.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-black/80 border border-white/20 hover:border-white/40 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden="true">
                    <path d="M17.05 12.54c-.03-2.89 2.36-4.27 2.47-4.34-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.5.96 1.39 2.1 2.95 3.6 2.89 1.45-.06 2-.93 3.75-.93s2.25.93 3.77.9c1.56-.03 2.55-1.41 3.5-2.8 1.1-1.61 1.55-3.17 1.58-3.25-.04-.02-3.03-1.16-3.08-4.61ZM14.16 4.06c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.86-1.39 2.23-1.22 3.55 1.29.1 2.6-.65 3.41-1.63Z"/>
                  </svg>
                  <span className="text-left leading-tight">
                    <span className="block text-[8px] uppercase tracking-wider text-white/70">Download on the</span>
                    <span className="block text-sm font-semibold text-white">App Store</span>
                  </span>
                </a>
              </div>

              <div className="flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 text-warning fill-warning" />
                ))}
                <span className="text-[11px] text-white/70 ml-1">Trusted by 1,000+ users / Poverenje 1,000+ korisnika</span>
              </div>
            </div>

            {/* Right: app banner image */}
            <div className="md:w-[46%] flex-shrink-0 relative min-h-[180px]">
              <img
                src={appBannerImg}
                alt="ProPredict App - AI-Powered Sports Analysis with Live Scores, AI Predictions and League Stats"
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f3c] via-transparent to-transparent hidden md:block" />
            </div>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="space-y-4">
        <h2 className="text-sm sm:text-base font-semibold text-foreground text-center">Frequently Asked Questions / Često postavljana pitanja</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="border border-primary/30 rounded-lg bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-4 shadow-[0_0_12px_rgba(15,155,142,0.12)] hover:border-primary/50 transition-colors"
            >
              <AccordionTrigger className="text-xs sm:text-sm font-medium text-foreground py-4 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-[11px] sm:text-xs text-muted-foreground pb-4 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Android: Restore Purchases */}
      {isAndroidApp && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground underline"
            onClick={() => {
              const android = (window as any).Android;
              if (android?.restorePurchases) {
                console.log("[Android] restorePurchases called");
                android.restorePurchases();
                toast.info("Restoring purchases… / Obnavljanje kupovina…");
              } else {
                toast.error("Restore not available on this device. / Obnavljanje nije dostupno na ovom uređaju.");
              }
            }}
          >
            Restore Purchases / Obnovi kupovine
          </Button>
        </div>
      )}

      {/* Footer CTA */}
      <p className="text-center text-xs text-muted-foreground">
        Choose package and unlock premium features. / Izaberi paket i otključaj premium funkcije.
      </p>
    </div>
    </>
  );
}
