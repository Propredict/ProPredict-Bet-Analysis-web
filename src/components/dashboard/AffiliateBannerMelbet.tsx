import melbetBanner from "@/assets/melbet-banner-hd.jpg";

const MELBET_URL =
  "https://refpa3665.com/L?tag=d_5761363m_45415c_&site=5761363&ad=45415&r=Registration";

interface AffiliateBannerMelbetProps {
  compact?: boolean;
}

export function AffiliateBannerMelbet({ compact = false }: AffiliateBannerMelbetProps) {
  if (compact) {
    return (
      <a
        href={MELBET_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label="Melbet — Exclusive $100 bonus on first deposit"
        className="group relative flex aspect-square w-full max-w-[150px] flex-col items-center justify-center justify-self-center overflow-hidden rounded-xl border-2 border-accent/30 bg-card shadow-lg shadow-accent/20 transition-all duration-300 hover:-translate-y-1 hover:border-accent active:scale-95 motion-reduce:transform-none"
      >
        <span className="absolute inset-x-0 top-0 h-1 bg-accent" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Sponsored
        </span>

        <span className="mt-3 flex w-full items-baseline justify-center px-3 text-[clamp(1.15rem,7vw,1.6rem)] font-black uppercase leading-none text-sidebar" aria-hidden="true">
          Mel<span className="text-accent">bet</span>
        </span>

        <span className="absolute bottom-4 rounded-full border border-accent/40 bg-background px-3 py-1 text-[9px] font-black uppercase text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
          Join now
        </span>
        <span className="sr-only">18+ • Play responsibly</span>
      </a>
    );
  }

  return (
    <a
      href={MELBET_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group relative mx-auto block w-full max-w-3xl overflow-hidden rounded-xl border border-border/40 shadow-md transition-opacity hover:opacity-95"
      aria-label="Melbet — Exclusive $100 bonus on first deposit"
    >
      <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[9px] font-bold uppercase tracking-wider text-white/70">
        Sponsored
      </span>
      <img
        src={melbetBanner}
        alt="Melbet Exclusive Bonus $100 on first deposit"
        className="block h-auto max-h-32 w-full object-cover sm:max-h-40 md:max-h-44"
        width={1600}
        height={544}
        loading="lazy"
      />
      <span className="absolute bottom-1 right-2 z-20 text-[9px] text-white/70">
        18+ • Play responsibly
      </span>
    </a>
  );
}

export default AffiliateBannerMelbet;