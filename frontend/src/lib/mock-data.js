export const mockTournaments = [
  { id: "1", name: "Grand Masters Open 2026", type: "Swiss", status: "active", players: 42, maxPlayers: 64, rounds: 9, currentRound: 5, timeControl: "90+30", venue: "Metropolitan Chess Club", mode: "Offline", startDate: "2026-02-20", endDate: "2026-03-01", prizePool: "$5,000", rated: true, entryFee: "$50", minRating: 1800 },
  { id: "2", name: "Weekend Blitz Championship", type: "Blitz", status: "active", players: 28, maxPlayers: 32, rounds: 11, currentRound: 7, timeControl: "3+2", venue: "Online Arena", mode: "Online", startDate: "2026-02-25", endDate: "2026-02-26", rated: true, entryFee: "$10" },
  { id: "3", name: "Spring Classical Invitational", type: "Round Robin", status: "upcoming", players: 8, maxPlayers: 10, rounds: 9, currentRound: 0, timeControl: "120+30", venue: "Royal Chess Hall", mode: "Offline", startDate: "2026-03-15", endDate: "2026-03-25", prizePool: "$10,000", rated: true, entryFee: "$100", minRating: 2200 },
  { id: "4", name: "Rapid Cup Series", type: "Rapid", status: "upcoming", players: 16, maxPlayers: 32, rounds: 7, currentRound: 0, timeControl: "15+10", venue: "City Convention Center", mode: "Offline", startDate: "2026-04-01", endDate: "2026-04-02", rated: false },
  { id: "5", name: "Winter Swiss League", type: "Swiss", status: "completed", players: 56, maxPlayers: 64, rounds: 7, currentRound: 7, timeControl: "60+15", venue: "Chess Academy", mode: "Offline", startDate: "2026-01-10", endDate: "2026-01-17", prizePool: "$3,000", rated: true, entryFee: "$30" },
  { id: "6", name: "Online Knockout Showdown", type: "Knockout", status: "completed", players: 32, maxPlayers: 32, rounds: 5, currentRound: 5, timeControl: "25+10", venue: "Digital Arena", mode: "Online", startDate: "2026-02-01", endDate: "2026-02-05", rated: false },
  { id: "7", name: "Community Friendly Open", type: "Swiss", status: "upcoming", players: 10, maxPlayers: 40, rounds: 5, currentRound: 0, timeControl: "30+5", venue: "Community Hall", mode: "Offline", startDate: "2026-04-10", endDate: "2026-04-11", rated: false },
];

export const mockPlayers = [
  { id: "p1", name: "Magnus Andersson", rating: 2650, title: "GM", country: "SWE", wins: 45, losses: 8, draws: 22 },
  { id: "p2", name: "Elena Petrova", rating: 2580, title: "IM", country: "RUS", wins: 38, losses: 12, draws: 25 },
  { id: "p3", name: "Raj Krishnan", rating: 2520, title: "IM", country: "IND", wins: 35, losses: 15, draws: 20 },
  { id: "p4", name: "Carlos Rivera", rating: 2490, title: "FM", country: "ESP", wins: 30, losses: 18, draws: 27 },
  { id: "p5", name: "Sophie Laurent", rating: 2470, title: "FM", country: "FRA", wins: 28, losses: 14, draws: 33 },
  { id: "p6", name: "James Okonkwo", rating: 2445, title: "FM", country: "NGA", wins: 32, losses: 20, draws: 18 },
  { id: "p7", name: "Akira Tanaka", rating: 2410, title: "CM", country: "JPN", wins: 25, losses: 22, draws: 23 },
  { id: "p8", name: "Lisa Müller", rating: 2390, title: "CM", country: "GER", wins: 27, losses: 19, draws: 24 },
];

export const mockLeaderboard = mockPlayers.map((player, i) => ({
  rank: i + 1,
  player,
  points: [7.5, 6.5, 6, 5.5, 5, 4.5, 4, 3.5][i],
  buchholz: [42.5, 40, 38.5, 37, 36, 34.5, 33, 31][i],
  sonnebornBerger: [35.25, 30.5, 28, 25.75, 24, 21, 19.5, 16][i],
  gamesPlayed: 9,
}));

