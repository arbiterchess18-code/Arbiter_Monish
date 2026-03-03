import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  generatePairings,
  updateTournament,
  submitPairingResult,
  getStandings,
} from "@/lib/tournament-service";
import { Dices, Trophy, Play, CheckCircle } from "lucide-react";

export default function PairingsTab({
  tournament,
  canManage,
  onTournamentUpdate,
}) {
  const [selectedRound, setSelectedRound] = useState(
    tournament.currentRound || 1,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [submittingResult, setSubmittingResult] = useState(null);

  const currentRoundPairings = (tournament.pairings || []).filter(
    (p) => p.round === selectedRound,
  );

  const handleGeneratePairings = async () => {
    if (selectedRound < 1 || selectedRound > tournament.rounds) {
      toast.error("Invalid round");
      return;
    }

    const approvedPlayers = (tournament.registeredPlayers || []).filter(
      (p) => p.registrationStatus === "approved",
    );

    if (approvedPlayers.length < 2) {
      toast.error("Need at least 2 approved players to generate pairings");
      return;
    }

    setIsGenerating(true);
    try {
      // Generate pairings based on pairing system
      const newPairings = generatePairings(
        tournament.id,
        selectedRound,
        tournament.pairingSystem || "Swiss",
      );

      const allPairings = [
        ...(tournament.pairings || []).filter((p) => p.round !== selectedRound),
        ...newPairings,
      ];

      updateTournament(tournament.id, {
        pairings: allPairings,
        currentRound: selectedRound,
      });

      // Refresh tournament data
      if (onTournamentUpdate) {
        onTournamentUpdate();
      }

      toast.success(`Pairings generated for Round ${selectedRound}!`);
    } catch (error) {
      toast.error(error.message || "Failed to generate pairings");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitResult = async (pairingIndex, result) => {
    setSubmittingResult(pairingIndex);
    try {
      // Find the global index of this pairing
      const globalIndex = tournament.pairings.findIndex(
        (p) =>
          p.round === selectedRound &&
          p.board === currentRoundPairings[pairingIndex].board,
      );

      submitPairingResult(tournament.id, globalIndex, result);

      toast.success("Result submitted successfully!");

      // Refresh tournament data
      if (onTournamentUpdate) {
        onTournamentUpdate();
      }
    } catch (error) {
      toast.error(error.message || "Failed to submit result");
    } finally {
      setSubmittingResult(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Round Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Dices className="h-5 w-5" />
            Round & Pairings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Select Round
              </label>
              <Select
                value={selectedRound.toString()}
                onValueChange={(value) => setSelectedRound(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: tournament.rounds },
                    (_, i) => i + 1,
                  ).map((round) => (
                    <SelectItem key={round} value={round.toString()}>
                      Round {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManage && (
              <div className="flex items-end">
                <Button
                  onClick={handleGeneratePairings}
                  disabled={isGenerating}
                  className="gap-2 w-full md:w-auto"
                >
                  <Play className="h-4 w-4" />
                  Generate Pairings
                </Button>
              </div>
            )}
          </div>

          {/* Round Progress */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Current Round</p>
              <p className="text-2xl font-bold">{tournament.currentRound}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Total Rounds</p>
              <p className="text-2xl font-bold">{tournament.rounds}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Approved Players</p>
              <p className="text-2xl font-bold">
                {
                  (tournament.registeredPlayers || []).filter(
                    (p) => p.registrationStatus === "approved",
                  ).length
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pairings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Round {selectedRound} Pairings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentRoundPairings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pairings generated yet for this round.</p>
              {canManage && (
                <p className="text-sm mt-2">
                  Click "Generate Pairings" to create matchups.
                </p>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Board</TableHead>
                    <TableHead>White Player</TableHead>
                    <TableHead>Black Player</TableHead>
                    <TableHead>Result</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRoundPairings.map((pairing, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        Board {pairing.board}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{pairing.white?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pairing.white?.rating
                              ? `Rating: ${pairing.white.rating}`
                              : "Unrated"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {pairing.black ? (
                          <div>
                            <p className="font-medium">{pairing.black.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {pairing.black.rating
                                ? `Rating: ${pairing.black.rating}`
                                : "Unrated"}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="secondary">BYE</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {pairing.result ? (
                          <Badge
                            variant={
                              pairing.result === "1-0"
                                ? "default"
                                : pairing.result === "0-1"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {pairing.result === "1-0"
                              ? "1-0 (White Won)"
                              : pairing.result === "0-1"
                                ? "0-1 (Black Won)"
                                : "½-½ (Draw)"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          {!pairing.result && pairing.black ? (
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubmitResult(index, "1-0")}
                                disabled={submittingResult === index}
                              >
                                White Wins
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubmitResult(index, "½-½")}
                                disabled={submittingResult === index}
                              >
                                Draw
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubmitResult(index, "0-1")}
                                disabled={submittingResult === index}
                              >
                                Black Wins
                              </Button>
                            </div>
                          ) : pairing.result ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Submitted</span>
                            </div>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Standings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Standings (After Round{" "}
            {Math.min(selectedRound, tournament.currentRound)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(tournament.standings || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Standings will update as results are entered.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Buchholz</TableHead>
                    <TableHead className="text-right">Games</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tournament.standings || [])
                    .slice(0, 20)
                    .map((standing, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-bold">
                          #{index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {standing.playerName}
                        </TableCell>
                        <TableCell>{standing.rating || "N/A"}</TableCell>
                        <TableCell className="font-bold">
                          {standing.points.toFixed(1)}
                        </TableCell>
                        <TableCell>{standing.buchholz.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          {standing.gamesPlayed}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
