import melbetBanner from "@/assets/melbet-banner-hd.jpg";

const MELBET_URL =
  "https://refpa3665.com/L?tag=d_5761363m_45415c_&site=5761363&ad=45415&r=Registration";

export function AffiliateBannerMelbet() {
  return (
    <a
      href={MELBET_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block relative overflow-hidden rounded-xl border border-border/40 shadow-md hover:opacity-95 transition-opacity"
      aria-label="Melbet — Exclusive $100 bonus on first deposit"
    >
      <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[9px] font-bold uppercase tracking-wider text-white/70">
        Sponsored
      </span>
      <img
        src={melbetBanner}
        alt="Melbet Exclusive Bonus $100 on first deposit"
        className="block w-full h-auto"
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