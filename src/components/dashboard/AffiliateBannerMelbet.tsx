import melbetBanner from "@/assets/melbet-banner-hd.jpg";

const MELBET_URL =
  "https://refpa3665.com/L?tag=d_5761363m_45415c_&site=5761363&ad=45415&r=Registration";

export function AffiliateBannerMelbet() {
  return (
    <a
      href={MELBET_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="block w-full overflow-hidden rounded-xl border border-border/40 shadow-md hover:opacity-95 transition-opacity"
      aria-label="Melbet — Exclusive $100 bonus on first deposit"
    >
      <img
        src={melbetBanner}
        alt="Melbet Exclusive Bonus $100 on first deposit"
        className="w-full h-auto block"
        width={1600}
        height={544}
        loading="lazy"
      />
    </a>
  );
}

export default AffiliateBannerMelbet;