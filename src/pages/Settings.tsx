import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Settings as SettingsIcon, 
  User, 
  Info,
  Shield, 
  Trash2, 
  ScrollText, 
  ChevronRight,
  HelpCircle,
  Mail,
  ExternalLink,
  AlertTriangle,
  Scale,
  Cookie,
  Bell,
  Goal,
  Lightbulb
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { setOneSignalTag } from "@/components/AndroidPushModal";

const Settings = () => {
  const navigate = useNavigate();
  const isAndroid = getIsAndroidApp();

  const [goalEnabled, setGoalEnabled] = useState(() => localStorage.getItem("goal_enabled") === "true");
  const [tipsEnabled, setTipsEnabled] = useState(() => localStorage.getItem("tips_enabled") === "true");

  const handleGoalToggle = (checked: boolean) => {
    setGoalEnabled(checked);
    localStorage.setItem("goal_enabled", String(checked));
    setOneSignalTag("goal_alerts", checked ? "true" : null);
    if (checked) {
      window.Android?.requestPushPermission?.();
    }
  };

  const handleTipsToggle = (checked: boolean) => {
    setTipsEnabled(checked);
    localStorage.setItem("tips_enabled", String(checked));
    setOneSignalTag("daily_tips", checked ? "true" : null);
    if (checked) {
      window.Android?.requestPushPermission?.();
    }
  };

  const accountItems = [
    { 
      label: "Profile", 
      description: "Manage your account and preferences",
      icon: User, 
      path: "/profile",
      iconColor: "text-primary"
    },
    { 
      label: "About Us", 
      description: "Learn more about ProPredict",
      icon: Info, 
      path: "/about-us",
      iconColor: "text-muted-foreground"
    },
  ];

  const legalItems = [
    { 
      label: "Disclaimer", 
      description: "Important legal information and age restriction",
      icon: AlertTriangle, 
      path: "/disclaimer",
      iconColor: "text-primary",
      highlight: true
    },
    { 
      label: "Privacy Policy", 
      description: "How we collect and use your data",
      icon: Shield, 
      path: "/privacy-policy",
      iconColor: "text-muted-foreground"
    },
    { 
      label: "Cookie Policy", 
      description: "How we use cookies on our website",
      icon: Cookie, 
      path: "/cookie-policy",
      iconColor: "text-muted-foreground"
    },
    { 
      label: "Terms of Service", 
      description: "Terms and conditions of use",
      icon: ScrollText, 
      path: "/terms-of-service",
      iconColor: "text-muted-foreground"
    },
    { 
      label: "Data Deletion", 
      description: "Request deletion of your personal data",
      icon: Trash2, 
      path: "/data-deletion",
      iconColor: "text-destructive"
    },
  ];

  const supportItems = [
    { 
      label: "FAQ & Support", 
      description: "FAQs and contact support",
      icon: HelpCircle, 
      path: "/help-support",
      iconColor: "text-muted-foreground"
    },
    { 
      label: "Contact Us", 
      description: "propredictsupp@gmail.com",
      icon: Mail, 
      path: "mailto:propredictsupp@gmail.com",
      iconColor: "text-muted-foreground",
      external: true
    },
  ];

  return (
    <>
      <Helmet>
        <title>Settings – AI Sports Predictions | ProPredict</title>
        <meta name="description" content="Manage your ProPredict account settings, preferences, and access legal information. AI-powered sports analysis platform." />
      </Helmet>
      <div className="section-gap max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-full border border-primary">
          <SettingsIcon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-semibold text-foreground">Settings</h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground">App settings and legal information</p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="bg-primary/10 border-primary/30">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-accent">18+ Only · Entertainment Purposes Only</p>
              <p className="text-[10px] text-muted-foreground">This app does not accept bets or process payments</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/disclaimer")}
            className="text-[10px] text-muted-foreground hover:text-foreground h-6 px-2"
          >
            Read <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardContent className="p-0">
          <div className="px-3 py-2 border-b border-border">
            <h2 className="text-xs font-semibold text-foreground">Account</h2>
          </div>
          <div className="p-1">
            {accountItems.map((item, index) => (
              <button
                key={item.path + index}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-muted/50">
                    <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section - Android only */}
      {isAndroid && (
        <Card>
          <CardContent className="p-0">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-xs font-semibold text-foreground">Push Notifications</h2>
            </div>
            <div className="p-1">
              {/* Goal Alerts */}
              <div className="flex items-center justify-between p-2 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-muted/50">
                    <Goal className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">Goal Alerts</p>
                    <p className="text-[10px] text-muted-foreground">Live goal notifications during matches</p>
                  </div>
                </div>
                <Switch checked={goalEnabled} onCheckedChange={handleGoalToggle} />
              </div>

              {/* Daily Tips & Tickets */}
              <div className="flex items-center justify-between p-2 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-muted/50">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">Daily AI Picks & Combos</p>
                    <p className="text-[10px] text-muted-foreground">New AI predictions delivered to your phone</p>
                  </div>
                </div>
                <Switch checked={tipsEnabled} onCheckedChange={handleTipsToggle} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal & Compliance Section */}
      <Card>
        <CardContent className="p-0">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
            <Scale className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-xs font-semibold text-foreground">Legal & Compliance</h2>
          </div>
          <div className="p-1">
            {legalItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors ${
                  item.highlight ? "bg-primary/5 border border-primary/20" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-full ${item.highlight ? "bg-primary/20" : "bg-muted/50"}`}>
                    <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support Section */}
      <Card>
        <CardContent className="p-0">
          <div className="px-3 py-2 border-b border-border">
            <h2 className="text-xs font-semibold text-foreground">Support</h2>
          </div>
          <div className="p-1">
            {supportItems.map((item) => (
              <button
                key={item.label}
                onClick={() => item.external ? window.open(item.path, "_blank") : navigate(item.path)}
                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-muted/50">
                    <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                {item.external ? (
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
    </>
  );
};

export default Settings;
