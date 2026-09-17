type TicketTeamCrestProps = {
  name: string;
  logo?: string | null;
  size?: "sm" | "md";
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

export function TicketTeamCrest({ name, logo, size = "md" }: TicketTeamCrestProps) {
  const dimensions = size === "sm" ? "h-9 w-9 text-[10px]" : "h-11 w-11 text-xs";

  return (
    <div className={`flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/25 bg-secondary font-extrabold text-primary shadow-sm`}>
      {logo ? <img src={logo} alt={`${name} crest`} className="h-full w-full object-contain p-1" loading="lazy" /> : initials(name)}
    </div>
  );
}

export function findTicketTeamLogo(
  teamName: string,
  matches: Array<{ homeTeam: string; awayTeam: string; homeLogo: string; awayLogo: string }>,
) {
  const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
  const wanted = normalize(teamName);
  const match = matches.find((item) => {
    const home = normalize(item.homeTeam);
    const away = normalize(item.awayTeam);
    return home === wanted || away === wanted || (wanted.length >= 3 && (home.includes(wanted) || wanted.includes(home) || away.includes(wanted) || wanted.includes(away)));
  });
  if (!match) return null;
  const home = normalize(match.homeTeam);
  return home === wanted || home.includes(wanted) || wanted.includes(home) ? match.homeLogo : match.awayLogo;
}