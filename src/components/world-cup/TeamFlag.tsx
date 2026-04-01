interface TeamFlagProps {
  code: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Map FIFA/common codes to ISO 3166-1 alpha-2 for flagcdn.com
const CODE_TO_ISO: Record<string, string> = {
  MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
  CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
  BRA: "br", MAR: "ma", HAI: "ht", SCO: "gb-sct",
  USA: "us", PAR: "py", AUS: "au", TUR: "tr",
  GER: "de", CUW: "cw", CIV: "ci", ECU: "ec",
  NED: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  BEL: "be", EGY: "eg", IRN: "ir", NZL: "nz",
  ESP: "es", CPV: "cv", KSA: "sa", URU: "uy",
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
  POR: "pt", COD: "cd", UZB: "uz", COL: "co",
  ENG: "gb-eng", CRO: "hr", GHA: "gh", PAN: "pa",
};

const SIZES = {
  sm: { w: 20, h: 15 },
  md: { w: 28, h: 21 },
  lg: { w: 40, h: 30 },
};

export default function TeamFlag({ code, size = "md", className = "" }: TeamFlagProps) {
  const iso = CODE_TO_ISO[code];
  const { w, h } = SIZES[size];

  if (!iso) return <span className={className}>🏳️</span>;

  return (
    <img
      src={`https://flagcdn.com/w${w * 2}/${iso}.png`}
      width={w}
      height={h}
      alt={code}
      className={`inline-block rounded-[2px] object-cover ${className}`}
      loading="lazy"
      style={{ width: w, height: h }}
    />
  );
}
