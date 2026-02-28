/**
 * Tournament Management Service
 * Handles tournament operations, Swiss pairing, tie-breakers, and player management
 */

// ==================== TOURNAMENT STORAGE ====================

/**
 * Get all tournaments from localStorage
 */
export const getTournaments = () => {
  const stored = localStorage.getItem("tournaments");
  return stored ? JSON.parse(stored) : [];
};

/**
 * Get a single tournament by ID
 */
export const getTournamentById = (id) => {
  const tournaments = getTournaments();
  return tournaments.find((t) => t.id === id);
};

/**
 * Save tournaments to localStorage
 */
const saveTournaments = (tournaments) => {
  localStorage.setItem("tournaments", JSON.stringify(tournaments));
};

/**
 * Create a new tournament
 */
export const createTournament = (tournamentData) => {
  const tournaments = getTournaments();

  const newTournament = {
    ...tournamentData,
    id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: "upcoming",
    players: [],
    registeredPlayers: [],
    rounds: parseInt(tournamentData.rounds || 5),
    currentRound: 0,
    pairings: [],
    standings: [],
    createdAt: new Date().toISOString(),
    createdBy:
      JSON.parse(localStorage.getItem("userData") || "{}").email || "unknown",
  };

  tournaments.push(newTournament);
  saveTournaments(tournaments);

  return newTournament;
};

/**
 * Update tournament
 */
export const updateTournament = (id, updates) => {
  const tournaments = getTournaments();
  const index = tournaments.findIndex((t) => t.id === id);

  if (index === -1) throw new Error("Tournament not found");

  tournaments[index] = { ...tournaments[index], ...updates };
  saveTournaments(tournaments);

  return tournaments[index];
};

/**
 * Delete tournament
 */
export const deleteTournament = (id) => {
  const tournaments = getTournaments();
  const filtered = tournaments.filter((t) => t.id !== id);
  saveTournaments(filtered);
};

// ==================== PLAYER REGISTRATION ====================

/**
 * Register a player for a tournament
 */
export const registerPlayer = (tournamentId, playerData) => {
  const tournament = getTournamentById(tournamentId);

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== "upcoming") throw new Error("Registration closed");
  if (
    tournament.registeredPlayers.length >= parseInt(tournament.maxPlayers || 64)
  ) {
    throw new Error("Tournament is full");
  }

  // Check if player already registered
  const alreadyRegistered = tournament.registeredPlayers.some(
    (p) => p.email === playerData.email || p.fideId === playerData.fideId,
  );

  if (alreadyRegistered) throw new Error("Player already registered");

  // Validate minimum rating if required
  if (
    tournament.minRating &&
    playerData.rating < parseInt(tournament.minRating)
  ) {
    throw new Error(`Minimum rating required: ${tournament.minRating}`);
  }

  const player = {
    ...playerData,
    id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    registeredAt: new Date().toISOString(),
    points: 0,
    buchholz: 0,
    sonnebornBerger: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    opponents: [],
    colors: [], // Track which color player had each round
    results: [], // Track results of each round
  };

  tournament.registeredPlayers.push(player);
  updateTournament(tournamentId, {
    registeredPlayers: tournament.registeredPlayers,
  });

  return player;
};

/**
 * Unregister a player from a tournament
 */
export const unregisterPlayer = (tournamentId, playerId) => {
  const tournament = getTournamentById(tournamentId);

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== "upcoming")
    throw new Error("Cannot unregister after tournament starts");

  tournament.registeredPlayers = tournament.registeredPlayers.filter(
    (p) => p.id !== playerId,
  );
  updateTournament(tournamentId, {
    registeredPlayers: tournament.registeredPlayers,
  });
};

// ==================== SWISS PAIRING SYSTEM ====================

/**
 * Calculate Swiss pairings for a round
 * Implements FIDE Swiss pairing rules
 */
export const generateSwissPairings = (tournamentId, roundNumber) => {
  const tournament = getTournamentById(tournamentId);

  if (!tournament) throw new Error("Tournament not found");

  const players = [...tournament.registeredPlayers];

  if (players.length < 2) throw new Error("Need at least 2 players");

  // First round: pair by rating
  if (roundNumber === 1) {
    return pairFirstRound(players);
  }

  // Subsequent rounds: Swiss system
  return pairSubsequentRound(players, roundNumber);
};

