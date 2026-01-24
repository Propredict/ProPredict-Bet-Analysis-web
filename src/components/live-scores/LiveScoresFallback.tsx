import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw } from "lucide-react";

export function LiveScoresFallback() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Warning Banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-amber-300 text-sm font-medium">
            Live data is temporarily unavailable
          </p>
          <p className="text-amber-300/70 text-xs">
            Reconnecting to live feed...
          </p>
        </div>
        <RefreshCw className="h-4 w-4 text-amber-400 animate-spin" />
      </div>

      {/* Skeleton Match Cards */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5">
            <Skeleton className="h-4 w-32" />
          </div>
          
          {[1, 2, 3].map((j) => (
            <div
              key={j}
              className="px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-0"
            >
              {/* Actions skeleton */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>

              {/* Score skeleton */}
              <div className="flex-1 grid grid-cols-[1fr_96px_1fr] items-center">
                <div className="flex justify-end pr-3">
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-center">
                  <Skeleton className="h-7 w-16 rounded-full" />
                </div>
                <div className="pl-3">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>

              {/* Status skeleton */}
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          ))}
        </Card>
      ))}

      {/* Reconnecting status */}
      <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Attempting to restore connection...</span>
      </div>
    </div>
  );
}
