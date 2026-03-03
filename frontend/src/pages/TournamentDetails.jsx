import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

  useEffect(() => {
    loadTournament();
  }, [id]);

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
        registeredPlayers: data.registeredPlayers || []
      };

      setTournament(mappedData);

      if (mappedData.status === "active" || mappedData.status === "completed") {
        const standingsData = await getStandings(id);
        setStandings(standingsData || []);
      }

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
      // Refresh standings after scoring
      if (tournament?.status === "active") {
        const standingsData = await getStandings(id);
        setStandings(standingsData || []);
      }
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
      const pairingsData = await getTournamentPairings(id);
      setPairings(pairingsData?.pairings || []);
      loadTournament();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading tournament...</div>
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

  const canRegister =
    (tournament.status === "upcoming" || tournament.status === "published") &&
    approvedRegistrations.length < parseInt(tournament.max_players || 64);

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
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
                {tournament.prizePool || "Medals"}
              </div>
              <div className="text-xs text-muted-foreground">Prizes</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          {isArbiter && (
            <TabsTrigger value="pairings">Pairings</TabsTrigger>
          )}
          {(tournament.status === "active" ||
            tournament.status === "completed") && (
              <TabsTrigger value="standings">Standings</TabsTrigger>
            )}
          {tournament.description && (
            <TabsTrigger value="details">Details</TabsTrigger>
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
              <CardTitle className="flex justify-between items-center flex-wrap gap-2">
                <span>
                  Round {tournament.current_round || 0} Pairings &amp; Results
                </span>
                {isArbiter && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleGenerateNextRound}
                      disabled={generatingPairings}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {generatingPairings
                        ? "Generating..."
                        : tournament.current_round === 0
                          ? "Start Round 1"
                          : `Generate Round ${(tournament.current_round || 0) + 1}`}
                    </Button>
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
                    <TableRow>
                      <TableHead className="w-14 text-center">Board</TableHead>
                      <TableHead>White</TableHead>
                      <TableHead className="text-center w-28">Result</TableHead>
                      <TableHead>Black</TableHead>
                      {isArbiter && (
                        <TableHead className="text-right">Enter Result</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pairings.map((match) => (
                      <TableRow key={match.match_id}>
                        <TableCell className="text-center font-medium">
                          {match.board_number}
                        </TableCell>
                        <TableCell className="font-medium">
                          {match.white_player_name || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={match.result ? "default" : "outline"}
                            className="font-mono text-xs"
                          >
                            {match.result || "vs"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {match.black_player_name || (
                            <span className="text-muted-foreground italic">BYE</span>
                          )}
                        </TableCell>
                        {isArbiter && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {["1-0", "1/2-1/2", "0-1"].map((r) => (
                                <Button
                                  key={r}
                                  size="sm"
                                  variant={match.result === r ? "default" : "outline"}
                                  className="h-7 px-2 text-xs font-mono"
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
              <CardTitle>Current Standings</CardTitle>
            </CardHeader>
            <CardContent>
              {standings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No standings available yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-center">Points</TableHead>
                      <TableHead className="text-center">Buchholz</TableHead>
                      <TableHead className="text-center">SB</TableHead>
                      <TableHead className="text-center">W-D-L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-bold">
                          {player.rank}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{player.name}</div>
                          {player.title && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {player.title}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{player.rating || "-"}</TableCell>
                        <TableCell className="text-center font-semibold">
                          {player.points || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {player.buchholz?.toFixed(1) || "0.0"}
                        </TableCell>
                        <TableCell className="text-center">
                          {player.sonnebornBerger?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <span className="text-success">
                            {player.wins || 0}
                          </span>
                          -
                          <span className="text-muted-foreground">
                            {player.draws || 0}
                          </span>
                          -
                          <span className="text-destructive">
                            {player.losses || 0}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{tournament.description}</p>
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
    </div>
  );
}
