import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

interface PlayerProfileModalProps {
  playerId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function fetchPlayerProfile(playerId: number) {
  // Use the league-stats edge function won't work here — we need a dedicated call
  // We'll use the players endpoint via a simple proxy through get-match-details or direct
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/league-stats?league=39&season=2025&type=players&playerId=${playerId}`,
    { headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) return null;
  return res.json();
}

export function PlayerProfileModal({ playerId, open, onOpenChange }: PlayerProfileModalProps) {
  // For now, show a placeholder — full profile requires a dedicated edge function endpoint
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>👤</span> Player Profile
          </DialogTitle>
        </DialogHeader>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>Player ID: {playerId}</p>
          <p className="mt-2 text-xs">Detaljan profil igrača - uskoro dostupan</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
