import { BrainCircuit, ShieldCheck, Trophy } from "lucide-react";
import heroAsset from "@/assets/ai-hero-banner.jpg.asset.json";

/**
 * Neon hero banner for the AI Predictions page.
 * Pure presentation — no data or business logic.
 */
export function AIHeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/25 bg-[#0a0512] shadow-[0_0_40px_-12px_rgba(217,70,239,0.45)]">
      <img
        src={heroAsset.url}
        alt="AI powered football predictions"
        width={1920}
        height={640}
        className="absolute inset-0 h-full w-full object-cover object-right opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0512] via-[#0a0512]/85 to-transparent" />

      <div className="relative px-4 py-5 sm:px-7 sm:py-8 md:py-10 max-w-[62%] sm:max-w-[58%]">
        <p className="text-sm sm:text-xl font-extrabold tracking-tight text-white">
          PRO<span className="text-primary">PREDICT</span>
        </p>
        <h2 className="mt-1.5 text-xl sm:text-3xl md:text-4xl font-black italic leading-[1.05] tracking-tight text-white">
          AI PREDICTS.
          <br />
          <span className="text-primary">YOU WIN.</span>
        </h2>

        <div className="mt-3 sm:mt-5 hidden sm:flex flex-wrap gap-x-6 gap-y-3">
          <Feature
            icon={<BrainCircuit className="h-4 w-4 text-fuchsia-300" />}
            title="Smart Analysis"
            lines={["AI scans thousands", "of data points"]}
          />
          <Feature
            icon={<ShieldCheck className="h-4 w-4 text-fuchsia-300" />}
            title="High Accuracy"
            lines={["75%+ confidence", "on safe matches"]}
          />
          <Feature
            icon={<Trophy className="h-4 w-4 text-fuchsia-300" />}
            title="Real Results"
            lines={["Join thousands", "of winning users"]}
          />
        </div>
      </div>

      <span className="absolute bottom-2 right-3 text-[9px] text-white/60">
        18+ · Play responsibly
      </span>
    </div>
  );
}

function Feature({ icon, title, lines }: { icon: React.ReactNode; title: string; lines: string[] }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 rounded-md border border-fuchsia-400/30 bg-fuchsia-500/10 p-1.5">{icon}</div>
      <div className="leading-tight">
        <p className="text-[11px] font-bold text-white">{title}</p>
        {lines.map((l) => (
          <p key={l} className="text-[10px] text-white/60">
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

export default AIHeroBanner;
