import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Activity,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { updateTournament } from "@/lib/tournament-service";

export default function ManagementTab({ tournament, onTournamentUpdate }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStartTournament = async () => {
    if (tournament.registeredPlayers?.length < 2) {
      toast.error("Need at least 2 players to start the tournament");
      return;
    }

    setIsUpdating(true);
    try {
      const updated = updateTournament(tournament.id, {
        status: "active",
        startedAt: new Date().toISOString(),
      });
      onTournamentUpdate(updated);
      toast.success("Tournament started!");
    } catch (error) {
      toast.error(error.message || "Failed to start tournament");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEndTournament = async () => {
    setIsUpdating(true);
    try {
      const updated = updateTournament(tournament.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      onTournamentUpdate(updated);
      toast.success("Tournament ended!");
    } catch (error) {
      toast.error(error.message || "Failed to end tournament");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartNextRound = async () => {
    if (tournament.currentRound >= tournament.rounds) {
      toast.error("All rounds completed");
      return;
    }

    setIsUpdating(true);
    try {
      const updated = updateTournament(tournament.id, {
        currentRound: tournament.currentRound + 1,
      });
      onTournamentUpdate(updated);
      toast.success(`Round ${updated.currentRound} started!`);
    } catch (error) {
      toast.error(error.message || "Failed to start round");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Tournament Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Current Status</p>
              <p className="text-xl font-bold capitalize">
                {tournament.status}
              </p>
            </div>
            <Badge variant="default" className="capitalize">
              {tournament.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Registered Players
              </p>
              <p className="text-2xl font-bold">
                {tournament.registeredPlayers?.length || 0}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Current Round</p>
              <p className="text-2xl font-bold">
                {tournament.currentRound} / {tournament.rounds}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Total Pairings</p>
              <p className="text-2xl font-bold">
                {tournament.pairings?.length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tournament Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tournament.status === "upcoming" && (
            <Button
              onClick={handleStartTournament}
              disabled={isUpdating}
              className="w-full gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              Start Tournament
            </Button>
          )}

          {tournament.status === "active" && (
            <>
              <Button
                onClick={handleStartNextRound}
                disabled={isUpdating}
                variant="outline"
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Start Next Round (Round {tournament.currentRound + 1})
              </Button>

              <Button
                onClick={handleEndTournament}
                disabled={isUpdating}
                variant="destructive"
                className="w-full gap-2"
              >
                <StopCircle className="h-4 w-4" />
                End Tournament
              </Button>
            </>
          )}

          {tournament.status === "completed" && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">
                Tournament completed on{" "}
                {new Date(tournament.completedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Round Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(
              (round) => (
                <div
                  key={round}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="font-medium">Round {round}</span>
                  {round < tournament.currentRound && (
                    <Badge variant="secondary">Completed</Badge>
                  )}
                  {round === tournament.currentRound && (
                    <Badge variant="default">In Progress</Badge>
                  )}
                  {round > tournament.currentRound && (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
