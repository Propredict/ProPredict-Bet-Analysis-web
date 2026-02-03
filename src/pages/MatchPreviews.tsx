import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Eye, Calendar, Trophy, TrendingUp, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFixtures, type Match } from "@/hooks/useFixtures";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Top leagues to display
const TOP_LEAGUES = [
  "Premier League",
  "La Liga", 
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Eredivisie",
  "Jupiler Pro League",
  "Primeira Liga",
  "Champions League",
  "Europa League",
  "Conference League",
];

interface MatchPreviewCardProps {
  match: Match;
}

function MatchPreviewCard({ match }: MatchPreviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Generate mock preview data (in production this would come from API/AI)
  const generatePreview = () => {
    const homeStrength = Math.random() > 0.5;
    const prediction = homeStrength ? "1" : Math.random() > 0.5 ? "X" : "2";
    const confidence = Math.floor(60 + Math.random() * 35);
    
    return {
      prediction,
      confidence,
      homeForm: ["W", "D", "W", "L", "W"].slice(0, 5),
      awayForm: ["L", "W", "D", "W", "L"].slice(0, 5),
      keyFactor: homeStrength 
        ? `${match.homeTeam} has strong home record this season`
        : `${match.awayTeam} showing excellent away form recently`,
      btts: Math.random() > 0.4 ? "Yes" : "No",
      over25: Math.random() > 0.45 ? "Yes" : "No",
    };
  };
  
  const preview = generatePreview();
  
  const getPredictionLabel = (pred: string) => {
    switch(pred) {
      case "1": return match.homeTeam;
      case "X": return "Draw";
      case "2": return match.awayTeam;
      default: return pred;
    }
  };

  const getFormColor = (result: string) => {
    switch(result) {
      case "W": return "bg-emerald-500 text-white";
      case "D": return "bg-amber-500 text-white";
      case "L": return "bg-red-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
              {match.startTime}
            </Badge>
            {match.status === "live" && (
              <Badge className="bg-red-500 text-white text-[10px] animate-pulse">
                LIVE {match.minute}'
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {match.homeLogo && (
                <img src={match.homeLogo} alt="" className="h-5 w-5 object-contain" />
              )}
              <span className="font-medium text-sm truncate">{match.homeTeam}</span>
            </div>
            <div className="flex items-center gap-2">
              {match.awayLogo && (
                <img src={match.awayLogo} alt="" className="h-5 w-5 object-contain" />
              )}
              <span className="font-medium text-sm truncate">{match.awayTeam}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground mb-0.5">Prediction</div>
              <Badge className="bg-gradient-to-r from-primary/30 to-primary/20 text-primary border border-primary/30">
                {getPredictionLabel(preview.prediction)}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground mb-0.5">Confidence</div>
              <span className={cn(
                "text-sm font-bold",
                preview.confidence >= 80 ? "text-emerald-400" :
                preview.confidence >= 65 ? "text-amber-400" : "text-red-400"
              )}>
                {preview.confidence}%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-border p-4 bg-muted/20 space-y-4">
          {/* Form Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-2">{match.homeTeam} Form</div>
              <div className="flex gap-1">
                {preview.homeForm.map((r, i) => (
                  <span key={i} className={cn("w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center", getFormColor(r))}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-2">{match.awayTeam} Form</div>
              <div className="flex gap-1">
                {preview.awayForm.map((r, i) => (
                  <span key={i} className={cn("w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center", getFormColor(r))}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Key Factor */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium text-primary mb-1">Key Factor</div>
                <p className="text-xs text-muted-foreground">{preview.keyFactor}</p>
              </div>
            </div>
          </div>
          
          {/* Additional Markets */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-[10px] text-muted-foreground mb-1">Both Teams Score</div>
              <span className={cn(
                "text-sm font-bold",
                preview.btts === "Yes" ? "text-emerald-400" : "text-red-400"
              )}>
                {preview.btts}
              </span>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-[10px] text-muted-foreground mb-1">Over 2.5 Goals</div>
              <span className={cn(
                "text-sm font-bold",
                preview.over25 === "Yes" ? "text-emerald-400" : "text-red-400"
              )}>
                {preview.over25}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function MatchPreviews() {
  const { matches, isLoading, error, refetch } = useFixtures("today");
  
  // Filter to top leagues only
  const topLeagueMatches = matches.filter(match => 
    TOP_LEAGUES.some(league => 
      match.league?.toLowerCase().includes(league.toLowerCase())
    )
  );
  
  // Group by league
  const matchesByLeague = topLeagueMatches.reduce((acc, match) => {
    const league = match.league || "Other";
    if (!acc[league]) acc[league] = [];
    acc[league].push(match);
    return acc;
  }, {} as Record<string, Match[]>);
  
  const leagueCount = Object.keys(matchesByLeague).length;
  const matchCount = topLeagueMatches.length;

  return (
    <>
      <Helmet>
        <title>Match Previews | ProPredict</title>
        <meta name="description" content="Expert analysis and predictions for today's top football matches from Premier League, La Liga, Serie A, Bundesliga and more." />
      </Helmet>
      
      <div className="page-content space-y-4">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30">
                <Eye className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Match Previews</h1>
                <p className="text-xs text-muted-foreground">Expert analysis for top matches</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-8"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-br from-violet-500/20 via-violet-500/10 to-transparent border border-violet-500/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Calendar className="h-4 w-4 text-violet-400" />
              <span className="text-lg font-bold text-violet-400">{format(new Date(), "dd MMM")}</span>
            </div>
            <span className="text-[10px] text-violet-400/70">Today</span>
          </div>
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold text-primary">{leagueCount}</span>
            </div>
            <span className="text-[10px] text-primary/70">Leagues</span>
          </div>
          <div className="bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Eye className="h-4 w-4 text-amber-400" />
              <span className="text-lg font-bold text-amber-400">{matchCount}</span>
            </div>
            <span className="text-[10px] text-amber-400/70">Previews</span>
          </div>
        </div>
        
        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
              Try Again
            </Button>
          </Card>
        ) : matchCount === 0 ? (
          <Card className="p-6 text-center">
            <Eye className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No top league matches scheduled for today</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(matchesByLeague).map(([league, leagueMatches]) => (
              <div key={league} className="space-y-2">
                {/* League Header */}
                <div className="flex items-center gap-2 px-1">
                  {leagueMatches[0]?.leagueLogo && (
                    <img 
                      src={leagueMatches[0].leagueLogo} 
                      alt="" 
                      className="h-5 w-5 object-contain"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{league}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {leagueMatches.length} {leagueMatches.length === 1 ? "match" : "matches"}
                    </Badge>
                  </div>
                </div>
                
                {/* Matches */}
                <div className="space-y-2">
                  {leagueMatches.map((match) => (
                    <MatchPreviewCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
