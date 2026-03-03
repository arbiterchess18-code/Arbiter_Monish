/**
 * Tournament Management Service
 * Handles tournament operations, Swiss pairing, tie-breakers, and player management
 */

const API_URL = "http://localhost:8000";

/**
 * Helper to get current auth headers
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Get all tournaments from Backend
 */
export const getTournaments = async () => {
  try {
    const response = await fetch(`${API_URL}/tournaments`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch tournaments");
    return await response.json();
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return [];
  }
};

/**
 * Get tournaments created by the current arbiter
 */
export const getArbiterTournaments = async () => {
  try {
    const response = await fetch(`${API_URL}/arbiter/tournaments`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch arbiter tournaments");
    return await response.json();
  } catch (error) {
    console.error("Error fetching arbiter tournaments:", error);
    return [];
  }
};

/**
 * Get a single tournament by ID
 */
export const getTournamentById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/tournaments/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Tournament not found");
    return await response.json();
  } catch (error) {
    console.error("Error fetching tournament by ID:", error);
    return null;
  }
};

/**
 * Create a new tournament
 */
export const createTournament = async (tournamentData) => {
  // Mapping frontend fields to backend schema
  const payload = {
    tournament_name: tournamentData.name,
    description: tournamentData.description,
    start_date: tournamentData.startDate,
    end_date: tournamentData.endDate,
    start_time: tournamentData.startTime || "09:00",
    venue_name: tournamentData.venueName,
    city: tournamentData.city,
    state: tournamentData.state,
    country: tournamentData.country || "India",
    google_maps_link: tournamentData.googleMapsLink,
    contact_person: tournamentData.contactPerson,
    contact_email: tournamentData.contactEmail,
    contact_phone: tournamentData.contactPhone,
    organizer_name: tournamentData.organizerName,
    registration_type: tournamentData.registrationType || "Free",
    entry_fee: parseFloat(tournamentData.entryFee || 0),
    pairing_system: tournamentData.pairingSystem || "Swiss",
    event_type: tournamentData.eventType || "Rapid",
    time_control: tournamentData.timeControl || "15",
    increment: parseInt(tournamentData.increment || 10),
    rounds: parseInt(tournamentData.rounds || 5),
    max_players: parseInt(tournamentData.maxPlayers || 64),
    min_rating: parseInt(tournamentData.minRating || 0),
    is_rated:
      tournamentData.isRated === true || tournamentData.isRated === "true",
    fide_id: tournamentData.fideId || null,
    aicf_id: tournamentData.aicfId || null,
    is_private:
      tournamentData.isPrivate === true || tournamentData.isPrivate === "true",
  };

  const response = await fetch(`${API_URL}/tournaments`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to create tournament");
  }

  return await response.json();
};

/**
 * Update tournament
 */
