// ==========================================
// FIFA World Cup 2026 — Official Data
// Draw: December 5, 2025 – Washington D.C.
// Tournament: June 11 – July 19, 2026
// Hosts: USA, Mexico, Canada
// ==========================================

export interface WCTeam {
  name: string;
  code: string;       // ISO or common abbreviation
  fifaRank: number;
  coach: string;
  confederation: string;
  flag: string;        // emoji flag
  keyPlayers: string[];
  debut: boolean;      // first World Cup appearance
}

export interface WCGroup {
  name: string;
  teams: string[];     // team names matching TEAMS keys
}

export interface WCMatch {
  home: string;
  away: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  group: string;
}

// ==========================================
// OFFICIAL GROUPS (Draw Dec 5, 2025)
// ==========================================
export const GROUPS: Record<string, string[]> = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia & Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

// ==========================================
// ALL 48 TEAMS WITH DETAILS
// ==========================================
export const TEAMS: Record<string, WCTeam> = {
  // Group A
  "Mexico": {
    name: "Mexico", code: "MEX", fifaRank: 15, coach: "Javier Aguirre",
    confederation: "CONCACAF", flag: "🇲🇽", debut: false,
    keyPlayers: ["Edson Álvarez", "Hirving Lozano", "Santiago Giménez", "Luis Romo", "César Montes"],
  },
  "South Africa": {
    name: "South Africa", code: "RSA", fifaRank: 61, coach: "Hugo Broos",
    confederation: "CAF", flag: "🇿🇦", debut: false,
    keyPlayers: ["Percy Tau", "Ronwen Williams", "Themba Zwane", "Bongokuhle Hlongwane", "Teboho Mokoena"],
  },
  "South Korea": {
    name: "South Korea", code: "KOR", fifaRank: 22, coach: "Hong Myung-bo",
    confederation: "AFC", flag: "🇰🇷", debut: false,
    keyPlayers: ["Son Heung-min", "Kim Min-jae", "Lee Kang-in", "Hwang Hee-chan", "Cho Gue-sung"],
  },
  "Czech Republic": {
    name: "Czech Republic", code: "CZE", fifaRank: 36, coach: "Ivan Hašek",
    confederation: "UEFA", flag: "🇨🇿", debut: false,
    keyPlayers: ["Patrik Schick", "Tomáš Souček", "Adam Hložek", "Vladimír Coufal", "Lukáš Provod"],
  },

  // Group B
  "Canada": {
    name: "Canada", code: "CAN", fifaRank: 27, coach: "Jesse Marsch",
    confederation: "CONCACAF", flag: "🇨🇦", debut: false,
    keyPlayers: ["Alphonso Davies", "Jonathan David", "Cyle Larin", "Tajon Buchanan", "Stephen Eustáquio"],
  },
  "Bosnia & Herzegovina": {
    name: "Bosnia & Herzegovina", code: "BIH", fifaRank: 56, coach: "Sergej Barbarez",
    confederation: "UEFA", flag: "🇧🇦", debut: false,
    keyPlayers: ["Edin Džeko", "Miralem Pjanić", "Ermedin Demirović", "Sead Kolašinac", "Anel Ahmedhodžić"],
  },
  "Qatar": {
    name: "Qatar", code: "QAT", fifaRank: 51, coach: "Marquez López",
    confederation: "AFC", flag: "🇶🇦", debut: false,
    keyPlayers: ["Akram Afif", "Almoez Ali", "Hassan Al-Haydos", "Karim Boudiaf", "Pedro Miguel"],
  },
  "Switzerland": {
    name: "Switzerland", code: "SUI", fifaRank: 17, coach: "Murat Yakin",
    confederation: "UEFA", flag: "🇨🇭", debut: false,
    keyPlayers: ["Granit Xhaka", "Manuel Akanji", "Breel Embolo", "Denis Zakaria", "Dan Ndoye"],
  },

  // Group C
  "Brazil": {
    name: "Brazil", code: "BRA", fifaRank: 5, coach: "Dorival Júnior",
    confederation: "CONMEBOL", flag: "🇧🇷", debut: false,
    keyPlayers: ["Vinícius Jr.", "Rodrygo", "Bruno Guimarães", "Marquinhos", "Endrick"],
  },
  "Morocco": {
    name: "Morocco", code: "MAR", fifaRank: 11, coach: "Walid Regragui",
    confederation: "CAF", flag: "🇲🇦", debut: false,
    keyPlayers: ["Achraf Hakimi", "Hakim Ziyech", "Youssef En-Nesyri", "Sofyan Amrabat", "Brahim Díaz"],
  },
  "Haiti": {
    name: "Haiti", code: "HAI", fifaRank: 84, coach: "Marc Collat",
    confederation: "CONCACAF", flag: "🇭🇹", debut: false,
    keyPlayers: ["Frantzdy Pierrot", "Derrick Etienne Jr.", "Carlens Arcus", "Leverton Pierre", "Bryan Alceus"],
  },
  "Scotland": {
    name: "Scotland", code: "SCO", fifaRank: 36, coach: "Steve Clarke",
    confederation: "UEFA", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", debut: false,
    keyPlayers: ["Andrew Robertson", "John McGinn", "Scott McTominay", "Che Adams", "Billy Gilmour"],
  },

  // Group D
  "United States": {
    name: "United States", code: "USA", fifaRank: 14, coach: "Mauricio Pochettino",
    confederation: "CONCACAF", flag: "🇺🇸", debut: false,
    keyPlayers: ["Christian Pulisic", "Weston McKennie", "Tyler Adams", "Giovanni Reyna", "Yunus Musah"],
  },
  "Paraguay": {
    name: "Paraguay", code: "PAR", fifaRank: 39, coach: "Alfredo Arzamendia",
    confederation: "CONMEBOL", flag: "🇵🇾", debut: false,
    keyPlayers: ["Miguel Almirón", "Julio Enciso", "Gustavo Gómez", "Omar Alderete", "Matías Rojas"],
  },
  "Australia": {
    name: "Australia", code: "AUS", fifaRank: 26, coach: "Tony Popovic",
    confederation: "AFC", flag: "🇦🇺", debut: false,
    keyPlayers: ["Jackson Irvine", "Craig Goodwin", "Kye Rowles", "Keanu Baccus", "Mitchell Duke"],
  },
  "Turkey": {
    name: "Turkey", code: "TUR", fifaRank: 38, coach: "Vincenzo Montella",
    confederation: "UEFA", flag: "🇹🇷", debut: false,
    keyPlayers: ["Hakan Çalhanoğlu", "Arda Güler", "Kenan Yıldız", "Barış Alper Yılmaz", "Merih Demiral"],
  },

  // Group E
  "Germany": {
    name: "Germany", code: "GER", fifaRank: 9, coach: "Julian Nagelsmann",
    confederation: "UEFA", flag: "🇩🇪", debut: false,
    keyPlayers: ["Jamal Musiala", "Florian Wirtz", "Kai Havertz", "Joshua Kimmich", "Antonio Rüdiger"],
  },
  "Curaçao": {
    name: "Curaçao", code: "CUW", fifaRank: 82, coach: "Dick Advocaat",
    confederation: "CONCACAF", flag: "🇨🇼", debut: true,
    keyPlayers: ["Cuco Martina", "Juninho Bacuna", "Kenji Gorré", "Eloy Room", "Rangelo Janga"],
  },
  "Ivory Coast": {
    name: "Ivory Coast", code: "CIV", fifaRank: 42, coach: "Emerse Faé",
    confederation: "CAF", flag: "🇨🇮", debut: false,
    keyPlayers: ["Sébastien Haller", "Franck Kessié", "Nicolas Pépé", "Simon Adingra", "Ibrahim Sangaré"],
  },
  "Ecuador": {
    name: "Ecuador", code: "ECU", fifaRank: 23, coach: "Sebastián Beccacece",
    confederation: "CONMEBOL", flag: "🇪🇨", debut: false,
    keyPlayers: ["Moisés Caicedo", "Piero Hincapié", "Enner Valencia", "Gonzalo Plata", "Jeremy Sarmiento"],
  },

  // Group F
  "Netherlands": {
    name: "Netherlands", code: "NED", fifaRank: 7, coach: "Ronald Koeman",
    confederation: "UEFA", flag: "🇳🇱", debut: false,
    keyPlayers: ["Virgil van Dijk", "Cody Gakpo", "Frenkie de Jong", "Xavi Simons", "Ryan Gravenberch"],
  },
  "Japan": {
    name: "Japan", code: "JPN", fifaRank: 18, coach: "Hajime Moriyasu",
    confederation: "AFC", flag: "🇯🇵", debut: false,
    keyPlayers: ["Takefusa Kubo", "Kaoru Mitoma", "Wataru Endo", "Takumi Minamino", "Ko Itakura"],
  },
  "Sweden": {
    name: "Sweden", code: "SWE", fifaRank: 33, coach: "Jon Dahl Tomasson",
    confederation: "UEFA", flag: "🇸🇪", debut: false,
    keyPlayers: ["Alexander Isak", "Dejan Kulusevski", "Viktor Gyökeres", "Emil Forsberg", "Anthony Elanga"],
  },
  "Tunisia": {
    name: "Tunisia", code: "TUN", fifaRank: 40, coach: "Faouzi Benzarti",
    confederation: "CAF", flag: "🇹🇳", debut: false,
    keyPlayers: ["Youssef Msakni", "Aïssa Laïdouni", "Wahbi Khazri", "Hannibal Mejbri", "Mohamed Ali Ben Romdhane"],
  },

  // Group G
  "Belgium": {
    name: "Belgium", code: "BEL", fifaRank: 8, coach: "Domenico Tedesco",
    confederation: "UEFA", flag: "🇧🇪", debut: false,
    keyPlayers: ["Kevin De Bruyne", "Romelu Lukaku", "Jérémy Doku", "Amadou Onana", "Arthur Theate"],
  },
  "Egypt": {
    name: "Egypt", code: "EGY", fifaRank: 34, coach: "Hossam Hassan",
    confederation: "CAF", flag: "🇪🇬", debut: false,
    keyPlayers: ["Mohamed Salah", "Omar Marmoush", "Trezeguet", "Ahmed Hegazi", "Mohamed Elneny"],
  },
  "Iran": {
    name: "Iran", code: "IRN", fifaRank: 20, coach: "Amir Ghalenoei",
    confederation: "AFC", flag: "🇮🇷", debut: false,
    keyPlayers: ["Mehdi Taremi", "Sardar Azmoun", "Alireza Jahanbakhsh", "Milad Mohammadi", "Saeid Ezatolahi"],
  },
  "New Zealand": {
    name: "New Zealand", code: "NZL", fifaRank: 86, coach: "Darren Bazeley",
    confederation: "OFC", flag: "🇳🇿", debut: false,
    keyPlayers: ["Chris Wood", "Liberato Cacace", "Joe Bell", "Matt Garbett", "Alex Paulsen"],
  },

  // Group H
  "Spain": {
    name: "Spain", code: "ESP", fifaRank: 1, coach: "Luis de la Fuente",
    confederation: "UEFA", flag: "🇪🇸", debut: false,
    keyPlayers: ["Lamine Yamal", "Pedri", "Rodri", "Nico Williams", "Dani Olmo"],
  },
  "Cape Verde": {
    name: "Cape Verde", code: "CPV", fifaRank: 68, coach: "Pedro Brito 'Bubista'",
    confederation: "CAF", flag: "🇨🇻", debut: true,
    keyPlayers: ["Garry Rodrigues", "Ryan Mendes", "Stopira", "Kenny Rocha Santos", "Jamiro Monteiro"],
  },
  "Saudi Arabia": {
    name: "Saudi Arabia", code: "KSA", fifaRank: 60, coach: "Roberto Mancini",
    confederation: "AFC", flag: "🇸🇦", debut: false,
    keyPlayers: ["Salem Al-Dawsari", "Firas Al-Buraikan", "Yasser Al-Shahrani", "Ali Al-Bulaihi", "Mohamed Kanno"],
  },
  "Uruguay": {
    name: "Uruguay", code: "URU", fifaRank: 16, coach: "Marcelo Bielsa",
    confederation: "CONMEBOL", flag: "🇺🇾", debut: false,
    keyPlayers: ["Federico Valverde", "Darwin Núñez", "Ronald Araújo", "Rodrigo Bentancur", "Facundo Pellistri"],
  },

  // Group I
  "France": {
    name: "France", code: "FRA", fifaRank: 3, coach: "Didier Deschamps",
    confederation: "UEFA", flag: "🇫🇷", debut: false,
    keyPlayers: ["Kylian Mbappé", "Antoine Griezmann", "Aurélien Tchouaméni", "William Saliba", "Ousmane Dembélé"],
  },
  "Senegal": {
    name: "Senegal", code: "SEN", fifaRank: 19, coach: "Pape Thiaw",
    confederation: "CAF", flag: "🇸🇳", debut: false,
    keyPlayers: ["Sadio Mané", "Kalidou Koulibaly", "Ismaïla Sarr", "Idrissa Gueye", "Nicolas Jackson"],
  },
  "Iraq": {
    name: "Iraq", code: "IRQ", fifaRank: 63, coach: "Jesús Casas",
    confederation: "AFC", flag: "🇮🇶", debut: false,
    keyPlayers: ["Mohanad Ali", "Aymen Hussein", "Ibrahim Bayesh", "Ali Adnan", "Rebin Sulaka"],
  },
  "Norway": {
    name: "Norway", code: "NOR", fifaRank: 29, coach: "Ståle Solbakken",
    confederation: "UEFA", flag: "🇳🇴", debut: false,
    keyPlayers: ["Erling Haaland", "Martin Ødegaard", "Alexander Sørloth", "Sander Berge", "Kristoffer Ajer"],
  },

  // Group J
  "Argentina": {
    name: "Argentina", code: "ARG", fifaRank: 2, coach: "Lionel Scaloni",
    confederation: "CONMEBOL", flag: "🇦🇷", debut: false,
    keyPlayers: ["Lionel Messi", "Julián Álvarez", "Enzo Fernández", "Alexis Mac Allister", "Lisandro Martínez"],
  },
  "Algeria": {
    name: "Algeria", code: "ALG", fifaRank: 35, coach: "Vladimir Petković",
    confederation: "CAF", flag: "🇩🇿", debut: false,
    keyPlayers: ["Riyad Mahrez", "Ismaël Bennacer", "Yacine Brahimi", "Amine Gouiri", "Houssem Aouar"],
  },
  "Austria": {
    name: "Austria", code: "AUT", fifaRank: 24, coach: "Ralf Rangnick",
    confederation: "UEFA", flag: "🇦🇹", debut: false,
    keyPlayers: ["David Alaba", "Marcel Sabitzer", "Konrad Laimer", "Christoph Baumgartner", "Michael Gregoritsch"],
  },
  "Jordan": {
    name: "Jordan", code: "JOR", fifaRank: 66, coach: "Hussein Ammouta",
    confederation: "AFC", flag: "🇯🇴", debut: true,
    keyPlayers: ["Mousa Al-Taamari", "Yazan Al-Naimat", "Baha Faisal", "Anas Bani-Yaseen", "Ehsan Haddad"],
  },

  // Group K
  "Portugal": {
    name: "Portugal", code: "POR", fifaRank: 6, coach: "Roberto Martínez",
    confederation: "UEFA", flag: "🇵🇹", debut: false,
    keyPlayers: ["Cristiano Ronaldo", "Bruno Fernandes", "Bernardo Silva", "Rafael Leão", "Rúben Dias"],
  },
  "DR Congo": {
    name: "DR Congo", code: "COD", fifaRank: 55, coach: "Sébastien Desabre",
    confederation: "CAF", flag: "🇨🇩", debut: false,
    keyPlayers: ["Cédric Bakambu", "Chancel Mbemba", "Yannick Bolasie", "Arthur Masuaku", "Gaël Kakuta"],
  },
  "Uzbekistan": {
    name: "Uzbekistan", code: "UZB", fifaRank: 50, coach: "Srecko Katanec",
    confederation: "AFC", flag: "🇺🇿", debut: true,
    keyPlayers: ["Eldor Shomurodov", "Jaloliddin Masharipov", "Oston Urunov", "Abdukodir Khusanov", "Otabek Shukurov"],
  },
  "Colombia": {
    name: "Colombia", code: "COL", fifaRank: 13, coach: "Néstor Lorenzo",
    confederation: "CONMEBOL", flag: "🇨🇴", debut: false,
    keyPlayers: ["Luis Díaz", "James Rodríguez", "Jhon Arias", "Jefferson Lerma", "Dávinson Sánchez"],
  },

  // Group L
  "England": {
    name: "England", code: "ENG", fifaRank: 4, coach: "Thomas Tuchel",
    confederation: "UEFA", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", debut: false,
    keyPlayers: ["Jude Bellingham", "Phil Foden", "Bukayo Saka", "Declan Rice", "Harry Kane"],
  },
  "Croatia": {
    name: "Croatia", code: "CRO", fifaRank: 10, coach: "Zlatko Dalić",
    confederation: "UEFA", flag: "🇭🇷", debut: false,
    keyPlayers: ["Luka Modrić", "Mateo Kovačić", "Joško Gvardiol", "Mario Pašalić", "Andrej Kramarić"],
  },
  "Ghana": {
    name: "Ghana", code: "GHA", fifaRank: 72, coach: "Otto Addo",
    confederation: "CAF", flag: "🇬🇭", debut: false,
    keyPlayers: ["Mohammed Kudus", "Thomas Partey", "Antoine Semenyo", "Inaki Williams", "Daniel Amartey"],
  },
  "Panama": {
    name: "Panama", code: "PAN", fifaRank: 30, coach: "Thomas Christiansen",
    confederation: "CONCACAF", flag: "🇵🇦", debut: false,
    keyPlayers: ["José Fajardo", "Adalberto Carrasquilla", "Eric Davis", "César Yanis", "Freddy Góndola"],
  },
};

