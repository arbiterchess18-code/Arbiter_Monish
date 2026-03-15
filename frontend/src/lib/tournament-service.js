/**
 * Tournament Management Service
 * Handles tournament operations, Swiss pairing, tie-breakers, and player management
 */

import { apiFetch as fetch } from "./api.js";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
  }
  return response;
};

/**
 * Get the current user's profile
 */
export const getUserProfile = async () => {
  try {
    const response = await fetch(`${API_URL}/users/me`, {
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
    if (!response.ok) throw new Error("Failed to fetch user profile");
    return await response.json();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

/**
 * Update the current user's profile
 */
export const updateUserProfile = async (profileData) => {
  try {
    const response = await fetch(`${API_URL}/users/me`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    await handleResponse(response);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Failed to update profile");
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * Get all users with ARBITER role to assign as sub-arbiters
 */
export const getArbiters = async () => {
  try {
    const response = await fetch(`${API_URL}/users/arbiters`, {
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
    if (!response.ok) throw new Error("Failed to fetch arbiters");
    return await response.json();
  } catch (error) {
    console.error("Error fetching arbiters:", error);
    return [];
  }
};

/**
 * Get all tournaments from Backend
 */
export const getTournaments = async () => {
  try {
    const response = await fetch(`${API_URL}/tournaments`, {
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
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
export const getArbiterTournaments = async (role = null) => {
  try {
    const url = role
      ? `${API_URL}/tournaments/arbiter?role=${role}`
      : `${API_URL}/tournaments/arbiter`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
    if (!response.ok) throw new Error("Failed to fetch arbiter tournaments");
    return await response.json();
  } catch (error) {
    console.error("Error fetching arbiter tournaments:", error);
    return [];
  }
};

/**
 * Get all public (published) tournaments
 */
export const getPublicTournaments = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.type && filters.type !== "all")
      params.append("type", filters.type);
    if (filters.status && filters.status !== "all")
      params.append("status", filters.status);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`${API_URL}/tournaments/public${queryString}`);
    await handleResponse(response);
    return await response.json();
  } catch (error) {
    console.error("Error fetching public tournaments:", error);
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
    await handleResponse(response);
    if (!response.ok) throw new Error("Tournament not found");
    return await response.json();
  } catch (error) {
    console.error("Error fetching tournament by ID:", error);
    return null;
  }
};

/**
 * Get tournament registrations
 */
export const getTournamentRegistrations = async (id) => {
  try {
    const response = await fetch(`${API_URL}/tournaments/${id}/registrations`, {
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
    if (!response.ok) throw new Error("Failed to fetch registrations");
    return await response.json();
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return [];
  }
};

/**
 * Update registration status (Approve/Reject)
 */
export const updateRegistrationStatus = async (
  tournamentId,
  registrationId,
  status,
) => {
  try {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentId}/registrations/${registrationId}/status`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      },
    );
    await handleResponse(response);
    if (!response.ok) throw new Error("Failed to update registration status");
    return await response.json();
  } catch (error) {
    console.error("Error updating registration status:", error);
    throw error;
  }
};
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

  await handleResponse(response);

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
 * Register a player for a tournament (Real API)
 */
export const registerPlayer = async (tournamentId, formData) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/registrations`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ form_data: formData }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to register for tournament");
  }

  return await response.json();
};

/**
 * Register a player manually onsite (Arbiter only)
 */
export const manualRegisterPlayer = async (tournamentId, manualData) => {
  const payload = {
    is_manual: true,
    player_name: manualData.fullName,
    player_email: manualData.email,
    player_phone: manualData.phone || undefined,
    player_rating: parseInt(manualData.rating) || undefined,
    player_fide_id: manualData.fideId || undefined,
  };

  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/registrations`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to manually register player");
  }

  return await response.json();
};

/**
 * Unregister a player from a tournament (Coming soon in backend)
 */
export const unregisterPlayer = async (tournamentId, playerId) => {
  // Mocking for now, as there's no backend endpoint for this yet
  console.warn("unregisterPlayer is not yet implemented on the backend");
  return true;
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
// Removed old local mock

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
 * Get tournament standings with tie-breakers (Real API)
 */
export const getStandings = async (tournamentId) => {
  try {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentId}/standings`,
    );
    await handleResponse(response);
    if (!response.ok) throw new Error("Failed to fetch standings");
    const data = await response.json();
    return data; // Return full object { standings: [...], tie_breaker_rules: [...] }
  } catch (error) {
    console.error("Error fetching standings:", error);
    return { standings: [] };
  }
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
    const normalizeFieldType = (rawType) => {
      const normalized = String(rawType || "")
        .trim()
        .toLowerCase();

      if (
        normalized.includes("display image") ||
        normalized.includes("qr") ||
        normalized.includes("payment qr")
      ) {
        return "Display Image";
      }

      const map = {
        text: "Text",
        email: "Email",
        number: "Number",
        date: "Date",
        dropdown: "Dropdown",
        textarea: "Text Area",
        "text area": "Text Area",
      };

      return map[normalized] || rawType || "Text";
    };

    const response = await fetch(
      `${API_URL}/tournaments/${tournamentId}/registration-form-fields`,
      {
        headers: getAuthHeaders(),
      },
    );
    if (!response.ok) return [];
    const fields = await response.json();
    return Array.isArray(fields)
      ? fields.map((field, index) => ({
          ...field,
          field_type: normalizeFieldType(field.field_type || field.type),
          field_order:
            typeof field.field_order === "number" ? field.field_order : index,
          field_image: field.field_image || "",
        }))
      : [];
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
    const normalizeFieldType = (rawType) => {
      const normalized = String(rawType || "")
        .trim()
        .toLowerCase();

      if (
        normalized.includes("display image") ||
        normalized.includes("qr") ||
        normalized.includes("payment qr")
      ) {
        return "Display Image";
      }

      const map = {
        text: "Text",
        email: "Email",
        number: "Number",
        date: "Date",
        dropdown: "Dropdown",
        textarea: "Text Area",
        "text area": "Text Area",
      };

      return map[normalized] || rawType || "Text";
    };

    if (!Array.isArray(fields) || fields.length === 0) {
      throw new Error("Add at least one registration field before saving");
    }

    for (const field of fields) {
      const normalizedFieldName = (
        field.field_name ||
        field.label ||
        ""
      ).trim();
      const canonicalType = normalizeFieldType(field.field_type || field.type);
      if (canonicalType !== "Display Image" && normalizedFieldName.length < 2) {
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
        field_type: normalizeFieldType(field.field_type || field.type),
        field_image: field.field_image || "",
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

/**
 * Finalize a round (marks as submitted)
 */
export const finalizeRound = async (tournamentId, roundNumber) => {
  try {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentId}/round/${roundNumber}/finalize`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      },
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to finalize round");
    }
    return await response.json();
  } catch (error) {
    console.error("Error finalizing round:", error);
    throw error;
  }
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

export const seedTournamentPlayers = async (tournamentId) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/seed-players`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to seed players");
  }

  return await response.json();
};

export const submitRoundResults = async (tournamentId, results) => {
  const promises = results.map((item) =>
    fetch(
      `${API_URL}/tournaments/${tournamentId}/matches/${item.match_id}/result`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ result: item.result }),
      },
    ).then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Failed to update board ${item.match_id}`,
        );
      }
      return res.json();
    }),
  );

  return Promise.all(promises);
};

export const updateMatchResult = async (tournamentId, matchId, result) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/matches/${matchId}/result`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ result }),
    },
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update match result");
  }
  return await response.json();
};

export const regenerateTournamentPairing = async (tournamentId) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/pairings/regenerate`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to regenerate pairings");
  }
  return await response.json();
};

export const finalizeTournamentRound = async (tournamentId, roundNumber) => {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/rounds/${roundNumber}/finalize`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to finalize round");
  }
  return await response.json();
};

// ==================== TOURNAMENT LIFECYCLE ====================

/**
 * Start a tournament
 */
export const startTournament = async (tournamentId) => {
  const response = await fetch(`${API_URL}/tournaments/${tournamentId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status: "active" }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to start tournament");
  }

  return await response.json();
};

/**
 * Complete a tournament
 */
export const completeTournament = async (tournamentId) => {
  const response = await fetch(`${API_URL}/tournaments/${tournamentId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status: "completed" }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to complete tournament");
  }

  return await response.json();
};
