import { useState } from "react";
import { Ticket, Sparkles, Star, Crown, Users, Clock, Play, Unlock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TabType = "daily" | "exclusive" | "premium";

interface TicketMatch {
  name: string;
  prediction: string;
  odds: number;
  blurred?: boolean;
}

interface BettingTicket {
  id: string;
  title: string;
  matchCount: number;
  status: "pending" | "won" | "lost";
  totalOdds: number;
  isFree: boolean;
  matches: TicketMatch[];
}

const sampleTickets: BettingTicket[] = [
  {
    id: "1",
    title: "Daily Ticket Champions League #1",
    matchCount: 5,
    status: "pending",
    totalOdds: 3.41,
    isFree: true,
    matches: [
      { name: "Match 1", prediction: "Over 1.5", odds: 1.2 },
      { name: "Match 2", prediction: "Away Win", odds: 1.41 },
      { name: "Match 3", prediction: "Over 2.5", odds: 1.4 },
    ],
  },
  {
    id: "2",
    title: "Daily Ticket Champions League #2",
    matchCount: 4,
    status: "pending",
    totalOdds: 3.41,
    isFree: false,
    matches: [
      { name: "Match 1", prediction: "", odds: 0, blurred: true },
      { name: "Match 2", prediction: "", odds: 0, blurred: true },
      { name: "Match 3", prediction: "", odds: 0, blurred: true },
    ],
  },
];

function TicketCard({ ticket }: { ticket: BettingTicket }) {
  const moreMatches = ticket.matchCount - ticket.matches.length;

  return (
    <Card className="bg-card border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {ticket.isFree && (
              <Badge className="bg-primary text-primary-foreground text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                FREE TODAY
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Ticket className="h-3 w-3" />
              {ticket.matchCount} Matches
            </span>
          </div>
          <Badge variant="outline" className="text-pending border-pending/30 bg-pending/10">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{ticket.title}</h3>
          <span className="text-primary font-bold">@{ticket.totalOdds}</span>
        </div>
      </div>

      {/* Matches */}
      <div className="p-4 space-y-2">
        {ticket.matches.map((match, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className={cn(
              "text-muted-foreground",
              match.blurred && "blur-sm select-none"
            )}>
              {match.name}
            </span>
            <div className={cn(
              "flex items-center gap-2",
              match.blurred && "blur-sm select-none"
            )}>
              {match.prediction && (
                <Badge variant="secondary" className="text-xs">
                  {match.prediction}
                </Badge>
              )}
              {match.odds > 0 && (
                <span className="text-primary font-medium">@{match.odds}</span>
              )}
              {match.blurred && (
                <div className="flex gap-1">
                  <div className="h-4 w-12 bg-primary/30 rounded" />
                  <div className="h-4 w-8 bg-primary rounded" />
                </div>
              )}
            </div>
          </div>
        ))}
        {moreMatches > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{moreMatches} more
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Total Odds</span>
          <span className="text-primary font-bold text-lg">@{ticket.totalOdds}</span>
        </div>
        <Button 
          variant={ticket.isFree ? "outline" : "secondary"} 
          className="w-full gap-2"
        >
          {ticket.isFree ? (
            <>
              <Unlock className="h-4 w-4" />
              Free Daily Unlock
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Watch Ad to Unlock Ticket
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

export function BettingTickets() {
  const [activeTab, setActiveTab] = useState<TabType>("daily");

  const tabs = [
    { id: "daily" as TabType, label: "Daily", count: 2, icon: Sparkles, sublabel: "Free with Ads" },
    { id: "exclusive" as TabType, label: "Exclusive", count: 0, icon: Star, sublabel: "Higher Confidence" },
    { id: "premium" as TabType, label: "Premium", count: 0, icon: Crown, sublabel: "Members Only" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Ticket className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Betting Tickets</h2>
      </div>

      <Card className="p-1 bg-card border-border">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-3 px-4 rounded-lg transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
                )}>
                  {tab.count}
                </span>
              </div>
              <span className="text-xs opacity-80">{tab.sublabel}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Users unlocked banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg py-2 px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-primary">
          <Users className="h-4 w-4" />
          <span>210 users unlocked daily tips today</span>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {sampleTickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </section>
  );
}
