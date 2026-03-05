import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  getTournamentById,
  getTournamentPairings,
  startTournamentPairing,
  submitRoundResults,
  updateTournament,
} from "@/lib/tournament-service";

export default function TournamentPairings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [pairings, setPairings] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadTournamentData();
  }, [id]);

  const loadTournamentData = async () => {
    setLoading(true);
    try {
      const [tData, pData] = await Promise.all([
        getTournamentById(id),
        getTournamentPairings(id)
      ]);

      if (!tData) {
        toast.error("Tournament not found");
        navigate("/tournaments");
        return;
      }

      setTournament(tData);
      setCurrentRound(tData.current_round || 1);
      setPairings(pData?.pairings || []);

      // Initialize results state
      const initialResults = {};
      (pData?.pairings || []).forEach((pairing, index) => {
        initialResults[index] = pairing.result || "";
      });
      setResults(initialResults);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePairings = async () => {
    setGenerating(true);
    try {
      await startTournamentPairing(id);
      toast.success(`Round pairings generated!`);
      await loadTournamentData();
    } catch (error) {
      toast.error(error.message || "Failed to generate pairings");
    } finally {
      setGenerating(false);
    }
  };

  const handleResultChange = (index, result) => {
    setResults((prev) => ({ ...prev, [index]: result }));
  };

  const handleSubmitResults = async () => {
    try {
      // Validate all results are entered
      const allEntered = pairings.every((_, index) => results[index]);

      if (!allEntered) {
        toast.error("Please enter all results before submitting");
        return;
      }

      // Format results for submission
      const formattedResults = pairings.map((pairing, index) => ({
        whiteId: pairing.white.id,
        blackId: pairing.black?.id || null,
        result: results[index],
      }));

      await submitRoundResults(id, currentRound, formattedResults);

      toast.success(`Round ${currentRound} results submitted!`);

      if (currentRound >= tournament.rounds) {
        toast.success("Tournament Completed!");
        navigate(`/tournament/${id}?tab=standings`);
      } else {
        // Reload tournament data
        loadTournamentData();

        // Clear pairings and move to next round
        setPairings([]);
        setResults({});
        setCurrentRound((prev) => prev + 1);
      }
    } catch (error) {
      toast.error(error.message || "Failed to submit results");
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

  const canGeneratePairings = currentRound <= tournament.rounds;
  const hasUnsavedPairings = pairings.length > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() => navigate(`/tournament/${id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tournament
        </Button>

        <PageHeader
          title={`${tournament.name} - Pairings`}
          description={`Manage pairings and results for ${tournament.type}`}
        />
      </div>

      {/* Round Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Current Round</div>
              <div className="text-2xl font-bold">
                Round {currentRound} of {tournament.rounds}
              </div>
            </div>

            <div className="flex gap-2">
              {!hasUnsavedPairings && canGeneratePairings && (
                <Button
                  onClick={handleGeneratePairings}
                  disabled={generating}
                  size="lg"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate Round {currentRound} Pairings
                    </>
                  )}
                </Button>
              )}

              {hasUnsavedPairings && (
                <Button
                  onClick={handleSubmitResults}
                  size="lg"
                  variant="default"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Submit Results
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pairings Table */}
      {pairings.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Round {currentRound} Pairings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Board</TableHead>
                    <TableHead>White</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-center">vs</TableHead>
                    <TableHead>Black</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="w-40">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairings.map((pairing, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {pairing.board}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{pairing.white.name}</div>
                        {pairing.white.title && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {pairing.white.title}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{pairing.white.rating || "-"}</TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        vs
                      </TableCell>
                      <TableCell>
                        {pairing.black ? (
                          <>
                            <div className="font-medium">
                              {pairing.black.name}
                            </div>
                            {pairing.black.title && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {pairing.black.title}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Bye
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{pairing.black?.rating || "-"}</TableCell>
                      <TableCell>
                        {pairing.black ? (
                          <Select
                            value={results[index] || ""}
                            onValueChange={(value) =>
                              handleResultChange(index, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select result" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-0">
                                1-0 (White wins)
                              </SelectItem>
                              <SelectItem value="0-1">
                                0-1 (Black wins)
                              </SelectItem>
                              <SelectItem value="½-½">½-½ (Draw)</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            1-0 (Bye)
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-muted-foreground">
              {currentRound > tournament.rounds ? (
                <>
                  <div className="text-lg font-semibold mb-2">
                    Tournament Complete
                  </div>
                  <div>All rounds have been played</div>
                  <Button
                    className="mt-4"
                    onClick={() => navigate(`/tournament/${id}`)}
                  >
                    View Final Standings
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold mb-2">
                    Ready to Generate Round {currentRound}
                  </div>
                  <div className="text-sm text-muted-foreground mb-6">
                    Generate Swiss pairings for this round to get started.
                  </div>
                  <Button
                    onClick={handleGeneratePairings}
                    disabled={generating}
                    size="lg"
                    className="bg-chess-gold hover:bg-chess-gold/90 text-black font-bold shadow-md border-none"
                  >
                    {generating ? (
                      <>
                        <div className="h-4 w-4 animate-spin border-2 border-black border-t-transparent rounded-full mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Generate Round {currentRound} Pairings
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Rounds */}
      {tournament.currentRound > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Rounds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground">
              {tournament.currentRound} round(s) completed
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