/**
 * First round pairing: Top half vs bottom half by rating
 */
const pairFirstRound = (players) => {
  // Sort by rating (highest first)
  const sorted = [...players].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const halfPoint = Math.ceil(sorted.length / 2);
  const topHalf = sorted.slice(0, halfPoint);
  const bottomHalf = sorted.slice(halfPoint);

  const pairings = [];

  for (let i = 0; i < topHalf.length; i++) {
    if (bottomHalf[i]) {
      pairings.push({
        board: i + 1,
        white: topHalf[i],
        black: bottomHalf[i],
        result: null,
      });
    } else {
      // Bye for odd number of players
      pairings.push({
        board: i + 1,
        white: topHalf[i],
        black: null,
        result: "1-0", // Bye = automatic win
      });
    }
  }

  return pairings;
};

/**
 * Subsequent round pairing: Group by points, avoid rematches, alternate colors
 */
const pairSubsequentRound = (players, roundNumber) => {
  // Sort by points (descending), then by rating (descending)
  const sorted = [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.rating || 0) - (a.rating || 0);
  });

  // Group players by point score
  const scoreGroups = {};
  sorted.forEach((player) => {
    const points = player.points || 0;
    if (!scoreGroups[points]) scoreGroups[points] = [];
    scoreGroups[points].push(player);
  });

  const pairings = [];
  let boardNumber = 1;
  const paired = new Set();

  // Pair within each score group
  Object.keys(scoreGroups)
    .sort((a, b) => parseFloat(b) - parseFloat(a))
    .forEach((points) => {
      const group = scoreGroups[points].filter((p) => !paired.has(p.id));

      while (group.length >= 2) {
        const player1 = group.shift();

        // Find best opponent (not played before, color balance)
        let opponent = null;
        let opponentIndex = -1;

        for (let i = 0; i < group.length; i++) {
          const candidate = group[i];

          // Check if they've played before
          if (player1.opponents && player1.opponents.includes(candidate.id))
            continue;

          // Found valid opponent
          opponent = candidate;
          opponentIndex = i;
          break;
        }

        if (!opponent && group.length > 0) {
          // No ideal opponent found, take first available
          opponent = group.shift();
        }

        if (opponent) {
          if (opponentIndex >= 0) group.splice(opponentIndex, 1);

          // Determine colors based on previous color assignments
          const player1WhiteCount = (player1.colors || []).filter(
            (c) => c === "white",
          ).length;
          const player2WhiteCount = (opponent.colors || []).filter(
            (c) => c === "white",
          ).length;

          let white, black;

          if (player1WhiteCount < player2WhiteCount) {
            white = player1;
            black = opponent;
          } else if (player2WhiteCount < player1WhiteCount) {
            white = opponent;
            black = player1;
          } else {
            // Equal, higher rated gets white (or alternate)
            if ((player1.rating || 0) >= (opponent.rating || 0)) {
              white = player1;
              black = opponent;
            } else {
              white = opponent;
              black = player1;
            }
          }

          pairings.push({
            board: boardNumber++,
            white,
            black,
            result: null,
          });

          paired.add(player1.id);
          paired.add(opponent.id);
        } else {
          // No opponent available (odd number), give bye
          pairings.push({
            board: boardNumber++,
            white: player1,
            black: null,
            result: "1-0", // Bye
          });
          paired.add(player1.id);
        }
      }

      // Handle remaining player in group (gets bye)
      if (group.length === 1) {
        const player = group[0];
        pairings.push({
          board: boardNumber++,
          white: player,
          black: null,
          result: "1-0", // Bye
        });
        paired.add(player.id);
      }
    });

  return pairings;
};

/**
 * Submit results for a round
 */
