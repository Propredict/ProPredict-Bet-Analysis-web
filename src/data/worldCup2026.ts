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
  // Times shown in CET (Central European Time). Matchday 1
  { home: "Mexico", away: "South Africa", date: "Jun 11", time: "21:00", venue: "Estadio Azteca", city: "Mexico City", group: "A" },
  { home: "South Korea", away: "Czech Republic", date: "Jun 12", time: "04:00", venue: "AT&T Stadium", city: "Dallas", group: "A" },
  { home: "Canada", away: "Bosnia & Herzegovina", date: "Jun 12", time: "21:00", venue: "BMO Field", city: "Toronto", group: "B" },
  { home: "United States", away: "Paraguay", date: "Jun 13", time: "03:00", venue: "SoFi Stadium", city: "Los Angeles", group: "D" },
  { home: "Qatar", away: "Switzerland", date: "Jun 13", time: "21:00", venue: "GEHA Field", city: "Kansas City", group: "B" },
  { home: "Brazil", away: "Morocco", date: "Jun 14", time: "00:00", venue: "MetLife Stadium", city: "New York", group: "C" },
  { home: "Haiti", away: "Scotland", date: "Jun 14", time: "03:00", venue: "Lincoln Financial", city: "Philadelphia", group: "C" },
  { home: "Australia", away: "Turkey", date: "Jun 14", time: "06:00", venue: "Levi's Stadium", city: "San Francisco", group: "D" },
  { home: "Germany", away: "Curaçao", date: "Jun 14", time: "19:00", venue: "Mercedes-Benz", city: "Atlanta", group: "E" },
  { home: "Netherlands", away: "Japan", date: "Jun 14", time: "22:00", venue: "Gillette Stadium", city: "Boston", group: "F" },
  { home: "Ivory Coast", away: "Ecuador", date: "Jun 15", time: "01:00", venue: "NRG Stadium", city: "Houston", group: "E" },
  { home: "Sweden", away: "Tunisia", date: "Jun 15", time: "04:00", venue: "Estadio BBVA", city: "Monterrey", group: "F" },
  { home: "Spain", away: "Cape Verde", date: "Jun 15", time: "18:00", venue: "Estadio Azteca", city: "Mexico City", group: "H" },
  { home: "Belgium", away: "Egypt", date: "Jun 15", time: "21:00", venue: "Lumen Field", city: "Seattle", group: "G" },
  { home: "Saudi Arabia", away: "Uruguay", date: "Jun 16", time: "00:00", venue: "Hard Rock Stadium", city: "Miami", group: "H" },
  { home: "Iran", away: "New Zealand", date: "Jun 16", time: "03:00", venue: "BC Place", city: "Vancouver", group: "G" },
  { home: "France", away: "Senegal", date: "Jun 16", time: "21:00", venue: "MetLife Stadium", city: "New York", group: "I" },
  { home: "Iraq", away: "Norway", date: "Jun 17", time: "00:00", venue: "Estadio Akron", city: "Guadalajara", group: "I" },
  { home: "Argentina", away: "Algeria", date: "Jun 17", time: "03:00", venue: "GEHA Field", city: "Kansas City", group: "J" },
  { home: "Austria", away: "Jordan", date: "Jun 17", time: "06:00", venue: "SoFi Stadium", city: "Los Angeles", group: "J" },
  { home: "Portugal", away: "DR Congo", date: "Jun 17", time: "19:00", venue: "AT&T Stadium", city: "Dallas", group: "K" },
  { home: "England", away: "Croatia", date: "Jun 17", time: "22:00", venue: "Mercedes-Benz", city: "Atlanta", group: "L" },
  { home: "Ghana", away: "Panama", date: "Jun 18", time: "01:00", venue: "Gillette Stadium", city: "Boston", group: "L" },
  { home: "Uzbekistan", away: "Colombia", date: "Jun 18", time: "04:00", venue: "NRG Stadium", city: "Houston", group: "K" },

  // Matchday 2
  { home: "Czech Republic", away: "South Africa", date: "Jun 18", time: "18:00", venue: "TBD", city: "TBD", group: "A" },
  { home: "Switzerland", away: "Bosnia & Herzegovina", date: "Jun 18", time: "21:00", venue: "TBD", city: "TBD", group: "B" },
  { home: "Canada", away: "Qatar", date: "Jun 19", time: "00:00", venue: "TBD", city: "TBD", group: "B" },
  { home: "Mexico", away: "South Korea", date: "Jun 19", time: "03:00", venue: "TBD", city: "TBD", group: "A" },
  { home: "United States", away: "Australia", date: "Jun 19", time: "21:00", venue: "TBD", city: "TBD", group: "D" },
  { home: "Scotland", away: "Morocco", date: "Jun 20", time: "00:00", venue: "TBD", city: "TBD", group: "C" },
  { home: "Brazil", away: "Haiti", date: "Jun 20", time: "02:30", venue: "TBD", city: "TBD", group: "C" },
  { home: "Turkey", away: "Paraguay", date: "Jun 20", time: "05:00", venue: "TBD", city: "TBD", group: "D" },
  { home: "Netherlands", away: "Sweden", date: "Jun 20", time: "19:00", venue: "TBD", city: "TBD", group: "F" },
  { home: "Germany", away: "Ivory Coast", date: "Jun 20", time: "22:00", venue: "TBD", city: "TBD", group: "E" },
  { home: "Ecuador", away: "Curaçao", date: "Jun 21", time: "02:00", venue: "TBD", city: "TBD", group: "E" },
  { home: "Tunisia", away: "Japan", date: "Jun 21", time: "06:00", venue: "TBD", city: "TBD", group: "F" },
  { home: "Spain", away: "Saudi Arabia", date: "Jun 21", time: "18:00", venue: "TBD", city: "TBD", group: "H" },
  { home: "Belgium", away: "Iran", date: "Jun 21", time: "21:00", venue: "TBD", city: "TBD", group: "G" },
  { home: "Uruguay", away: "Cape Verde", date: "Jun 22", time: "00:00", venue: "TBD", city: "TBD", group: "H" },
  { home: "New Zealand", away: "Egypt", date: "Jun 22", time: "03:00", venue: "TBD", city: "TBD", group: "G" },
  { home: "Argentina", away: "Austria", date: "Jun 22", time: "19:00", venue: "TBD", city: "TBD", group: "J" },
  { home: "France", away: "Iraq", date: "Jun 22", time: "23:00", venue: "TBD", city: "TBD", group: "I" },
  { home: "Norway", away: "Senegal", date: "Jun 23", time: "02:00", venue: "TBD", city: "TBD", group: "I" },
  { home: "Jordan", away: "Algeria", date: "Jun 23", time: "05:00", venue: "TBD", city: "TBD", group: "J" },
  { home: "Portugal", away: "Uzbekistan", date: "Jun 23", time: "19:00", venue: "TBD", city: "TBD", group: "K" },
  { home: "England", away: "Ghana", date: "Jun 23", time: "22:00", venue: "TBD", city: "TBD", group: "L" },
  { home: "Panama", away: "Croatia", date: "Jun 24", time: "01:00", venue: "TBD", city: "TBD", group: "L" },
  { home: "Colombia", away: "DR Congo", date: "Jun 24", time: "04:00", venue: "TBD", city: "TBD", group: "K" },

  // Matchday 3 (kickoffs being added as confirmed)
  { home: "Bosnia & Herzegovina", away: "Qatar", date: "Jun 24", time: "21:00", venue: "TBD", city: "TBD", group: "B" },
];