// ==========================================
// GROUP STAGE SCHEDULE (Official FIFA)
// ==========================================
export const GROUP_MATCHES: WCMatch[] = [
  // Matchday 1
  { home: "Mexico", away: "South Africa", date: "Jun 11", time: "18:00", venue: "Estadio Azteca", city: "Mexico City", group: "A" },
  { home: "South Korea", away: "Czech Republic", date: "Jun 11", time: "21:00", venue: "AT&T Stadium", city: "Dallas", group: "A" },
  { home: "Canada", away: "Bosnia & Herzegovina", date: "Jun 12", time: "15:00", venue: "BMO Field", city: "Toronto", group: "B" },
  { home: "Qatar", away: "Switzerland", date: "Jun 12", time: "18:00", venue: "GEHA Field", city: "Kansas City", group: "B" },
  { home: "United States", away: "Paraguay", date: "Jun 12", time: "21:00", venue: "SoFi Stadium", city: "Los Angeles", group: "D" },
  { home: "Brazil", away: "Morocco", date: "Jun 13", time: "15:00", venue: "MetLife Stadium", city: "New York", group: "C" },
  { home: "Haiti", away: "Scotland", date: "Jun 13", time: "18:00", venue: "Lincoln Financial", city: "Philadelphia", group: "C" },
  { home: "Australia", away: "Turkey", date: "Jun 13", time: "21:00", venue: "Levi's Stadium", city: "San Francisco", group: "D" },
  { home: "Germany", away: "Curaçao", date: "Jun 14", time: "15:00", venue: "Mercedes-Benz", city: "Atlanta", group: "E" },
  { home: "Ivory Coast", away: "Ecuador", date: "Jun 14", time: "18:00", venue: "NRG Stadium", city: "Houston", group: "E" },
  { home: "Netherlands", away: "Japan", date: "Jun 14", time: "21:00", venue: "Gillette Stadium", city: "Boston", group: "F" },
  { home: "Sweden", away: "Tunisia", date: "Jun 15", time: "15:00", venue: "Estadio BBVA", city: "Monterrey", group: "F" },
  { home: "Belgium", away: "Egypt", date: "Jun 15", time: "18:00", venue: "Lumen Field", city: "Seattle", group: "G" },
  { home: "Iran", away: "New Zealand", date: "Jun 15", time: "21:00", venue: "BC Place", city: "Vancouver", group: "G" },
  { home: "Spain", away: "Cape Verde", date: "Jun 16", time: "15:00", venue: "Estadio Azteca", city: "Mexico City", group: "H" },
  { home: "Saudi Arabia", away: "Uruguay", date: "Jun 16", time: "18:00", venue: "Hard Rock Stadium", city: "Miami", group: "H" },
  { home: "France", away: "Senegal", date: "Jun 16", time: "21:00", venue: "MetLife Stadium", city: "New York", group: "I" },
  { home: "Iraq", away: "Norway", date: "Jun 17", time: "15:00", venue: "Estadio Akron", city: "Guadalajara", group: "I" },
  { home: "Argentina", away: "Algeria", date: "Jun 17", time: "18:00", venue: "GEHA Field", city: "Kansas City", group: "J" },
  { home: "Austria", away: "Jordan", date: "Jun 17", time: "21:00", venue: "SoFi Stadium", city: "Los Angeles", group: "J" },
  { home: "Portugal", away: "DR Congo", date: "Jun 18", time: "15:00", venue: "AT&T Stadium", city: "Dallas", group: "K" },
  { home: "Uzbekistan", away: "Colombia", date: "Jun 18", time: "18:00", venue: "NRG Stadium", city: "Houston", group: "K" },
  { home: "England", away: "Croatia", date: "Jun 18", time: "21:00", venue: "Mercedes-Benz", city: "Atlanta", group: "L" },
  { home: "Ghana", away: "Panama", date: "Jun 19", time: "15:00", venue: "Gillette Stadium", city: "Boston", group: "L" },
];

