import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  ArrowLeft,
  UserPlus,
  Play,
  Flag,
  Printer,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  getTournamentById,
  getStandings,
  registerPlayer,
  startTournament,
  getTournamentRegistrations,
  updateRegistrationStatus,
  manualRegisterPlayer,
  getTournamentPairings,
  startTournamentPairing,
  finalizeTournamentRound,
  updateMatchResult,
  seedTournamentPlayers,
  completeTournament,
  regenerateTournamentPairing,
  getUserProfile,
  importParticipantsFromExcel,
} from "@/lib/tournament-service";
import { useRole } from "@/lib/role-context";
import { JoinTournamentDialog } from "@/components/JoinTournamentDialog";
import { ManualRegistrationDialog } from "@/components/ManualRegistrationDialog";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";

const statusColors = {
  active: "bg-success/15 text-success border-success/30",
  upcoming: "bg-info/15 text-info border-info/30",
  published: "bg-info/15 text-info border-info/30",
  completed: "bg-muted text-muted-foreground border-border",
};

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useRole();
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [participantSubTab, setParticipantSubTab] = useState("players");
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [pairings, setPairings] = useState([]);
  const [pairingsLoading, setPairingsLoading] = useState(false);
  const [generatingPairings, setGeneratingPairings] = useState(false);
  const [standingsSort, setStandingsSort] = useState("points");
  const [selectedRound, setSelectedRound] = useState(1);
  const [tieBreakNames, setTieBreakNames] = useState([]);
  const [roundsInfo, setRoundsInfo] = useState([]);
  // Authoritative current user fetched from API (not sessionStorage)
  const [currentUser, setCurrentUser] = useState(null);

  // Fix 4: wrap in useCallback so useEffect has a stable dep reference
  const loadTournament = useCallback(async () => {
    try {
      const data = await getTournamentById(id);
      if (!data) {
        toast.error("Tournament not found");
        navigate("/tournaments");
        return;
      }

      const mappedData = {
        ...data,
        id: data.tournament_id,
        name: data.tournament_name,
        startDate: data.start_date,
        endDate: data.end_date,
        startTime: data.start_time,
        venue: data.venue_name,
        city: data.city,
        type: data.event_type,
        rated: data.is_rated,
        increment: data.increment,
        registeredPlayers: data.registeredPlayers || [],
        timeControl: data.time_control,
        entryFee: data.entry_fee,
        currentRound: data.current_round,
      };

      setTournament(mappedData);

      if (data.current_round > 0) {
        setSelectedRound((prev) => (prev === 1 ? data.current_round : prev));
      }

      const standingsData = await getStandings(id);
      setStandings(standingsData?.standings || []);
      setTieBreakNames(standingsData?.tie_break_names || []);

      const registrationsData = await getTournamentRegistrations(id);
      setRegistrations(registrationsData || []);

      try {
        const pairingsData = await getTournamentPairings(id);
        setPairings(pairingsData?.pairings || []);
        setRoundsInfo(pairingsData?.rounds_info || []);
      } catch (err) {
        console.error("PAIRINGS FETCH ERROR (loadTournament):", err);
        setPairings([]);
        setRoundsInfo([]);
      }

      setLoading(false);
    } catch (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    // Fetch authoritative current user from API on mount
    getUserProfile().then((u) => {
      if (u) setCurrentUser(u);
    });

    loadTournament();

    // Parse tab from query params
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
    // Fix 4: loadTournament is stable via useCallback, safe to include
  }, [loadTournament, location.search]);

  const handleCompleteTournament = async () => {
    try {
      await completeTournament(id);
      toast.success("Tournament completed! Results emails are being sent.");
      loadTournament();
      setActiveTab("standings");
    } catch (error) {
      toast.error(error.message || "Failed to complete tournament");
    }
  };

  const refreshPairingsState = async () => {
    const [pairingsData, standingsData, tournamentData, registrationsData] =
      await Promise.all([
        getTournamentPairings(id),
        getStandings(id),
        getTournamentById(id),
        getTournamentRegistrations(id),
      ]);

    const newPairings = pairingsData?.pairings || [];
    const newRoundsInfo = pairingsData?.rounds_info || [];

    setPairings(newPairings);
    setRoundsInfo(newRoundsInfo);
    setStandings(standingsData?.standings || []);
    setTieBreakNames(standingsData?.tie_break_names || []);
    setRegistrations(registrationsData || []);

    const mapped = {
      ...tournamentData,
      id: tournamentData.tournament_id,
      name: tournamentData.tournament_name,
      startDate: tournamentData.start_date,
      endDate: tournamentData.end_date,
      startTime: tournamentData.start_time,
      venue: tournamentData.venue_name,
      city: tournamentData.city,
      type: tournamentData.event_type,
      rated: tournamentData.is_rated,
      increment: tournamentData.increment,
      registeredPlayers: tournamentData.registeredPlayers || [],
      timeControl: tournamentData.time_control,
      entryFee: tournamentData.entry_fee,
      currentRound: tournamentData.current_round,
    };
    setTournament(mapped);

    return { newPairings, newRoundsInfo, tournamentData: mapped };
  };

  const handleStartTournament = async () => {
    try {
      await startTournament(id);
      toast.success(
        "Tournament started! Generate Round 1 from the Pairings tab.",
      );
      await refreshPairingsState();
      setActiveTab("pairings");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleStatusUpdate = async (regId, newStatus) => {
    // Optimistically update local state immediately so the UI reacts instantly
    setRegistrations((prev) =>
      prev.map((r) =>
        r.registration_id === regId ? { ...r, status: newStatus } : r,
      ),
    );
    try {
      await updateRegistrationStatus(id, regId, newStatus);
      toast.success(`Player ${newStatus}!`);
      // Reload everything to update registration counts and stats
      loadTournament();
    } catch (error) {
      toast.error(`Failed to update status: ${error.message}`);
      // Rollback on failure by reloading from server
      loadTournament();
    }
  };

  const handleUpdateResult = async (matchId, result) => {
    // Optimistic update for instant UI feedback
    setPairings((prev) =>
      prev.map((m) => (m.match_id === matchId ? { ...m, result } : m)),
    );
    try {
      await updateMatchResult(id, matchId, result);
      toast.success(`Result saved: ${result}`);

      // Re-fetch standings immediately (pairings stay optimistic to avoid UI flicker)
      const standingsData = await getStandings(id);
      if (standingsData?.standings) {
        setStandings(standingsData.standings);
        setTieBreakNames(standingsData.tie_break_names || []);
      }
    } catch (error) {
      toast.error(`Failed to save result: ${error.message}`);
      // On error, roll back by re-fetching immediately
      const pairingsData = await getTournamentPairings(id);
      setPairings(pairingsData?.pairings || []);
    }
  };

  const handleFinalizeRound = async () => {
    try {
      await finalizeTournamentRound(id, selectedRound);
      toast.success(`Round ${selectedRound} finalized!`);

      // Optimistically update the roundsInfo right away so they don't have to refresh
      setRoundsInfo((prev) =>
        prev.map((r) =>
          r.round_number === selectedRound ? { ...r, is_submitted: true } : r,
        ),
      );

      // Real atomic refresh — replaces the old Promise.all + loadTournament() pattern
      const { tournamentData } = await refreshPairingsState();

      if (selectedRound === tournamentData.rounds) {
        toast.success("All rounds complete! Check Final Standings.", {
          duration: 4000,
        });
        setActiveTab("standings");
      }
    } catch (error) {
      toast.error(error.message || "Failed to finalize round");
    }
  };

  const handleGenerateNextRound = async () => {
    setGeneratingPairings(true);
    try {
      await startTournamentPairing(id);

      // Single atomic refresh — no secondary loadTournament() call
      const { newPairings, tournamentData } = await refreshPairingsState();

      // Derive the new round directly from fresh pairings (most reliable source)
      const nextRound =
        newPairings.length > 0
          ? Math.max(...newPairings.map((p) => p.round_number))
          : tournamentData.current_round;

      // Jump the round selector — this is what clears the old results from the table
      setSelectedRound(nextRound);

      toast.success(
        nextRound === 1
          ? "Round 1 pairings generated!"
          : `Round ${nextRound} pairings generated!`,
      );
      setActiveTab("pairings");
    } catch (error) {
      toast.error(error.message || "Failed to generate pairings");
    } finally {
      setGeneratingPairings(false);
    }
  };

  const handleRegeneratePairings = async () => {
    setGeneratingPairings(true);
    try {
      await regenerateTournamentPairing(id);
      toast.success("Pairings regenerated successfully!");

      // Refresh pairings
      const pairingsData = await getTournamentPairings(id);
      setPairings(pairingsData?.pairings || []);

      // Refresh standings in case BYEs changed
      const standingsData = await getStandings(id);
      setStandings(standingsData?.standings || []);
    } catch (error) {
      toast.error(error.message || "Failed to regenerate pairings");
    } finally {
      setGeneratingPairings(false);
    }
  };

  const handleJoinSuccess = () => {
    toast.success("Successfully registered for tournament!");
    setShowJoinDialog(false);
    loadTournament();
  };

  const handleManualRegistration = async (manualData) => {
    try {
      await manualRegisterPlayer(id, manualData);
      toast.success("Onsite player added successfully!");
      loadTournament();
      setIsManualDialogOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to add player");
    }
  };

  const handleSeedPlayers = async () => {
    try {
      setLoading(true);
      await seedTournamentPlayers(id);
      toast.success("Tournament filled with dummy players!");
      await loadTournament();
    } catch (error) {
      toast.error(error.message || "Failed to seed players");
      setLoading(false);
    }
  };

  const handleImportExcel = async (participantsData) => {
    try {
      const result = await importParticipantsFromExcel(id, participantsData);
      toast.success(
        `Successfully imported ${result.successful} participant${result.successful !== 1 ? "s" : ""}!`,
      );
      setIsImportDialogOpen(false);
      await loadTournament();
    } catch (error) {
      toast.error(error.message || "Failed to import participants");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loader"></div>
      </div>
    );
  }

  if (!tournament) return null;

  // Simple: any arbiter sees all action buttons
  const isArbiter = role === "arbiter";

  const permissions = {
    canGeneratePairings: isArbiter,
    canUpdateResults: isArbiter,
    canFinalizeRound: isArbiter,
    canRegeneratePairings: isArbiter,
    canCompleteTournament: isArbiter,
    canStartTournament: isArbiter,
    canManageParticipants: isArbiter,
    canDeleteTournament: isArbiter,
    canViewPairingsTab: true,
    canViewParticipants: isArbiter,
    canViewStandings: true,
  };

  const approvedRegistrations = registrations.filter(
    (r) => r.status === "approved" || r.status === "active",
  );
  const pendingRegistrations = registrations.filter(
    (r) => r.status === "pending",
  );

  // Fix 3: robust result check — only count known valid results as "played"
  const isMatchPlayed = (res) => ["1-0", "0-1", "1/2-1/2"].includes(res);

  const filteredPairings = pairings.filter(
    (p) => p.round_number === selectedRound,
  );

  // incompleteMatches scoped to the SELECTED round (what the arbiter is viewing)
  const incompleteMatches = filteredPairings.filter(
    (p) => !isMatchPlayed(p.result),
  ).length;

  // actualCurrentRound: most authoritative source is roundsInfo max; fall back to tournament field
  const actualCurrentRound =
    roundsInfo.length > 0
      ? Math.max(...roundsInfo.map((r) => r.round_number))
      : tournament.current_round || tournament.currentRound || 0;

  const isFinalRound =
    actualCurrentRound > 0 && actualCurrentRound === tournament.rounds;

  // Two distinct submitted checks:
  // isCurrentRoundSubmitted → guards the GENERATE button (latest round)
  // isSelectedRoundSubmitted → guards the SUBMIT button (what you're viewing)
  const isCurrentRoundSubmitted =
    roundsInfo.find((r) => r.round_number === actualCurrentRound)
      ?.is_submitted ?? false;

  const isSelectedRoundSubmitted =
    roundsInfo.find((r) => r.round_number === selectedRound)?.is_submitted ??
    false;

  const actualRoundPairings = pairings.filter(
    (p) => p.round_number === actualCurrentRound,
  );

  const actualIncompleteMatches = actualRoundPairings.filter(
    (p) => !isMatchPlayed(p.result),
  ).length;

  // Generate button should only be enabled when:
  // - No round has started yet (round 0), OR
  // - Current round is fully submitted with no incomplete matches
  const canGenerateNextRound =
    !generatingPairings &&
    (actualCurrentRound === 0 ||
      (isCurrentRoundSubmitted && actualIncompleteMatches === 0));

  const sortedStandings = standings;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(tournament.startDate);
  startDate.setHours(0, 0, 0, 0);

  const canStartTournament = today >= startDate;

  const canRegister =
    (tournament.status === "upcoming" || tournament.status === "published") &&
    approvedRegistrations.length < parseInt(tournament.max_players || 64);

  const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
  const currentUserId = currentUser?.user_id || userData.user_id;
  const isRegistered = registrations.some(
    (r) => r.user_email === userData.email,
  );

  const availableRounds = Array.from(
    new Set(pairings.map((pairing) => pairing.round_number).filter(Boolean)),
  ).sort((left, right) => left - right);

  const latestRoundWithPairings =
    availableRounds[availableRounds.length - 1] || actualCurrentRound || 1;

  const latestRoundPairings = pairings.filter(
    (pairing) => pairing.round_number === latestRoundWithPairings,
  );

  const getMyPairingOutcome = (match) => {
    if (!currentUserId || !match.result) return null;

    const isWhite = match.white_player_id === currentUserId;
    const isBlack = match.black_player_id === currentUserId;

    if (!isWhite && !isBlack) return null;
    if (match.result === "Bye") return "Bye";
    if (match.result === "1/2-1/2") return "Draw";
    if (match.result === "1-0") return isWhite ? "Win" : "Loss";
    if (match.result === "0-1") return isBlack ? "Win" : "Loss";

    return null;
  };

  const outcomeStyles = {
    Win: "bg-success/15 text-success border-success/30",
    Loss: "bg-destructive/15 text-destructive border-destructive/30",
    Draw: "bg-info/15 text-info border-info/30",
    Bye: "bg-muted text-muted-foreground border-border",
  };

  const renderPairingsSummary = (
    matches,
    title,
    emptyMessage = "No pairing results available yet.",
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
          <span>{title}</span>
          <div className="flex items-center gap-2">
            {availableRounds.length > 0 ? (
              <Select
                value={selectedRound.toString()}
                onValueChange={(value) => setSelectedRound(parseInt(value, 10))}
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="Select Round" />
                </SelectTrigger>
                <SelectContent>
                  {availableRounds.map((roundNumber) => (
                    <SelectItem
                      key={roundNumber}
                      value={roundNumber.toString()}
                    >
                      Round {roundNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {permissions.canViewPairingsTab && matches.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("pairings")}
              >
                Open Full Pairings
              </Button>
            ) : null}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Board</TableHead>
                <TableHead>White</TableHead>
                <TableHead className="w-24 text-center">Result</TableHead>
                <TableHead>Black</TableHead>
                <TableHead className="w-24 text-right">Your Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => {
                const myOutcome = getMyPairingOutcome(match);
                return (
                  <TableRow
                    key={`summary-${match.match_id}`}
                    className={
                      currentUserId &&
                      (match.white_player_id === currentUserId ||
                        match.black_player_id === currentUserId)
                        ? "bg-primary/5"
                        : undefined
                    }
                  >
                    <TableCell className="text-center font-medium">
                      {match.board_number || "-"}
                    </TableCell>
                    <TableCell
                      className={
                        match.white_player_id === currentUserId
                          ? "font-semibold text-primary"
                          : "font-medium"
                      }
                    >
                      {match.white_player_name || "TBD"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={match.result ? "default" : "outline"}>
                        {match.result || "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={
                        match.black_player_id === currentUserId
                          ? "font-semibold text-primary"
                          : "font-medium"
                      }
                    >
                      {match.black_player_name || "BYE"}
                    </TableCell>
                    <TableCell className="text-right">
                      {myOutcome ? (
                        <Badge
                          variant="outline"
                          className={outcomeStyles[myOutcome]}
                        >
                          {myOutcome}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl font-display font-bold">{tournament.name}</h1>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge
              variant="outline"
              className={statusColors[tournament.status]}
            >
              {tournament.status}
            </Badge>
            <Badge variant="secondary">{tournament.type}</Badge>
            <Badge variant={tournament.rated ? "default" : "secondary"}>
              {tournament.rated ? "Rated" : "Unrated"}
            </Badge>
            {/* Role Badge */}
            {isArbiter && (
              <Badge className="bg-chess-gold/20 text-chess-gold border border-chess-gold/40 font-semibold">
                👑 Arbiter
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {canRegister && !isArbiter && !isRegistered && (
            <Button onClick={() => setShowJoinDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Register Now
            </Button>
          )}

          {isRegistered && !isArbiter && (
            <Badge variant="secondary" className="h-10 px-4">
              Already Registered
            </Badge>
          )}

          {permissions.canStartTournament &&
            (tournament.status === "upcoming" ||
              tournament.status === "published") && (
              <Button
                onClick={handleStartTournament}
                variant="default"
                disabled={!canStartTournament}
                title={
                  !canStartTournament
                    ? `Tournament can only be started from ${tournament.startDate}`
                    : ""
                }
              >
                <Play className="h-4 w-4 mr-2" />
                Start Tournament
              </Button>
            )}

          {/* Manage Pairings button removed as requested */}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {approvedRegistrations.length}/{tournament.max_players || 64}
              </div>
              <div className="text-xs text-muted-foreground">Players</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Clock className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {tournament.timeControl}+{tournament.increment}
              </div>
              <div className="text-xs text-muted-foreground">Time Control</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Flag className="h-5 w-5 text-info" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {actualCurrentRound}/{tournament.rounds}
              </div>
              <div className="text-xs text-muted-foreground">Rounds</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chess-gold/10">
              <Trophy className="h-5 w-5 text-chess-gold" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                ₹{tournament.entryFee || 0}
              </div>
              <div className="text-xs text-muted-foreground">Entry Fee</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="standings">Live Standings</TabsTrigger>
          {permissions.canViewPairingsTab && (
            <TabsTrigger value="pairings">Pairings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tournament Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Start Date
                  </div>
                  <div className="font-medium">
                    {tournament.startDate} {tournament.startTime}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">End Date</div>
                  <div className="font-medium">
                    {tournament.endDate || "TBD"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Venue</div>
                  <div className="font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {tournament.venue || "Online"} • {tournament.city || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Entry Fee</div>
                  <div className="font-medium flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {Number(tournament.entryFee || 0) === 0
                      ? "Free"
                      : `₹${tournament.entryFee}`}
                  </div>
                </div>
                {tournament.minRating && (
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Minimum Rating
                    </div>
                    <div className="font-medium">{tournament.minRating}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-muted-foreground">Mode</div>
                  <div className="font-medium">
                    {tournament.mode || "Offline"}
                  </div>
                </div>
              </div>

              {tournament.prizeCategories &&
                tournament.prizeCategories.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="text-sm font-semibold mb-2">
                      Prize Distribution
                    </div>
                    <div className="space-y-2">
                      {tournament.prizeCategories.map((prize, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-2 bg-muted/50 rounded"
                        >
                          <span className="text-sm">{prize.category}</span>
                          <span className="font-semibold text-chess-gold">
                            {prize.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {renderPairingsSummary(
            pairings.filter(
              (pairing) => pairing.round_number === selectedRound,
            ),
            `Round ${selectedRound || latestRoundWithPairings} Pairings & Results`,
            "Pairings will appear here once the arbiter generates the round.",
          )}
        </TabsContent>

        <TabsContent value="participants" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Registered Participants</span>
                  <div className="flex gap-2">
                    {permissions.canManageParticipants && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSeedPlayers}
                        className="border-chess-gold text-chess-gold hover:bg-chess-gold/10"
                      >
                        Seed Dummy Players
                      </Button>
                    )}
                    {permissions.canManageParticipants && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setIsManualDialogOpen(true)}
                      >
                        Add Onsite Player
                      </Button>
                    )}
                    {permissions.canManageParticipants && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsImportDialogOpen(true)}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import from Excel
                      </Button>
                    )}
                    {isArbiter && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadTournament}
                      >
                        Refresh
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!permissions.canManageParticipants ? (
                  // Public View (Players + Sub-Arbiters) — read-only approved list
                  <>
                    {approvedRegistrations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No participants registered yet
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">#</TableHead>
                            <TableHead>Player Name</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Registered Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {approvedRegistrations.map((reg, index) => (
                            <TableRow key={reg.registration_id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">
                                {reg.user_name}
                              </TableCell>
                              <TableCell>
                                {reg.player_rating || "Unrated"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(
                                  reg.registration_date,
                                ).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </>
                ) : (
                  // Arbiter View - Split into Players and Pending
                  <Tabs
                    value={participantSubTab}
                    onValueChange={setParticipantSubTab}
                  >
                    <div className="mb-6 flex space-x-4 border-b pb-2">
                      <button
                        onClick={() => setParticipantSubTab("players")}
                        className={`text-sm font-medium pb-2 -mb-[9px] ${
                          participantSubTab === "players"
                            ? "border-b-2 border-primary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted-foreground"
                        }`}
                      >
                        Players List ({approvedRegistrations.length})
                      </button>
                      <button
                        onClick={() => setParticipantSubTab("pending")}
                        className={`text-sm font-medium pb-2 -mb-[9px] flex items-center gap-2 ${
                          participantSubTab === "pending"
                            ? "border-b-2 border-primary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted-foreground"
                        }`}
                      >
                        Pending Requests
                        {pendingRegistrations.length > 0 && (
                          <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                            {pendingRegistrations.length}
                          </span>
                        )}
                      </button>
                    </div>

                    <TabsContent value="players" className="mt-0 outline-none">
                      {approvedRegistrations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No approved players yet.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">#</TableHead>
                              <TableHead>Player Name</TableHead>
                              <TableHead>Rating</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Registered Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {approvedRegistrations.map((reg, index) => (
                              <TableRow key={reg.registration_id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">
                                  {reg.user_name}
                                </TableCell>
                                <TableCell>
                                  {reg.player_rating || "Unrated"}
                                </TableCell>
                                <TableCell>{reg.user_email}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(
                                    reg.registration_date,
                                  ).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    <TabsContent value="pending" className="mt-0 outline-none">
                      {pendingRegistrations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No pending requests.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">#</TableHead>
                              <TableHead>Player Name</TableHead>
                              <TableHead>Rating</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Registered Date</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingRegistrations.map((reg, index) => (
                              <TableRow key={reg.registration_id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">
                                  {reg.user_name}
                                </TableCell>
                                <TableCell>
                                  {reg.player_rating || "Unrated"}
                                </TableCell>
                                <TableCell>{reg.user_email}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(
                                    reg.registration_date,
                                  ).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      className="h-8 text-xs text-green-600 hover:text-green-700 border-green-200"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          reg.registration_id,
                                          "approved",
                                        )
                                      }
                                      disabled={tournament.status !== "active"}
                                      title={
                                        tournament.status !== "active"
                                          ? "Players can only be accepted after the tournament has started"
                                          : ""
                                      }
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      className="h-8 text-xs text-red-600 hover:text-red-700 border-red-200"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          reg.registration_id,
                                          "rejected",
                                        )
                                      }
                                      disabled={tournament.status !== "active"}
                                      title={
                                        tournament.status !== "active"
                                          ? "Players can only be rejected after the tournament has started"
                                          : ""
                                      }
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>

            {renderPairingsSummary(
              latestRoundPairings,
              `Latest Pairing Results${latestRoundWithPairings ? ` • Round ${latestRoundWithPairings}` : ""}`,
              "No pairing results available yet for participants to view.",
            )}
          </div>
        </TabsContent>

        {/* Pairings Tab */}
        <TabsContent value="pairings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold">Pairings & Results</span>
                  {availableRounds.length > 0 && (
                    <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-lg">
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                        Round:
                      </span>
                      <Select
                        value={selectedRound.toString()}
                        onValueChange={(val) => setSelectedRound(parseInt(val))}
                      >
                        <SelectTrigger className="h-9 w-36 font-semibold border-primary/40 focus:ring-primary">
                          <SelectValue placeholder="Select Round" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRounds.map((roundNumber) => (
                            <SelectItem
                              key={roundNumber}
                              value={roundNumber.toString()}
                            >
                              Round {roundNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {permissions.canViewPairingsTab &&
                  filteredPairings.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 border-primary/20 hover:bg-primary/10 text-primary transition-all shadow-sm max-sm:w-full"
                      onClick={() => {
                        // Small delay to ensure any UI rendering before print
                        setTimeout(() => window.print(), 100);
                      }}
                      title="Print pairings for physical display"
                    >
                      <Printer className="h-4 w-4" />
                      Print Pairings
                    </Button>
                  )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pairings.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center">
                  <Flag className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No pairings generated yet.</p>
                  {permissions.canGeneratePairings &&
                    tournament.status === "active" && (
                      <p className="text-xs mt-2">
                        Use the Generate button below to start Round 1.
                      </p>
                    )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-16 text-center">
                        Board #
                      </TableHead>
                      <TableHead>White</TableHead>
                      <TableHead className="text-center w-24">Score</TableHead>
                      <TableHead>Black</TableHead>
                      {permissions.canUpdateResults && pairings.length > 0 && (
                        <TableHead className="text-right w-48">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPairings.map((match) => (
                      <TableRow key={match.match_id} className="h-12">
                        <TableCell className="text-center font-bold text-muted-foreground border-r">
                          {match.board_number}
                        </TableCell>
                        <TableCell className="font-medium">
                          {match.white_player_name || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={match.result ? "default" : "outline"}
                            className={`font-mono px-3 py-1 ${match.result ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground border-dashed"}`}
                          >
                            {match.result || "vs"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {match.black_player_name || (
                            <span className="text-muted-foreground italic">
                              BYE
                            </span>
                          )}
                        </TableCell>
                        {permissions.canUpdateResults &&
                          pairings.length > 0 && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {["1-0", "1/2-1/2", "0-1"].map((r) => (
                                  <Button
                                    key={r}
                                    size="sm"
                                    variant={
                                      match.result === r ? "default" : "outline"
                                    }
                                    className={`h-8 px-3 text-xs font-mono transition-all ${match.result === r ? "shadow-md bg-primary text-primary-foreground" : "hover:border-primary/50"}`}
                                    onClick={() =>
                                      handleUpdateResult(match.match_id, r)
                                    }
                                  >
                                    {r === "1/2-1/2" ? "½-½" : r}
                                  </Button>
                                ))}
                              </div>
                            </TableCell>
                          )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Arbiter Controls at Bottom */}
              {permissions.canFinalizeRound &&
                tournament.status === "active" && (
                  <div className="mt-8 pt-6 border-t-2 border-dashed border-border flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-end gap-4">
                      {/* GENERATE — only shown while rounds remain */}
                      {actualCurrentRound < (tournament.rounds || 100) && (
                        <div className="flex flex-col items-end gap-1">
                          {/* Warn arbiter why Generate is blocked */}
                          {actualCurrentRound > 0 &&
                            !isCurrentRoundSubmitted && (
                              <span className="text-xs text-warning font-medium">
                                ⚠️ Finalize Round {actualCurrentRound} before
                                generating next
                              </span>
                            )}
                          {actualCurrentRound > 0 &&
                            isCurrentRoundSubmitted &&
                            actualIncompleteMatches > 0 && (
                              <span className="text-xs text-warning font-medium">
                                ⚠️ {actualIncompleteMatches} result(s) missing
                                in Round {actualCurrentRound}
                              </span>
                            )}
                          <Button
                            onClick={handleGenerateNextRound}
                            disabled={!canGenerateNextRound}
                            variant="outline"
                            className="border-chess-gold text-foreground hover:bg-chess-gold/10 font-bold px-6 shadow-sm"
                          >
                            {generatingPairings ? (
                              <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full mr-2" />
                            ) : (
                              <Play className="h-4 w-4 mr-2 text-chess-gold" />
                            )}
                            {actualCurrentRound === 0
                              ? "Generate Round 1"
                              : `Generate Round ${actualCurrentRound + 1}`}
                          </Button>
                        </div>
                      )}

                      {/* SUBMIT — always visible once there are pairings to view */}
                      {actualCurrentRound > 0 && (
                        <div className="flex flex-col items-end gap-1">
                          {incompleteMatches > 0 &&
                            !isSelectedRoundSubmitted && (
                              <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded">
                                {incompleteMatches} result
                                {incompleteMatches !== 1 ? "s" : ""} still
                                pending in Round {selectedRound}
                              </span>
                            )}
                          {incompleteMatches === 0 &&
                            !isSelectedRoundSubmitted && (
                              <span className="text-xs text-success font-medium animate-pulse">
                                All results entered — ready to finalize ➔
                              </span>
                            )}
                          <Button
                            variant={
                              isSelectedRoundSubmitted ? "outline" : "success"
                            }
                            onClick={handleFinalizeRound}
                            disabled={
                              isSelectedRoundSubmitted ||
                              incompleteMatches > 0 ||
                              generatingPairings ||
                              selectedRound === 0
                            }
                            className={`min-w-[200px] shadow-sm transition-all ${
                              !isSelectedRoundSubmitted &&
                              incompleteMatches === 0
                                ? "ring-2 ring-success ring-offset-2 scale-105"
                                : ""
                            }`}
                          >
                            <Flag className="h-4 w-4 mr-2" />
                            {isSelectedRoundSubmitted
                              ? `Round ${selectedRound} Finalized ✓`
                              : "Submit Final Results"}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* COMPLETE TOURNAMENT — appears only when final round is submitted */}
                    {isFinalRound &&
                      isCurrentRoundSubmitted &&
                      permissions.canCompleteTournament && (
                        <div className="flex justify-end">
                          <Button
                            onClick={handleCompleteTournament}
                            disabled={generatingPairings}
                            className="bg-success text-success-foreground hover:bg-success/90 shadow-xl px-8 py-6 text-lg font-bold animate-in zoom-in-95"
                          >
                            <Trophy className="h-6 w-6 mr-2" />
                            Complete Tournament & Finalize Standings
                          </Button>
                        </div>
                      )}

                    {/* REGENERATE — only when no results entered yet for current round */}
                    {permissions.canRegeneratePairings &&
                      !isCurrentRoundSubmitted &&
                      filteredPairings.length > 0 &&
                      incompleteMatches === filteredPairings.length && (
                        <div className="flex justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRegeneratePairings}
                            disabled={generatingPairings}
                            className="border-warning text-warning hover:bg-warning/10"
                          >
                            Regenerate Pairings
                          </Button>
                        </div>
                      )}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standings" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Ranking after Round {actualCurrentRound || 0}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadTournament}
                    className="border-chess-gold text-chess-gold hover:bg-chess-gold/10"
                  >
                    Refresh Standings
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-[#ccc] overflow-hidden rounded-sm">
                  <Table className="text-xs border-collapse">
                    <TableHeader className="bg-[#f0f0f0] border-b border-[#ccc] text-[#333]">
                      <TableRow className="hover:bg-transparent h-8 text-[11px] uppercase tracking-wider font-semibold">
                        <TableHead className="w-10 text-center border-r border-[#ccc]">
                          Rk.
                        </TableHead>
                        <TableHead className="w-12 text-center border-r border-[#ccc]">
                          SNo.
                        </TableHead>
                        <TableHead className="border-r border-[#ccc] text-left pl-4">
                          Name
                        </TableHead>
                        <TableHead className="text-center w-12 border-r border-[#ccc]">
                          FED
                        </TableHead>
                        <TableHead className="text-center w-14 border-r border-[#ccc]">
                          Rtg
                        </TableHead>
                        <TableHead className="text-center w-12 border-r border-[#ccc] font-bold">
                          Pts.
                        </TableHead>
                        {tieBreakNames.map((name, i) => (
                          <TableHead
                            key={i}
                            className={`text-center w-16 border-r border-[#ccc] ${i === tieBreakNames.length - 1 ? "border-r-0" : ""}`}
                            title={name}
                          >
                            TB{i + 1}
                          </TableHead>
                        ))}
                        {tieBreakNames.length === 0 && (
                          <>
                            <TableHead
                              className="text-center w-12 border-r border-[#ccc]"
                              title="Buchholz Cut-1"
                            >
                              TB1
                            </TableHead>
                            <TableHead
                              className="text-center w-12 border-r border-[#ccc]"
                              title="Buchholz"
                            >
                              TB2
                            </TableHead>
                            <TableHead
                              className="text-center w-12"
                              title="Sonneborn-Berger"
                            >
                              TB3
                            </TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedStandings.map((player, index) => (
                        <TableRow
                          key={player.user_id || index}
                          className={`h-8 border-b border-[#eee] transition-colors ${index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"} hover:bg-[#eef2ff]`}
                        >
                          <TableCell className="text-center border-r border-[#ccc] font-bold text-gray-700">
                            {index + 1}
                          </TableCell>
                          <TableCell className="text-center border-r border-[#ccc] text-[#666]">
                            {player.starting_no || "-"}
                          </TableCell>
                          <TableCell className="font-medium border-r border-[#ccc] text-blue-700 hover:underline cursor-pointer pl-4">
                            {player.player_name || player.name}
                          </TableCell>
                          <TableCell className="text-center text-[#666] border-r border-[#ccc]">
                            {player.federation || "IND"}
                          </TableCell>
                          <TableCell className="text-center border-r border-[#ccc]">
                            {player.rating || "0"}
                          </TableCell>
                          <TableCell className="text-center font-bold border-r border-[#ccc] text-black">
                            {parseFloat(player.points || 0).toFixed(1)}
                          </TableCell>
                          {tieBreakNames.map((name, i) => (
                            <TableCell
                              key={i}
                              className={`text-center text-[#666] border-r border-[#ccc] ${i === tieBreakNames.length - 1 ? "border-r-0" : ""}`}
                            >
                              {(player[`tb${i + 1}`] || 0.0).toFixed(
                                name === "Sonneborn-Berger" ? 2 : 1,
                              )}
                            </TableCell>
                          ))}
                          {tieBreakNames.length === 0 && (
                            <>
                              <TableCell className="text-center text-[#666] border-r border-[#ccc]">
                                {(player.buchholz || 0.0).toFixed(1)}
                              </TableCell>
                              <TableCell className="text-center text-[#666] border-r border-[#ccc]">
                                {(player.buchholz_total || 0.0).toFixed(1)}
                              </TableCell>
                              <TableCell className="text-center text-[#666]">
                                {(player.sonneborn_berger || 0.0).toFixed(2)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                      {sortedStandings.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No standings available yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-[10px] text-muted-foreground italic flex justify-between items-center">
                  <span>
                    Annotation:{" "}
                    {tieBreakNames
                      .map((name, i) => `Tie Break${i + 1}: ${name}`)
                      .join(", ")}
                  </span>
                </div>
              </CardContent>
            </Card>

            {renderPairingsSummary(
              pairings.filter(
                (pairing) => pairing.round_number === selectedRound,
              ),
              `Pairing Results for Round ${selectedRound || latestRoundWithPairings}`,
              "Standings will update here once results are submitted.",
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Join Dialog */}
      <JoinTournamentDialog
        tournament={tournament}
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        onSuccess={handleJoinSuccess}
      />

      {/* Manual Registration Dialog */}
      <ManualRegistrationDialog
        isOpen={isManualDialogOpen}
        onClose={() => setIsManualDialogOpen(false)}
        onSubmit={handleManualRegistration}
      />

      {/* Excel Import Dialog */}
      <ExcelImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSubmit={handleImportExcel}
      />
    </div>
  );
}
