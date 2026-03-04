import { useState, useEffect } from "react";
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
  updateMatchResult,
  seedTournamentPlayers,
} from "@/lib/tournament-service";
import { useRole } from "@/lib/role-context";
import { JoinTournamentDialog } from "@/components/JoinTournamentDialog";
import { ManualRegistrationDialog } from "@/components/ManualRegistrationDialog";

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
  const [pairings, setPairings] = useState([]);
  const [pairingsLoading, setPairingsLoading] = useState(false);
  const [generatingPairings, setGeneratingPairings] = useState(false);
  const [standingsSort, setStandingsSort] = useState("points");
  const [selectedRound, setSelectedRound] = useState(1);

  useEffect(() => {
    loadTournament();

    // Parse tab from query params
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [id, location.search]);

  const loadTournament = async () => {
    try {
      const data = await getTournamentById(id);
      if (!data) {
        toast.error("Tournament not found");
        navigate("/tournaments");
        return;
      }

      // Map backend fields to frontend expected names
      const mappedData = {
        ...data,
        id: data.tournament_id,
        name: data.tournament_name,
        // Ensure registeredPlayers is always an array
        registeredPlayers: data.registeredPlayers || [],
        timeControl: data.time_control,
        entryFee: data.entry_fee,
        currentRound: data.current_round
      };

      setTournament(mappedData);

      // Initialize selectedRound to current round if not set
      if (data.current_round > 0) {
        setSelectedRound(prev => (prev === 1 ? data.current_round : prev));
      }

      const standingsData = await getStandings(id);
      setStandings(standingsData?.standings || []);

      // Always fetch registrations to be sure
      const registrationsData = await getTournamentRegistrations(id);
      setRegistrations(registrationsData || []);

      // Fetch pairings if arbiter
      try {
        const pairingsData = await getTournamentPairings(id);
        setPairings(pairingsData?.pairings || []);
      } catch (_) {
        setPairings([]);
      }

      setLoading(false);
    } catch (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleStartTournament = async () => {
    try {
      await startTournament(id);
      toast.success("Tournament started successfully!");
      loadTournament();
      navigate(`/arbiter/tournament/${id}/pairings`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleStatusUpdate = async (regId, newStatus) => {
    // Optimistically update local state immediately so the UI reacts instantly
    setRegistrations((prev) =>
      prev.map((r) =>
        r.registration_id === regId ? { ...r, status: newStatus } : r
      )
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
    // Optimistically update local pairings
    setPairings((prev) =>
      prev.map((m) => (m.match_id === matchId ? { ...m, result } : m))
    );
    try {
      await updateMatchResult(id, matchId, result);
      toast.success(`Result saved: ${result}`);

      // Check if this was the last result of the final round
      const updatedPairings = pairings.map((m) => (m.match_id === matchId ? { ...m, result } : m));
      const allResultsEntered = updatedPairings.every(p => p.result !== null && p.result !== "");
      const isFinalRound = tournament?.current_round === tournament?.rounds;

      if (isFinalRound && allResultsEntered) {
        toast.success("Tournament Finished! Redirecting to Final Standings...", { duration: 4000 });
        setActiveTab("standings");
      }

      // Refresh standings after scoring
      const standingsData = await getStandings(id);
      setStandings(standingsData?.standings || []);

      // Refresh pairings to ensure we have the latest results for dependency checks
      const pairingsData = await getTournamentPairings(id);
      setPairings(pairingsData?.pairings || []);
    } catch (error) {
      toast.error(`Failed to save result: ${error.message}`);
      loadTournament();
    }
  };

  const handleGenerateNextRound = async () => {
    setGeneratingPairings(true);
    try {
      await startTournamentPairing(id);
      toast.success("Next round pairings generated!");

      // 1. Reload tournament data to update currentRound
      await loadTournament();

      // 2. Explicitly refresh standings to reflect scores from the round just completed
      const standingsData = await getStandings(id);
      setStandings(standingsData?.standings || []);

      // 3. Update the UI to show the newly created round
      const freshData = await getTournamentById(id);
      if (freshData && freshData.current_round) {
        setSelectedRound(freshData.current_round);
      }
    } catch (error) {
      toast.error(error.message || "Failed to generate pairings");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loader"></div>
      </div>
    );
  }

  if (!tournament) return null;

  const isArbiter = role === "arbiter";
  const approvedRegistrations = registrations.filter(
    (r) => r.status === "approved" || r.status === "active",
  );
  const pendingRegistrations = registrations.filter(
    (r) => r.status === "pending"
  );

  const filteredPairings = pairings.filter(p => p.round_number === selectedRound);
  const incompleteMatches = filteredPairings.filter(p => !p.result).length;

  const sortedStandings = [...standings].sort((a, b) => {
    // Primary sort by points
    if (b.points !== a.points) return (b.points || 0) - (a.points || 0);
    // Secondary sort by TB1 (Buchholz Cut 1)
    if (b.buchholz !== a.buchholz) return (b.buchholz || 0) - (a.buchholz || 0);
    // Tertiary sort by TB2 (Buchholz Total)
    if (b.buchholz_total !== a.buchholz_total) return (b.buchholz_total || 0) - (a.buchholz_total || 0);
    // Quaternary sort by TB3 (Sonneborn-Berger)
    return (b.sonneborn_berger || 0) - (a.sonneborn_berger || 0);
  });

  const canRegister =
    (tournament.status === "upcoming" || tournament.status === "published") &&
    approvedRegistrations.length < parseInt(tournament.max_players || 64);

  const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
  const isRegistered = registrations.some(
    (r) => r.user_email === userData.email,
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
            <Badge variant="secondary" className="h-10 px-4">Already Registered</Badge>
          )}

          {isArbiter && (tournament.status === "upcoming" || tournament.status === "published") && (
            <Button onClick={handleStartTournament} variant="default">
              <Play className="h-4 w-4 mr-2" />
              Start Tournament
            </Button>
          )}

          {isArbiter && tournament.status === "active" && (
            <Button
              onClick={() => navigate(`/arbiter/tournament/${id}/pairings`)}
            >
              Manage Pairings
            </Button>
          )}
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
                {approvedRegistrations.length}/
                {tournament.max_players || 64}
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
                {tournament.currentRound}/{tournament.rounds}
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
          {isArbiter && (
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
                    {tournament.entryFee === "0"
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
        </TabsContent>

        <TabsContent value="participants" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Registered Participants</span>
                <div className="flex gap-2">
                  {isArbiter && (
                    <Button variant="outline" size="sm" onClick={handleSeedPlayers} className="border-chess-gold text-chess-gold hover:bg-chess-gold/10">
                      Seed Dummy Players
                    </Button>
                  )}
                  {isArbiter && (
                    <Button variant="default" size="sm" onClick={() => setIsManualDialogOpen(true)}>
                      Add Onsite Player
                    </Button>
                  )}
                  {isArbiter && (
                    <Button variant="outline" size="sm" onClick={loadTournament}>Refresh</Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isArbiter ? (
                // Public View - Only show approved players
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
                            <TableCell className="font-medium">{reg.user_name}</TableCell>
                            <TableCell>{reg.player_rating || "Unrated"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(reg.registration_date).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              ) : (
                // Arbiter View - Split into Players and Pending
                <Tabs value={participantSubTab} onValueChange={setParticipantSubTab}>
                  <div className="mb-6 flex space-x-4 border-b pb-2">
                    <button
                      onClick={() => setParticipantSubTab("players")}
                      className={`text-sm font-medium pb-2 -mb-[9px] ${participantSubTab === "players"
                        ? "border-b-2 border-primary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted-foreground"
                        }`}
                    >
                      Players List ({approvedRegistrations.length})
                    </button>
                    <button
                      onClick={() => setParticipantSubTab("pending")}
                      className={`text-sm font-medium pb-2 -mb-[9px] flex items-center gap-2 ${participantSubTab === "pending"
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
                              <TableCell className="font-medium">{reg.user_name}</TableCell>
                              <TableCell>{reg.player_rating || "Unrated"}</TableCell>
                              <TableCell>{reg.user_email}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(reg.registration_date).toLocaleDateString()}
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
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingRegistrations.map((reg, index) => (
                            <TableRow key={reg.registration_id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{reg.user_name}</TableCell>
                              <TableCell>{reg.player_rating || "Unrated"}</TableCell>
                              <TableCell>{reg.user_email}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(reg.registration_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="h-8 text-xs text-green-600 hover:text-green-700 border-green-200"
                                    onClick={() => handleStatusUpdate(reg.registration_id, "approved")}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="h-8 text-xs text-red-600 hover:text-red-700 border-red-200"
                                    onClick={() => handleStatusUpdate(reg.registration_id, "rejected")}
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
        </TabsContent>

        {/* Pairings Tab */}
        <TabsContent value="pairings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold">Pairings & Results</span>
                  {tournament.current_round > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">Select Round:</span>
                      <Select
                        value={selectedRound.toString()}
                        onValueChange={(val) => setSelectedRound(parseInt(val))}
                      >
                        <SelectTrigger className="h-9 w-32">
                          <SelectValue placeholder="Round" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: tournament.current_round || 0 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              Round {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {isArbiter && (
                  <div className="flex gap-2">
                    {tournament.current_round === tournament.rounds && incompleteMatches === 0 ? (
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("standings")}
                        className="bg-success text-success-foreground hover:bg-success/90"
                      >
                        <Trophy className="h-4 w-4 mr-1" />
                        Complete Tournament
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleGenerateNextRound}
                        disabled={generatingPairings || (tournament.current_round > 0 && incompleteMatches > 0)}
                        title={incompleteMatches > 0 ? `Enter results for ${incompleteMatches} more matches to generate next round` : ""}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {generatingPairings
                          ? "Generating..."
                          : tournament.current_round === 0
                            ? "Start Round 1"
                            : `Generate Round ${(tournament.current_round || 0) + 1}`}
                      </Button>
                    )}
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pairings.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Flag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No pairings generated yet.</p>
                  {isArbiter && (
                    <p className="text-xs mt-1">
                      Accept at least 2 players, then click "Start Round 1".
                    </p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-16 text-center">Board #</TableHead>
                      <TableHead>White</TableHead>
                      <TableHead className="text-center w-24">Score</TableHead>
                      <TableHead>Black</TableHead>
                      {isArbiter && selectedRound === tournament.current_round && (
                        <TableHead className="text-right w-48">Actions</TableHead>
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
                            <span className="text-muted-foreground italic">BYE</span>
                          )}
                        </TableCell>
                        {isArbiter && selectedRound === tournament.current_round && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {["1-0", "1/2-1/2", "0-1"].map((r) => (
                                <Button
                                  key={r}
                                  size="sm"
                                  variant={match.result === r ? "default" : "outline"}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Ranking after Round {tournament.currentRound || 0}</span>
                <Button variant="outline" size="sm" onClick={loadTournament} className="border-chess-gold text-chess-gold hover:bg-chess-gold/10">
                  Refresh Standings
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-[#ccc] overflow-hidden rounded-sm">
                <Table className="text-xs border-collapse">
                  <TableHeader className="bg-[#f0f0f0] border-b border-[#ccc] text-[#333]">
                    <TableRow className="hover:bg-transparent h-8">
                      <TableHead className="w-10 text-center border-r border-[#ccc] font-bold">Rk.</TableHead>
                      <TableHead className="w-10 text-center border-r border-[#ccc]">SNo</TableHead>
                      <TableHead className="font-bold border-r border-[#ccc] text-left">Name</TableHead>
                      <TableHead className="text-center w-12 border-r border-[#ccc]">FED</TableHead>
                      <TableHead className="text-center w-14 border-r border-[#ccc]">Rtg</TableHead>
                      <TableHead className="text-center w-12 border-r border-[#ccc] font-bold">Pts.</TableHead>
                      <TableHead className="text-center w-12 border-r border-[#ccc]" title="Buchholz Cut 1">TB1</TableHead>
                      <TableHead className="text-center w-12 border-r border-[#ccc]" title="Buchholz Total">TB2</TableHead>
                      <TableHead className="text-center w-12" title="Sonneborn-Berger">TB3</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStandings.map((player, index) => (
                      <TableRow
                        key={player.user_id || index}
                        className={`h-8 border-b border-[#eee] ${index % 2 === 0 ? "bg-white" : "bg-[#f5f5f5]"}`}
                      >
                        <TableCell className="text-center border-r border-[#ccc] font-bold">{index + 1}</TableCell>
                        <TableCell className="text-center border-r border-[#ccc] text-[#666]">{player.starting_no || "-"}</TableCell>
                        <TableCell className="font-medium border-r border-[#ccc] text-blue-700 hover:underline cursor-pointer">
                          {player.player_name || player.name}
                        </TableCell>
                        <TableCell className="text-center text-[#666] border-r border-[#ccc]">{player.federation || "IND"}</TableCell>
                        <TableCell className="text-center border-r border-[#ccc]">{player.rating || "0"}</TableCell>
                        <TableCell className="text-center font-bold border-r border-[#ccc] text-black">
                          {parseFloat(player.points || 0).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-center text-[#666] border-r border-[#ccc]">{player.buchholz?.toFixed(1) || "0.0"}</TableCell>
                        <TableCell className="text-center text-[#666] border-r border-[#ccc]">{player.buchholz_total?.toFixed(1) || "0.0"}</TableCell>
                        <TableCell className="text-center text-[#666]">{player.sonneborn_berger?.toFixed(2) || "0.00"}</TableCell>
                      </TableRow>
                    ))}
                    {sortedStandings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No standings available yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground italic">
                Annotation: Tie Break1: Buchholz Tie-Breaks (Cut 1), Tie Break2: Buchholz Tie-Breaks (Total), Tie Break3: Sonneborn-Berger Tie-Breaks
              </div>
            </CardContent>
          </Card>
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
    </div >
  );
}