export const updateTournament = async (id, updates) => {
  const pickDefined = (...values) => {
    for (const value of values) {
      if (value !== undefined) return value;
    }
    return undefined;
  };

  // Map frontend field names to backend field names
  const payload = {
    tournament_name: updates.name || updates.tournament_name,
    description: updates.description,
    start_date: updates.startDate || updates.start_date,
    end_date: updates.endDate || updates.end_date,
    start_time: updates.startTime || updates.start_time,
    venue_name: updates.venueName || updates.venue_name,
    city: updates.city,
    state: updates.state,
    country: updates.country,
    google_maps_link: updates.googleMapsLink || updates.google_maps_link,
    contact_person: updates.contactPerson || updates.contact_person,
    contact_email: updates.contactEmail || updates.contact_email,
    contact_phone: updates.contactPhone || updates.contact_phone,
    organizer_name: updates.organizerName || updates.organizer_name,
    registration_type: updates.registrationType || updates.registration_type,
    entry_fee: updates.entryFee || updates.entry_fee,
    pairing_system: updates.pairingSystem || updates.pairing_system,
    event_type: updates.eventType || updates.event_type,
    time_control: updates.timeControl || updates.time_control,
    increment: updates.increment,
    rounds: updates.rounds,
    max_players: updates.maxPlayers || updates.max_players,
    min_rating: updates.minRating || updates.min_rating,
    is_rated: pickDefined(updates.isRated, updates.is_rated),
    fide_id: pickDefined(updates.fideId, updates.fide_id),
    aicf_id: pickDefined(updates.aicfId, updates.aicf_id),
    is_private: pickDefined(updates.isPrivate, updates.is_private),
    status: updates.status,
  };

  // Remove undefined values
  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key],
  );

  const response = await fetch(`${API_URL}/tournaments/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to update tournament");
  }

  return await response.json();
};

/**
 * Delete tournament (Coming soon in backend)
 */
export const deleteTournament = async (id) => {
  const response = await fetch(`${API_URL}/tournaments/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    let errorMsg = "Failed to delete tournament";
    try {
      const errorData = await response.json();
      if (errorData.detail) errorMsg = errorData.detail;
    } catch (e) {
      // Ignored if json parsing fails
    }
    throw new Error(errorMsg);
  }

  return true;
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

  if (!data.startTime) {
    errors.push("Start time is required");
  }

  if (!data.venueName || data.venueName.trim().length < 2) {
    errors.push("Venue name is required");
  }

  if (!data.city || data.city.trim().length < 2) {
    errors.push("City is required");
  }

  if (!data.country || data.country.trim().length < 2) {
    errors.push("Country is required");
  }

  if (!data.contactPerson || data.contactPerson.trim().length < 2) {
    errors.push("Contact person is required");
  }

  if (
    !data.contactEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)
  ) {
    errors.push("Valid contact email is required");
  }

  if (!data.contactPhone || !/^\+?[\d\s\-()]{10,15}$/.test(data.contactPhone)) {
    errors.push("Valid contact phone is required");
  }

  if (!data.organizerName || data.organizerName.trim().length < 2) {
    errors.push("Organizer name is required");
  }

  if (!data.registrationType) {
    errors.push("Registration type is required");
  }

  if (!data.pairingSystem) {
    errors.push("Pairing system is required");
  }

  if (!data.eventType) {
    errors.push("Tournament category is required");
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

  if (
    data.registrationType === "Paid" &&
    (!data.entryFee || parseFloat(data.entryFee) <= 0)
  ) {
    errors.push("Entry fee must be greater than 0 for paid tournaments");
  }

  if (data.isRated) {
    if (!data.fideId && !data.aicfId && !data.kscaId) {
      errors.push("At least one rating ID is required for rated tournaments");
    }
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

// ==================== REGISTRATION FORM MANAGEMENT ====================

/**
 * Get registration form fields for a tournament
 */
export const getRegistrationFormFields = async (tournamentId) => {
  try {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentId}/registration-form-fields`,
      {
        headers: getAuthHeaders(),
      },
    );
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Error fetching registration form fields:", error);
    return [];
  }
};

/**
 * Save registration form fields for a tournament
 */
export const saveRegistrationFormFields = async (tournamentId, fields) => {
  try {
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new Error("Add at least one registration field before saving");
    }

    for (const field of fields) {
      const normalizedFieldName = (
        field.field_name ||
        field.label ||
        ""
      ).trim();
      if (normalizedFieldName.length < 2) {
        throw new Error("Each field name must be at least 2 characters");
      }
    }

    // First, delete all existing fields
    const existingFields = await getRegistrationFormFields(tournamentId);
    for (const field of existingFields) {
      await fetch(
        `${API_URL}/tournaments/${tournamentId}/registration-form-fields/${field.field_id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
    }

    // Then add new fields
    const savedFields = [];
    for (const field of fields) {
      const payload = {
        field_name: field.field_name || field.label,
        field_type: field.field_type || field.type,
        is_required: field.is_required || field.required || false,
        field_order: field.field_order || fields.indexOf(field),
      };

      const response = await fetch(
        `${API_URL}/tournaments/${tournamentId}/registration-form-fields`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to save field: ${field.field_name}`);
      }

      const savedField = await response.json();
      savedFields.push(savedField);
    }

    return savedFields;
  } catch (error) {
    console.error("Error saving registration form fields:", error);
    throw error;
  }
};

// ==================== TOURNAMENT VIEW DETAILS APIs ====================

export const getTournamentViewDetails = async (tournamentId) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/view-details`,
    {
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to load tournament details");
  }

  return await response.json();
};

export const submitTournamentRegistration = async (tournamentId, formData) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/registrations`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ form_data: formData || {} }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to register for tournament");
  }

  return await response.json();
};

export const getTournamentRegistrationsApi = async (tournamentId) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/registrations`,
    {
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to load registrations");
  }

  return await response.json();
};

export const updateTournamentRegistrationStatus = async (
  tournamentId,
  registrationId,
  status,
) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/registrations/${registrationId}/status`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update registration status");
  }

  return await response.json();
};

export const getTournamentPairings = async (tournamentId) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/pairings`,
    {
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to load pairings");
  }

  return await response.json();
};

export const startTournamentPairing = async (tournamentId) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/pairings/start`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to start pairings");
  }

  return await response.json();
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