// ==========================================
// FEATURED MATCH
// ==========================================
export const FEATURED_MATCH = {
  homeTeam: "United States",
  awayTeam: "Paraguay",
  date: "June 12, 2026",
  time: "21:00",
  homeWin: 52,
  draw: 24,
  awayWin: 24,
  over25: 58,
  league: "World Cup 2026 · Group D · Matchday 1",
  venue: "SoFi Stadium, Los Angeles",
};

// ==========================================
// KNOCKOUT ROUNDS
// ==========================================
export const KNOCKOUT_ROUNDS = [
  { name: "Round of 32", emoji: "⚔️", date: "Jun 28 – Jul 1" },
  { name: "Round of 16", emoji: "🗡️", date: "Jul 2 – 5" },
  { name: "Quarter-finals", emoji: "🏟️", date: "Jul 8 – 9" },
  { name: "Semi-finals", emoji: "🔥", date: "Jul 14 – 15" },
  { name: "Third-place", emoji: "🥉", date: "Jul 18" },
  { name: "Final", emoji: "🏆", date: "Jul 19 · MetLife Stadium" },
];

// ==========================================
// HOST CITIES & VENUES
// ==========================================
export const VENUES = [
  { city: "Mexico City", country: "Mexico", stadium: "Estadio Azteca", capacity: 83000 },
  { city: "Monterrey", country: "Mexico", stadium: "Estadio BBVA", capacity: 53500 },
  { city: "Guadalajara", country: "Mexico", stadium: "Estadio Akron", capacity: 49850 },
  { city: "Toronto", country: "Canada", stadium: "BMO Field", capacity: 45500 },
  { city: "Vancouver", country: "Canada", stadium: "BC Place", capacity: 54500 },
  { city: "New York/NJ", country: "USA", stadium: "MetLife Stadium", capacity: 82500 },
  { city: "Los Angeles", country: "USA", stadium: "SoFi Stadium", capacity: 70240 },
  { city: "Dallas", country: "USA", stadium: "AT&T Stadium", capacity: 94000 },
  { city: "Atlanta", country: "USA", stadium: "Mercedes-Benz Stadium", capacity: 75000 },
  { city: "Houston", country: "USA", stadium: "NRG Stadium", capacity: 72220 },
  { city: "Philadelphia", country: "USA", stadium: "Lincoln Financial Field", capacity: 69796 },
  { city: "Miami", country: "USA", stadium: "Hard Rock Stadium", capacity: 65326 },
  { city: "Seattle", country: "USA", stadium: "Lumen Field", capacity: 69000 },
  { city: "San Francisco", country: "USA", stadium: "Levi's Stadium", capacity: 68500 },
  { city: "Kansas City", country: "USA", stadium: "GEHA Field", capacity: 73000 },
  { city: "Boston", country: "USA", stadium: "Gillette Stadium", capacity: 65878 },
];

// Helper to find which group a team is in
export function getTeamGroup(teamName: string): string {
  for (const [group, teams] of Object.entries(GROUPS)) {
    if (teams.includes(teamName)) return group;
  }
  return "";
}
