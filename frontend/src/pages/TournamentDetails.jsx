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
} from "@/lib/tournament-service";
import { useRole } from "@/lib/role-context";
import { JoinTournamentDialog } from "@/components/JoinTournamentDialog";

const statusColors = {
  active: "bg-success/15 text-success border-success/30",
  upcoming: "bg-info/15 text-info border-info/30",
  completed: "bg-muted text-muted-foreground border-border",
};

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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

  const handleJoinSuccess = () => {
    toast.success("Successfully registered for tournament!");
    setShowJoinDialog(false);
    loadTournament();
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
  const canRegister =
    tournament.status === "upcoming" &&
    tournament.registeredPlayers.length < parseInt(tournament.maxPlayers || 64);
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const isRegistered = tournament.registeredPlayers.some(
    (p) => p.email === userData.email,
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

          {isArbiter && tournament.status === "upcoming" && (
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
                {tournament.registeredPlayers.length}/
                {tournament.maxPlayers || 64}
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
              <CardTitle>
                Registered Participants ({tournament.registeredPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.registeredPlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No participants registered yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Player Name</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournament.registeredPlayers
                      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                      .map((player, index) => (
                        <TableRow key={player.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {player.name}
                          </TableCell>
                          <TableCell>{player.rating || "Unrated"}</TableCell>
                          <TableCell>
                            {player.title && (
                              <Badge variant="outline" className="text-xs">
                                {player.title}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(player.registeredAt).toLocaleDateString()}
                          </TableCell>
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
    </div>
  );
}