export const mockMatchHistory = [
  { id: "m1", white: "You", black: "Magnus Andersson", result: "0-1", round: 1, date: "2026-02-20", ratingChange: -8, tournamentId: "1", tournamentName: "Grand Masters Open 2026" },
  { id: "m2", white: "Elena Petrova", black: "You", result: "½-½", round: 2, date: "2026-02-21", ratingChange: 4, tournamentId: "1", tournamentName: "Grand Masters Open 2026" },
  { id: "m3", white: "You", black: "Raj Krishnan", result: "1-0", round: 3, date: "2026-02-22", ratingChange: 12, tournamentId: "1", tournamentName: "Grand Masters Open 2026" },
  { id: "m4", white: "Carlos Rivera", black: "You", result: "0-1", round: 4, date: "2026-02-23", ratingChange: 10, tournamentId: "2", tournamentName: "Weekend Blitz Championship" },
  { id: "m5", white: "You", black: "Sophie Laurent", result: "1-0", round: 5, date: "2026-02-24", ratingChange: 8, tournamentId: "2", tournamentName: "Weekend Blitz Championship" },
  { id: "m6", white: "James Okonkwo", black: "You", result: "½-½", round: 1, date: "2026-01-10", ratingChange: 2, tournamentId: "5", tournamentName: "Winter Swiss League" },
  { id: "m7", white: "You", black: "Akira Tanaka", result: "1-0", round: 2, date: "2026-01-11", ratingChange: 6, tournamentId: "5", tournamentName: "Winter Swiss League" },
  { id: "m8", white: "Lisa Müller", black: "You", result: "0-1", round: 3, date: "2026-01-12", ratingChange: 9, tournamentId: "5", tournamentName: "Winter Swiss League" },
];

export const mockRatingHistory = [
  { month: "Sep", rating: 1850 },
  { month: "Oct", rating: 1875 },
  { month: "Nov", rating: 1920 },
  { month: "Dec", rating: 1895 },
  { month: "Jan", rating: 1940 },
  { month: "Feb", rating: 1968 },
];

export const mockOrbiterStats = {
  totalTournaments: 24,
  activeTournaments: 2,
  ongoingRounds: 3,
  pendingRequests: 5,
  completedTournaments: 22,
  totalMatchesPlayed: 842,
};

export const mockUserStats = {
  totalTournaments: 12,
  activeTournaments: 2,
  totalPrize: "$1,250",
  totalMatches: 78,
  currentRating: 1968,
  wins: 34,
  losses: 22,
  draws: 22,
};

export const mockOrganizerRequests = [
  { id: "r1", name: "David Chen", email: "david@chess.org", tournament: "Community Open 2026", date: "2026-02-24", status: "pending" },
  { id: "r2", name: "Maria Santos", email: "maria@club.com", tournament: "Youth Championship", date: "2026-02-23", status: "pending" },
  { id: "r3", name: "Ahmed Hassan", email: "ahmed@fide.com", tournament: "Regional Qualifiers", date: "2026-02-22", status: "pending" },
];

export const mockArbiterVacancies = [
  { id: "v1", tournament: "City Open Championship 2026", date: "2026-05-01", compensation: "$200/day", status: "open", description: "Seeking experienced arbiter for a 7-round Swiss tournament with 64 players." },
  { id: "v2", tournament: "Junior National Qualifiers", date: "2026-04-15", compensation: "$150/day", status: "open", description: "Need arbiter familiar with youth regulations for a 5-round event." },
  { id: "v3", tournament: "Online Rapid Series Finals", date: "2026-03-20", compensation: "$100 flat", status: "applied", description: "Remote arbiter role for an online rapid tournament with anti-cheating monitoring." },
];

export const mockOrbiterPlayingStats = {
  totalTournaments: 6,
  activeTournaments: 1,
  totalMatches: 32,
  wins: 15,
  losses: 10,
  draws: 7,
  currentRating: 2180,
};
