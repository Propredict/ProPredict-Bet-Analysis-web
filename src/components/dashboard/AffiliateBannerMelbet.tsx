import melbetBanner from "@/assets/melbet-banner-hd.jpg";
import { cn } from "@/lib/utils";

const MELBET_URL =
  "https://refpa3665.com/L?tag=d_5761363m_45415c_&site=5761363&ad=45415&r=Registration";

export function AffiliateBannerMelbet({ narrow = false }: { narrow?: boolean }) {
  return (
    <a
      href={MELBET_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={cn(
        "block overflow-hidden rounded-xl border border-border/40 shadow-md hover:opacity-95 transition-opacity",
        narrow ? "max-w-2xl mx-auto" : "w-full"
      )}
      aria-label="Melbet — Exclusive $100 bonus on first deposit"
    >
      <img
        src={melbetBanner}
        alt="Melbet Exclusive Bonus $100 on first deposit"
        className={cn("h-auto block", narrow ? "w-full max-h-28 object-cover" : "w-full")}
        width={1600}
        height={544}
        loading="lazy"
      />
    </a>
  );
}

export default AffiliateBannerMelbet;