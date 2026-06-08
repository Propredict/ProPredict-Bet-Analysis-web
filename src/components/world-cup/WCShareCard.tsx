import { useState } from "react";
import { Share2, Download, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface WCShareCardProps {
  teamName: string;
  teamFlag?: string | null;
  variant?: "champion" | "bracket-path";
  /** Optional path label for "bracket-path" variant, e.g. "R16 ✅ → QF" */
  pathLabel?: string;
}

const SHARE_URL = "https://propredict.me/world-cup-2026";
const HASHTAGS = "#WorldCup2026 #FIFAWorldCup #ProPredict";

/**
 * Generates a 1080x1080 IG/X-friendly share image on the fly via Canvas,
 * then uses Web Share API (with file) when available, falling back to
 * direct download + clipboard copy.
 */
export default function WCShareCard({
  teamName,
  teamFlag,
  variant = "champion",
  pathLabel,
}: WCShareCardProps) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText =
    variant === "champion"
      ? `I picked ${teamFlag ?? "🏆"} ${teamName} to win World Cup 2026 🏆\n\nMake your pick → ${SHARE_URL}\n\n${HASHTAGS}`
      : `${teamFlag ?? "🏆"} ${teamName}'s path to glory: ${pathLabel ?? ""}\n\nTrack it on ProPredict → ${SHARE_URL}\n\n${HASHTAGS}`;

  async function buildImageBlob(): Promise<Blob> {
    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    // Background gradient (fuchsia → violet → dark teal)
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, "#1a0b2e");
    bg.addColorStop(0.5, "#3b0764");
    bg.addColorStop(1, "#0f9b8e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Subtle radial highlight
    const glow = ctx.createRadialGradient(size / 2, size * 0.35, 50, size / 2, size * 0.35, size * 0.7);
    glow.addColorStop(0, "rgba(232, 121, 249, 0.35)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Top kicker
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("WORLD CUP 2026 · MY CHAMPION PICK", size / 2, 130);

    // Trophy
    ctx.font = "120px system-ui, Apple Color Emoji, Segoe UI Emoji";
    ctx.fillText("🏆", size / 2, 280);

    // Flag (massive)
    ctx.font = "260px system-ui, Apple Color Emoji, Segoe UI Emoji";
    ctx.fillText(teamFlag ?? "🏳️", size / 2, 560);

    // Team name
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 88px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(teamName.toUpperCase(), size / 2, 680);

    // Tagline
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "500 38px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("to lift the trophy", size / 2, 740);

    // Path (if bracket variant)
    if (variant === "bracket-path" && pathLabel) {
      ctx.fillStyle = "rgba(232, 121, 249, 0.95)";
      ctx.font = "600 36px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      wrapText(ctx, pathLabel, size / 2, 800, size - 120, 44);
    }

    // Bottom CTA card
    const cardY = 880;
    const cardH = 140;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(ctx, 60, cardY, size - 120, cardH, 24);
    ctx.fill();

    ctx.fillStyle = "#0F9B8E";
    ctx.font = "800 42px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("ProPredict", size / 2, cardY + 60);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "500 28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("Make your pick at propredict.me/world-cup-2026", size / 2, cardY + 105);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 0.95);
    });
  }

  async function handleShare() {
    setBusy(true);
    try {
      const blob = await buildImageBlob();
      const file = new File([blob], `wc2026-pick-${teamName.toLowerCase().replace(/\s+/g, "-")}.png`, {
        type: "image/png",
      });

      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          text: shareText,
          title: "My World Cup 2026 Champion Pick",
        });
      } else {
        // Fallback: download image + copy text to clipboard
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        try {
          await navigator.clipboard.writeText(shareText);
        } catch {
          /* ignore */
        }
        toast({
          title: "Card downloaded",
          description: "Caption copied to clipboard — paste it on Instagram or X.",
        });
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast({ title: "Could not share", description: err?.message ?? "Try again", variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const blob = await buildImageBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wc2026-pick-${teamName.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Download failed", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-card p-4 space-y-3">
      {/* Visual preview (mini) */}
      <div className="relative overflow-hidden rounded-lg aspect-square max-w-[180px] mx-auto bg-gradient-to-br from-[#1a0b2e] via-[#3b0764] to-[#0f9b8e] flex flex-col items-center justify-center text-center px-2">
        <p className="text-[8px] uppercase tracking-wider text-white/70 font-semibold">WC 2026 · My Pick</p>
        <div className="text-4xl mt-1">{teamFlag ?? "🏳️"}</div>
        <p className="text-white font-extrabold text-sm mt-1 leading-tight">{teamName.toUpperCase()}</p>
        <p className="text-white/80 text-[9px]">to lift the trophy</p>
        <p className="text-[8px] text-primary font-bold mt-2">ProPredict</p>
      </div>

      <div className="text-center">
        <p className="text-xs font-semibold text-foreground">Share your pick</p>
        <p className="text-[10px] text-muted-foreground">Instagram · X · WhatsApp · Stories</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          onClick={handleShare}
          disabled={busy}
          className="bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600 text-white text-[11px] gap-1"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
          Share
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownload} disabled={busy} className="text-[11px] gap-1">
          <Download className="h-3 w-3" /> Save
        </Button>
        <Button size="sm" variant="outline" onClick={handleCopyText} className="text-[11px] gap-1">
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Caption"}
        </Button>
      </div>
    </div>
  );
}

// ---------- helpers ----------
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line, x, cy);
      line = words[i] + " ";
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cy);
}