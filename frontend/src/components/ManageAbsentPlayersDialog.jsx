import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserMinus,
  UserCheck,
  Search,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Users,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getAbsentPlayers,
  markPlayerAbsent,
  restorePlayer,
} from "@/lib/tournament-service";

export function ManageAbsentPlayersDialog({
  isOpen,
  onClose,
  tournamentId,
  currentRound = 0,
  onStatusChanged,
}) {
  const [activeTab, setActiveTab] = useState("remove");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    active_players: [],
    absent_players: [],
    next_round: (currentRound || 0) + 1,
  });

  const [searchActive, setSearchActive] = useState("");
  const [searchAbsent, setSearchAbsent] = useState("");

  // Confirmation modal states
  const [confirmTarget, setConfirmTarget] = useState(null); // { player, action: 'absent' | 'restore' }
  const [absentScope, setAbsentScope] = useState("round"); // 'round' (specific upcoming round) | 'all' (all remaining)
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (isOpen && tournamentId) {
      loadPlayers();
    }
  }, [isOpen, tournamentId]);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const res = await getAbsentPlayers(tournamentId);
      setData(res);
    } catch (err) {
      toast.error(err.message || "Failed to load tournament participants");
    } finally {
      setLoading(false);
    }
  };

  const filteredActive = useMemo(() => {
    const q = searchActive.trim().toLowerCase();
    if (!q) return data.active_players;
    return data.active_players.filter(
      (p) =>
        p.player_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        String(p.seed || "").includes(q) ||
        String(p.fide_id || "").includes(q)
    );
  }, [data.active_players, searchActive]);

  const filteredAbsent = useMemo(() => {
    const q = searchAbsent.trim().toLowerCase();
    if (!q) return data.absent_players;
    return data.absent_players.filter(
      (p) =>
        p.player_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        String(p.seed || "").includes(q) ||
        String(p.fide_id || "").includes(q)
    );
  }, [data.absent_players, searchAbsent]);

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;
    const { player, action } = confirmTarget;
    setProcessingId(player.user_id);

    try {
      if (action === "absent") {
        const targetRound = absentScope === "round" ? data.next_round : 0;
        await markPlayerAbsent(tournamentId, player.user_id, targetRound);
        if (targetRound > 0) {
          toast.warning(
            `${player.player_name} marked absent for Round ${targetRound} ONLY. They will be included again in Round ${targetRound + 1}.`
          );
        } else {
          toast.warning(
            `${player.player_name} marked absent for all remaining rounds.`
          );
        }
      } else {
        await restorePlayer(tournamentId, player.user_id);
        toast.success(
          `${player.player_name} restored! They will be paired in Round ${data.next_round}.`
        );
      }
      setConfirmTarget(null);
      await loadPlayers();
      onStatusChanged?.();
    } catch (err) {
      toast.error(err.message || `Failed to ${action} player`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-card border-border shadow-2xl rounded-2xl p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500/10 via-background to-background p-6 border-b border-border/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    Manage Absent Players
                    <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-xs">
                      Swiss-Manager Standard
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Exclude players who miss rounds or restore returning players for upcoming pairings without losing their past scores.
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadPlayers}
                disabled={loading}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Refresh participants"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* FIDE Notice Banner */}
            <div className="mt-4 p-3 bg-muted/60 border border-border/60 rounded-xl flex items-start gap-2.5 text-xs text-muted-foreground">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Arbiter Notice:</strong> Absent players receive zero points and no pairing for the skipped rounds.
                When restored, their prior game results and points are preserved according to FIDE Swiss pairing rules.
              </span>
            </div>
          </div>

          {/* Body Tabs */}
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/80 rounded-xl">
                <TabsTrigger
                  value="remove"
                  className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center justify-center gap-2 text-xs font-semibold py-2"
                >
                  <UserMinus className="h-4 w-4 text-rose-500" />
                  <span>Remove Player (Active: {data.active_players.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="add"
                  className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center justify-center gap-2 text-xs font-semibold py-2"
                >
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                  <span>Restore Player (Absent: {data.absent_players.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: REMOVE PLAYER (MARK ABSENT) */}
              <TabsContent value="remove" className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search active players by name, seed, or FIDE ID..."
                    value={searchActive}
                    onChange={(e) => setSearchActive(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-muted/40 border-border"
                  />
                </div>

                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {loading && (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading active participants...
                    </div>
                  )}

                  {!loading && filteredActive.length === 0 && (
                    <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl">
                      {searchActive
                        ? "No active players match your search."
                        : "No active players in the tournament."}
                    </div>
                  )}

                  {!loading &&
                    filteredActive.map((player) => (
                      <div
                        key={player.user_id}
                        className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/80 hover:border-border transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            #{player.seed || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-foreground truncate">
                              {player.player_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                              <span>Rtg: {player.rating || "Unrated"}</span>
                              <span>•</span>
                              <span className="font-medium text-primary">
                                {player.current_points} pts
                              </span>
                              {player.country && (
                                <>
                                  <span>•</span>
                                  <span>{player.country}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmTarget({ player, action: "absent" })
                          }
                          className="h-8 text-xs border-rose-500/40 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg shrink-0"
                        >
                          <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                          Mark Absent
                        </Button>
                      </div>
                    ))}
                </div>
              </TabsContent>

              {/* TAB 2: ADD PLAYER (RESTORE ABSENT PLAYER) */}
              <TabsContent value="add" className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search absent players by name, seed, or FIDE ID..."
                    value={searchAbsent}
                    onChange={(e) => setSearchAbsent(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-muted/40 border-border"
                  />
                </div>

                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {loading && (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading absent participants...
                    </div>
                  )}

                  {!loading && filteredAbsent.length === 0 && (
                    <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl">
                      {searchAbsent
                        ? "No absent players match your search."
                        : "There are currently no absent players. All registered players are active in pairings."}
                    </div>
                  )}

                  {!loading &&
                    filteredAbsent.map((player) => (
                      <div
                        key={player.user_id}
                        className="flex items-center justify-between p-3 rounded-xl bg-card border border-amber-500/20 bg-amber-500/[0.02] hover:border-amber-500/40 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 font-bold text-xs flex items-center justify-center shrink-0">
                            #{player.seed || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {player.player_name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/30 px-1.5 py-0 h-4"
                              >
                                Skipped R{player.absent_round || data.next_round}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span>Rtg: {player.rating || "Unrated"}</span>
                              <span>•</span>
                              <span className="font-semibold text-primary">
                                Score: {player.current_points} pts (Kept)
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmTarget({ player, action: "restore" })
                          }
                          className="h-8 text-xs border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg shrink-0"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                          Restore Player
                        </Button>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="bg-muted/40 p-4 border-t border-border flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={!!confirmTarget} onOpenChange={() => setConfirmTarget(null)}>
        <DialogContent className="max-w-md bg-card border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  confirmTarget?.action === "absent"
                    ? "bg-rose-500/15 text-rose-500"
                    : "bg-emerald-500/15 text-emerald-500"
                }`}
              >
                {confirmTarget?.action === "absent" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
              <DialogTitle className="text-base font-bold">
                {confirmTarget?.action === "absent"
                  ? "Exclude Player from Next Round?"
                  : "Restore Player to Pairings?"}
              </DialogTitle>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed space-y-3">
              {confirmTarget?.action === "absent" ? (
                <>
                  <p>
                    Are you sure you want to exclude <strong>{confirmTarget?.player?.player_name}</strong> from pairings?
                  </p>

                  <div className="bg-muted/50 p-3 rounded-xl border border-border/80 space-y-2">
                    <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      Exclusion Duration:
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setAbsentScope("round")}
                        className={`text-left p-2.5 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${
                          absentScope === "round"
                            ? "bg-amber-500/10 border-amber-500 text-foreground shadow-sm"
                            : "bg-card border-border/70 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                          absentScope === "round" ? "border-amber-500 bg-amber-500" : "border-muted-foreground"
                        }`}>
                          {absentScope === "round" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            Round {data.next_round} Only (Recommended)
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Player skips Round {data.next_round} and will automatically return for Round {data.next_round + 1}.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAbsentScope("all")}
                        className={`text-left p-2.5 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${
                          absentScope === "all"
                            ? "bg-rose-500/10 border-rose-500 text-foreground shadow-sm"
                            : "bg-card border-border/70 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                          absentScope === "all" ? "border-rose-500 bg-rose-500" : "border-muted-foreground"
                        }`}>
                          {absentScope === "all" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            All Remaining Rounds (Withdrawal)
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Player remains excluded until manually restored by arbiter.
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    • Player receives <strong>0 points</strong> and no board for excluded rounds.
                    <br />
                    • Past matches and existing score (<strong>{confirmTarget?.player?.current_points} pts</strong>) remain intact.
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Are you sure you want to restore <strong>{confirmTarget?.player?.player_name}</strong> to the active pairing pool?
                  </p>
                  <p>
                    • The player <strong>will be paired</strong> starting in Round {data.next_round}.
                    <br />
                    • They re-enter with their existing score of <strong>{confirmTarget?.player?.current_points} pts</strong>.
                  </p>
                </>
              )}
            </div>
          </DialogHeader>

          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmTarget(null)}
              disabled={!!processingId}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant={confirmTarget?.action === "absent" ? "destructive" : "default"}
              size="sm"
              onClick={handleConfirmAction}
              disabled={!!processingId}
              className="rounded-xl text-xs font-semibold"
            >
              {processingId ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
              ) : confirmTarget?.action === "absent" ? (
                <UserMinus className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              )}
              {confirmTarget?.action === "absent" ? "Confirm Exclusion" : "Confirm Restoration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