// ==========================================
// FEATURED MATCH
// ==========================================
export const FEATURED_MATCH = {
  homeTeam: "Mexico",
  awayTeam: "South Africa",
  date: "June 11, 2026",
  time: "21:00",
  homeWin: 62,
  draw: 22,
  awayWin: 16,
  over25: 52,
  league: "World Cup 2026 · Group A · Opening Match",
  venue: "Estadio Azteca, Mexico City",
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

// ==========================================
// PHASE 1 — PRE-TOURNAMENT STRENGTH MODEL
// Replaces raw FIFA rank with a composite signal:
//   • Elo rating (eloratings.net snapshot, Nov 2025)
//   • Squad market value €M (Transfermarkt, 2025)
//   • Recent international form pts last 10 (W=3, D=1, L=0; max 30)
// More accurate than FIFA rank because Elo accounts for opponent
// strength + venue, squad value reflects current player quality, and
// form captures momentum heading into the tournament.
// ==========================================

// Elo ratings from eloratings.net (Nov 2025 snapshot). Higher = better.
export const WC_ELO: Record<string, number> = {
  "Argentina": 2143, "Spain": 2112, "France": 2059, "Brazil": 2030,
  "Portugal": 2025, "England": 2009, "Netherlands": 2010, "Germany": 1965,
  "Croatia": 1955, "Belgium": 1925, "Uruguay": 1925, "Colombia": 1900,
  "Morocco": 1880, "Norway": 1860, "Switzerland": 1840, "Japan": 1840,
  "Senegal": 1830, "Austria": 1830, "United States": 1820, "Ecuador": 1815,
  "Iran": 1810, "Turkey": 1810, "Ivory Coast": 1810, "South Korea": 1795,
  "Egypt": 1790, "Algeria": 1780, "Mexico": 1780, "Scotland": 1780,
  "Czech Republic": 1760, "Sweden": 1750, "Tunisia": 1740, "Australia": 1730,
  "Ghana": 1730, "Bosnia & Herzegovina": 1700, "Paraguay": 1700, "DR Congo": 1700,
  "Cape Verde": 1670, "Iraq": 1670, "Saudi Arabia": 1660, "Panama": 1660,
  "Uzbekistan": 1650, "Qatar": 1640, "Jordan": 1620, "South Africa": 1700,
  "New Zealand": 1500, "Haiti": 1500, "Curaçao": 1500,
};

// Squad market value in €M (Transfermarkt, 2025). Higher = better.
export const WC_SQUAD_VALUE: Record<string, number> = {
  "England": 1500, "France": 1400, "Spain": 1280, "Portugal": 1100,
  "Brazil": 1100, "Germany": 950, "Netherlands": 830, "Argentina": 750,
  "Belgium": 620, "Norway": 430, "Uruguay": 430, "Colombia": 430,
  "Croatia": 360, "Morocco": 330, "Austria": 320, "Switzerland": 310,
  "United States": 310, "Senegal": 290, "Turkey": 290, "Japan": 260,
  "Ecuador": 260, "Mexico": 250, "Sweden": 190, "South Korea": 190,
  "Ivory Coast": 190, "Scotland": 180, "DR Congo": 170, "Czech Republic": 150,
  "Egypt": 120, "Algeria": 120, "Ghana": 120, "South Africa": 80,
  "Bosnia & Herzegovina": 80, "Iran": 50, "Tunisia": 50, "Cape Verde": 50,
  "Australia": 70, "Paraguay": 50, "Saudi Arabia": 30, "Haiti": 30,
  "New Zealand": 30, "Iraq": 25, "Uzbekistan": 25, "Qatar": 25,
  "Curaçao": 25, "Panama": 25, "Jordan": 15,
};

// Recent international form — last 10 matches points (W=3, D=1, L=0).
// Max = 30. Snapshot from qualifiers + friendlies through Nov 2025.
export const WC_RECENT_FORM: Record<string, number> = {
  "Argentina": 22, "Spain": 24, "France": 21, "Brazil": 18,
  "Portugal": 23, "England": 20, "Netherlands": 19, "Germany": 17,
  "Croatia": 18, "Belgium": 16, "Uruguay": 17, "Colombia": 19,
  "Morocco": 22, "Norway": 21, "Switzerland": 17, "Japan": 22,
  "Senegal": 20, "Austria": 18, "United States": 14, "Ecuador": 19,
  "Iran": 21, "Turkey": 18, "Ivory Coast": 19, "South Korea": 19,
  "Egypt": 20, "Algeria": 18, "Mexico": 16, "Scotland": 15,
  "Czech Republic": 15, "Sweden": 12, "Tunisia": 16, "Australia": 17,
  "Ghana": 14, "Bosnia & Herzegovina": 14, "Paraguay": 16, "DR Congo": 17,
  "Cape Verde": 19, "Iraq": 16, "Saudi Arabia": 13, "Panama": 14,
  "Uzbekistan": 18, "Qatar": 12, "Jordan": 17, "South Africa": 18,
  "New Zealand": 16, "Haiti": 10, "Curaçao": 12,
};

/**
 * Composite pre-tournament strength score (0-100, higher = better).
 * Blends Elo (50%), squad value (30%), recent form (20%).
 * Falls back to inverted FIFA rank if a signal is missing.
 */
export function wcStrength(teamName: string): number {
  const team = TEAMS[teamName];
  const elo = WC_ELO[teamName];
  const squad = WC_SQUAD_VALUE[teamName];
  const form = WC_RECENT_FORM[teamName];

  // Normalize each signal to 0..100
  // Elo: 1500 (weakest WC team) → 0, 2150 (Argentina) → 100
  const eloNorm = elo != null ? Math.max(0, Math.min(100, ((elo - 1500) / 650) * 100)) : null;
  // Squad: log scale, 15 €M → 0, 1500 €M → 100
  const squadNorm = squad != null
    ? Math.max(0, Math.min(100, (Math.log10(squad) - Math.log10(15)) / (Math.log10(1500) - Math.log10(15)) * 100))
    : null;
  // Form: 30 pts → 100
  const formNorm = form != null ? Math.max(0, Math.min(100, (form / 30) * 100)) : null;

  const parts: { v: number; w: number }[] = [];
  if (eloNorm != null) parts.push({ v: eloNorm, w: 0.5 });
  if (squadNorm != null) parts.push({ v: squadNorm, w: 0.3 });
  if (formNorm != null) parts.push({ v: formNorm, w: 0.2 });

  if (parts.length > 0) {
    const totalW = parts.reduce((s, p) => s + p.w, 0);
    return parts.reduce((s, p) => s + p.v * p.w, 0) / totalW;
  }

  // Fallback: inverted FIFA rank (rank 1 → 100, rank 100 → 0)
  if (team) return Math.max(0, 100 - team.fifaRank);
  return 30;
}

// ==========================================
// PHASE 2 — DURING-TOURNAMENT MODIFIERS
// ==========================================

export type WCResult = "W" | "D" | "L";

/**
 * Tournament momentum boost. Wins early in the tournament carry
 * confidence into the next match. Capped to avoid runaway swings.
 * +4 per W, +1 per D, -2 per L. Clamped to [-6, +8].
 */
export function wcMomentumBoost(results: WCResult[] | undefined | null): number {
  if (!results || results.length === 0) return 0;
  const raw = results.reduce((s, r) => s + (r === "W" ? 4 : r === "D" ? 1 : -2), 0);
  return Math.max(-6, Math.min(8, raw));
}

/**
 * Rest-days differential. +1.6 strength points per extra day of rest,
 * capped at ±6. (e.g. 4 vs 3 days rest → +1.6 to the rested side.)
 */
export function wcRestAdvantage(homeRestDays: number | null, awayRestDays: number | null): number {
  if (homeRestDays == null || awayRestDays == null) return 0;
  const diff = homeRestDays - awayRestDays;
  return Math.max(-6, Math.min(6, diff * 1.6));
}

/**
 * Knockout-stage adjustment. Historical WC knockout games average
 * ~22% fewer goals than group stage, and draws after 90' are common
 * (go to ET / penalties). We compress the win shares slightly and
 * push the draw share up.
 */
export function wcApplyKnockoutShape(
  homeWin: number,
  draw: number,
  awayWin: number,
): { homeWin: number; draw: number; awayWin: number; lowScoring: true } {
  // Pull 6 pts from each win share, add 12 to draw → tighter, more cautious match
  const hw = Math.max(8, homeWin - 6);
  const aw = Math.max(8, awayWin - 6);
  const d = Math.max(15, 100 - hw - aw);
  return { homeWin: hw, draw: d, awayWin: aw, lowScoring: true };
}

/**
 * Penalty-shootout probability for knockout matches.
 * Strong-favorite matchups → low PK chance. Even matchups → up to ~30%.
 * Returns null for non-knockout games.
 */
export function wcPenaltyShootoutProb(
  homeStrength: number,
  awayStrength: number,
  isKnockout: boolean,
): number | null {
  if (!isKnockout) return null;
  const gap = Math.abs(homeStrength - awayStrength);
  // gap 0 → 30%, gap 25+ → 8%
  return Math.round(Math.max(8, 30 - gap * 0.9));
}

// ==========================================
// PHASE 3 — WORLD CUP-SPECIFIC MARKETS
// ==========================================

/**
 * Confederation of each WC 2026 team. Used for bias correction —
 * historically UEFA + CONMEBOL teams over-perform vs the bookies'
 * expectations on AFC/CAF opponents by ~10-12% in WC matches.
 */
export type WCConfederation = "UEFA" | "CONMEBOL" | "CONCACAF" | "AFC" | "CAF" | "OFC";

export const WC_CONFEDERATION: Record<string, WCConfederation> = {
  // UEFA
  "Czech Republic": "UEFA", "Switzerland": "UEFA", "Scotland": "UEFA",
  "Turkey": "UEFA", "Germany": "UEFA", "Netherlands": "UEFA", "Sweden": "UEFA",
  "Belgium": "UEFA", "Spain": "UEFA", "France": "UEFA", "Norway": "UEFA",
  "Austria": "UEFA", "Portugal": "UEFA", "England": "UEFA", "Croatia": "UEFA",
  "Bosnia & Herzegovina": "UEFA", "Italy": "UEFA",
  // CONMEBOL
  "Brazil": "CONMEBOL", "Paraguay": "CONMEBOL", "Ecuador": "CONMEBOL",
  "Uruguay": "CONMEBOL", "Argentina": "CONMEBOL", "Colombia": "CONMEBOL",
  // CONCACAF
  "Mexico": "CONCACAF", "Canada": "CONCACAF", "United States": "CONCACAF",
  "Haiti": "CONCACAF", "Curaçao": "CONCACAF", "Panama": "CONCACAF",
  // AFC
  "South Korea": "AFC", "Qatar": "AFC", "Australia": "AFC", "Japan": "AFC",
  "Iran": "AFC", "Saudi Arabia": "AFC", "Iraq": "AFC", "Jordan": "AFC",
  "Uzbekistan": "AFC",
  // CAF
  "South Africa": "CAF", "Morocco": "CAF", "Ivory Coast": "CAF",
  "Tunisia": "CAF", "Egypt": "CAF", "Cape Verde": "CAF", "Senegal": "CAF",
  "Algeria": "CAF", "DR Congo": "CAF", "Ghana": "CAF",
  // OFC
  "New Zealand": "OFC",
};

/**
 * Confederation bias correction. Historically, on neutral or US/Mex/Can soil:
 *   UEFA + CONMEBOL outperform AFC by ~10pp and CAF by ~8pp.
 * Returns a strength delta to ADD to homeStr - awayStr.
 */
export function wcConfederationBias(homeTeam: string, awayTeam: string): number {
  const h = WC_CONFEDERATION[homeTeam];
  const a = WC_CONFEDERATION[awayTeam];
  if (!h || !a) return 0;
  const TIER: Record<WCConfederation, number> = {
    CONMEBOL: 4, UEFA: 4, CONCACAF: 1, AFC: -3, CAF: -2, OFC: -5,
  };
  return TIER[h] - TIER[a];
}

/**
 * Top-scorer-team market — returns probability (%) that `team` will be
 * the highest-scoring side of the match. Uses strength gap + a slight
 * bias toward attacking sides (CONMEBOL/UEFA top tier).
 */
export function wcTopScorerTeamProb(homeTeam: string, awayTeam: string): {
  home: number; away: number; tie: number;
} {
  const gap = wcStrength(homeTeam) - wcStrength(awayTeam) + wcConfederationBias(homeTeam, awayTeam) * 0.5;
  const tieShare = 22; // both teams scoring same → ~22%
  const winShare = (100 - tieShare) / 2;
  const tilt = Math.max(-winShare * 0.9, Math.min(winShare * 0.9, gap * 1.2));
  return {
    home: Math.round(winShare + tilt),
    away: Math.round(winShare - tilt),
    tie: tieShare,
  };
}

/**
 * Group standing entry used by `wcGroupWinnerProbs`.
 */
export interface WCGroupEntry {
  team: string;
  points: number;
  goalDiff: number;
  played: number;
}

/**
 * Returns probability (%) for each team in a 4-team group to FINISH 1st.
 * Uses current points + remaining strength projection over remaining
 * matches. Before MD1, falls back to pure strength-share.
 */
export function wcGroupWinnerProbs(
  groupName: string,
  standings?: WCGroupEntry[],
): { team: string; pct: number }[] {
  const teams = GROUPS[groupName] || [];
  if (teams.length === 0) return [];

  // Pure pre-tournament fallback
  if (!standings || standings.length === 0) {
    const strengths = teams.map(t => ({ team: t, s: wcStrength(t) }));
    // Soft-max-ish weighting (exponential)
    const weights = strengths.map(x => Math.exp(x.s / 18));
    const total = weights.reduce((a, b) => a + b, 0);
    return strengths.map((x, i) => ({
      team: x.team,
      pct: Math.round((weights[i] / total) * 100),
    }));
  }

  // With live standings: combine current points with projected remaining
  const MAX_MD = 3;
  const projected = standings.map(s => {
    const remaining = Math.max(0, MAX_MD - s.played);
    // Each remaining match worth ~1.5 expected points scaled by strength
    const strBoost = (wcStrength(s.team) / 100) * 3 * remaining;
    return {
      team: s.team,
      score: s.points * 10 + strBoost * 6 + s.goalDiff * 0.8,
    };
  });
  const weights = projected.map(p => Math.exp(p.score / 12));
  const total = weights.reduce((a, b) => a + b, 0);
  return projected.map((p, i) => ({
    team: p.team,
    pct: Math.round((weights[i] / total) * 100),
  }));
}

/**
 * Unified match projection that plugs in Phase 1 strength + Phase 2
 * during-tournament modifiers. Pre-tournament, just pass strengths and
 * leave the optional context empty.
 */
export interface WCProjectionContext {
  homeIsHost?: boolean;
  awayIsHost?: boolean;
  homeMomentum?: WCResult[];
  awayMomentum?: WCResult[];
  homeRestDays?: number | null;
  awayRestDays?: number | null;
  isKnockout?: boolean;
  // Group stage 3rd round "must-win" flag → boosts Over 2.5
  isMustWin?: boolean;
}

export interface WCProjectionResult {
  homeWin: number;
  draw: number;
  awayWin: number;
  confidence: number;
  homeAdj: number;
  awayAdj: number;
  /** Probability the match goes to penalties (knockout only) */
  penaltyProb: number | null;
  /** True when the model expects a low-scoring affair (KO stage) */
  lowScoring: boolean;
  /** True when both teams need a win (group MD3) → expect Over 2.5 push */
  highStakes: boolean;
}

export function wcMatchProjection(
  homeTeam: string,
  awayTeam: string,
  ctx: WCProjectionContext = {},
): WCProjectionResult {
  const homeStr = wcStrength(homeTeam);
  const awayStr = wcStrength(awayTeam);
  const homeAdv = ctx.homeIsHost ? 10 : 6;
  const awayAdv = ctx.awayIsHost ? 4 : 0;

  const homeMo = wcMomentumBoost(ctx.homeMomentum);
  const awayMo = wcMomentumBoost(ctx.awayMomentum);
  const restAdj = wcRestAdvantage(ctx.homeRestDays ?? null, ctx.awayRestDays ?? null);

  const homeAdj = homeStr + homeAdv + homeMo + Math.max(0, restAdj);
  const awayAdj = awayStr + awayAdv + awayMo + Math.max(0, -restAdj);
  // Phase 3: confederation bias — small lift for UEFA/CONMEBOL vs AFC/CAF
  const confBias = wcConfederationBias(homeTeam, awayTeam);
  const gap = (homeAdj - awayAdj) + confBias;
  const absGap = Math.abs(gap);

  const drawBase = 28 - Math.min(15, absGap * 0.6);
  const winShare = (100 - drawBase) / 2;
  const tilt = Math.max(-winShare * 0.85, Math.min(winShare * 0.85, gap * 1.1));
  let homeWin = Math.max(6, Math.round(winShare + tilt));
  let awayWin = Math.max(6, Math.round(winShare - tilt));
  let draw = Math.max(8, 100 - homeWin - awayWin);

  if (ctx.isKnockout) {
    const ko = wcApplyKnockoutShape(homeWin, draw, awayWin);
    homeWin = ko.homeWin;
    draw = ko.draw;
    awayWin = ko.awayWin;
  }

  const confidence = Math.min(90, Math.round(58 + absGap * 0.55 + (homeMo + awayMo) * 0.4));

  return {
    homeWin,
    draw,
    awayWin,
    confidence,
    homeAdj,
    awayAdj,
    penaltyProb: wcPenaltyShootoutProb(homeStr, awayStr, !!ctx.isKnockout),
    lowScoring: !!ctx.isKnockout,
    highStakes: !!ctx.isMustWin,
  };
}