export const submitRoundResults = (tournamentId, roundNumber, results) => {
  const tournament = getTournamentById(tournamentId);

  if (!tournament) throw new Error("Tournament not found");

  // Update player records based on results
  results.forEach((result) => {
    const whitePlayer = tournament.registeredPlayers.find(
      (p) => p.id === result.whiteId,
    );
    const blackPlayer = result.blackId
      ? tournament.registeredPlayers.find((p) => p.id === result.blackId)
      : null;

    if (!whitePlayer) return;

    // Initialize arrays if needed
    if (!whitePlayer.results) whitePlayer.results = [];
    if (!whitePlayer.opponents) whitePlayer.opponents = [];
    if (!whitePlayer.colors) whitePlayer.colors = [];

    whitePlayer.colors.push("white");
    whitePlayer.results.push(result.result);

    if (blackPlayer) {
      if (!blackPlayer.results) blackPlayer.results = [];
      if (!blackPlayer.opponents) blackPlayer.opponents = [];
      if (!blackPlayer.colors) blackPlayer.colors = [];

      blackPlayer.colors.push("black");
      whitePlayer.opponents.push(blackPlayer.id);
      blackPlayer.opponents.push(whitePlayer.id);
    }

    // Update points and W/L/D
    if (result.result === "1-0") {
      whitePlayer.points = (whitePlayer.points || 0) + 1;
      whitePlayer.wins = (whitePlayer.wins || 0) + 1;
      if (blackPlayer) {
        blackPlayer.results.push("0-1");
        blackPlayer.losses = (blackPlayer.losses || 0) + 1;
      }
    } else if (result.result === "0-1") {
      whitePlayer.losses = (whitePlayer.losses || 0) + 1;
      if (blackPlayer) {
        blackPlayer.results.push("1-0");
        blackPlayer.points = (blackPlayer.points || 0) + 1;
        blackPlayer.wins = (blackPlayer.wins || 0) + 1;
      }
    } else if (result.result === "½-½") {
      whitePlayer.points = (whitePlayer.points || 0) + 0.5;
      whitePlayer.draws = (whitePlayer.draws || 0) + 1;
      if (blackPlayer) {
        blackPlayer.results.push("½-½");
        blackPlayer.points = (blackPlayer.points || 0) + 0.5;
        blackPlayer.draws = (blackPlayer.draws || 0) + 1;
      }
    }
  });

  // Calculate tie-breakers
  calculateTieBreakers(tournament);

  // Update tournament
  updateTournament(tournamentId, {
    currentRound: roundNumber,
    registeredPlayers: tournament.registeredPlayers,
  });

  return tournament;
};

// ==================== TIE-BREAKER CALCULATIONS ====================

/**
 * Calculate Buchholz and Sonneborn-Berger tie-breakers
 */
export const calculateTieBreakers = (tournament) => {
  const players = tournament.registeredPlayers;

  players.forEach((player) => {
    // Buchholz: Sum of opponents' scores
    let buchholz = 0;

    if (player.opponents && player.opponents.length > 0) {
      player.opponents.forEach((oppId) => {
        const opponent = players.find((p) => p.id === oppId);
        if (opponent) {
          buchholz += opponent.points || 0;
        }
      });
    }

    player.buchholz = buchholz;

    // Sonneborn-Berger: Sum of (opponent score × game result)
    let sonnebornBerger = 0;

    if (player.opponents && player.results) {
      player.opponents.forEach((oppId, index) => {
        const opponent = players.find((p) => p.id === oppId);
        const result = player.results[index];

        if (opponent && result) {
          let multiplier = 0;
          if (result === "1-0") multiplier = 1;
          else if (result === "½-½") multiplier = 0.5;

          sonnebornBerger += (opponent.points || 0) * multiplier;
        }
      });
    }

    player.sonnebornBerger = sonnebornBerger;
  });
};

/**
 * Get tournament standings with tie-breakers
 */
export const getStandings = (tournamentId) => {
  const tournament = getTournamentById(tournamentId);

  if (!tournament) throw new Error("Tournament not found");

  // Calculate tie-breakers if not already done
  calculateTieBreakers(tournament);

  // Sort by points, then Buchholz, then Sonneborn-Berger, then rating
  const standings = [...tournament.registeredPlayers].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    if (b.sonnebornBerger !== a.sonnebornBerger)
      return b.sonnebornBerger - a.sonnebornBerger;
    return (b.rating || 0) - (a.rating || 0);
  });

  // Add ranks
  standings.forEach((player, index) => {
    player.rank = index + 1;
  });

  return standings;
};

// ==================== ROUND ROBIN PAIRING ====================

/**
 * Generate Round Robin pairings (all play all)
 */
export const generateRoundRobinPairings = (players) => {
  const n = players.length;
  const rounds = n % 2 === 0 ? n - 1 : n;
  const allPairings = [];

  // Use Berger tables algorithm
  const playersCopy = [...players];
  if (n % 2 !== 0) {
    playersCopy.push(null); // Bye player
  }

  const totalPlayers = playersCopy.length;

  for (let round = 0; round < rounds; round++) {
    const roundPairings = [];

    for (let i = 0; i < totalPlayers / 2; i++) {
      const idx1 = i;
      const idx2 = totalPlayers - 1 - i;

      const player1 = playersCopy[idx1];
      const player2 = playersCopy[idx2];

      if (player1 && player2) {
        // Alternate colors
        const white = round % 2 === 0 ? player1 : player2;
        const black = round % 2 === 0 ? player2 : player1;

        roundPairings.push({
          board: i + 1,
          white,
          black,
          result: null,
        });
      }
    }

    allPairings.push(roundPairings);

    // Rotate players (keep first player fixed)
    const lastPlayer = playersCopy.pop();
    playersCopy.splice(1, 0, lastPlayer);
  }

  return allPairings;
};

// ==================== KNOCKOUT PAIRING ====================

/**
 * Generate Knockout bracket
 */
export const generateKnockoutBracket = (players) => {
  // Must be power of 2
  const n = players.length;

  // Sort by rating
  const sorted = [...players].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const rounds = Math.ceil(Math.log2(n));
  const bracket = [];

  // First round
  const firstRoundPairings = [];
  for (let i = 0; i < sorted.length / 2; i++) {
    firstRoundPairings.push({
      board: i + 1,
      white: sorted[i],
      black: sorted[sorted.length - 1 - i],
      result: null,
    });
  }

  bracket.push(firstRoundPairings);

  return bracket;
};

// ==================== VALIDATION ====================

/**
 * Validate tournament data
 */
export const validateTournament = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 3) {
    errors.push("Tournament name must be at least 3 characters");
  }

  if (!data.startDate) {
    errors.push("Start date is required");
  }

  if (!data.type) {
    errors.push("Tournament type is required");
  }

  if (!data.timeControl || parseInt(data.timeControl) < 1) {
    errors.push("Valid time control is required");
  }

  if (!data.rounds || parseInt(data.rounds) < 1) {
    errors.push("Number of rounds must be at least 1");
  }

  if (data.entryFee && parseFloat(data.entryFee) < 0) {
    errors.push("Entry fee cannot be negative");
  }

  if (data.isRated) {
    ["fideId", "aicfId", "kscaId"].forEach((field) => {
      if (data[field] && !/^[a-zA-Z0-9]+$/.test(data[field])) {
        errors.push(`${field} must be alphanumeric`);
      }
    });
  }

  if (!data.isRated && (data.fideId || data.aicfId || data.kscaId)) {
    errors.push("Rating IDs can only be set for rated tournaments");
  }

  if (data.detailsPdfType && data.detailsPdfType !== "application/pdf") {
    errors.push("Tournament details document must be a PDF");
  }

  if (data.detailsPdfSize && Number(data.detailsPdfSize) > 10 * 1024 * 1024) {
    errors.push("Tournament details PDF must be 10MB or less");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ==================== TOURNAMENT LIFECYCLE ====================

/**
 * Start a tournament
 */
export const startTournament = (tournamentId) => {
  const tournament = getTournamentById(tournamentId);

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== "upcoming")
    throw new Error("Tournament already started");
  if (tournament.registeredPlayers.length < 2)
    throw new Error("Need at least 2 players");

  updateTournament(tournamentId, {
    status: "active",
    startedAt: new Date().toISOString(),
  });

  return tournament;
};

/**
 * Complete a tournament
 */
export const completeTournament = (tournamentId) => {
  const tournament = getTournamentById(tournamentId);

  if (!tournament) throw new Error("Tournament not found");

  updateTournament(tournamentId, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });

  return tournament;
};
