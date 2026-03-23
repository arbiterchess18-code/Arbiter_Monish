import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Trophy,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

const statusColors = {
  active: "bg-success/15 text-success border-success/30",
  upcoming: "bg-info/15 text-info border-info/30",
  completed: "bg-muted text-muted-foreground border-border",
  published: "bg-blue-500/15 text-blue-600 border-blue-500/30",
};

const statusDot = {
  active: "bg-success",
  upcoming: "bg-info",
  completed: "bg-muted-foreground",
  published: "bg-blue-500",
};

const typeColors = {
  Swiss: "bg-primary/10 text-primary",
  "Round Robin": "bg-accent/15 text-accent-foreground",
  Knockout: "bg-destructive/10 text-destructive",
  Blitz: "bg-warning/15 text-warning-foreground",
  Rapid: "bg-info/10 text-info",
  Classical: "bg-chess-dark/20 text-foreground",
};

function handleShare(e, tournament) {
  e.stopPropagation();
  const url = `${window.location.origin}/tournament/${tournament.tournament_id ?? tournament.id}`;

  if (navigator.share) {
    navigator.share({ title: tournament.name, url }).catch(() => {});
    return;
  }

  navigator.clipboard.writeText(url).then(() => {
    toast({
      title: "Link copied!",
      description: "Tournament link copied to clipboard.",
    });
  });
}

export function TournamentCard({
  tournament,
  index = 0,
  showJoin,
  onJoin,
  hideActions = false,
  customActions,
  isSubArbiter,
  isParticipating,
}) {
  const statusKey = tournament.status || "upcoming";
  const dot = statusDot[statusKey] || statusDot.upcoming;
  const registeredCount =
    tournament.registered_count ?? tournament.players ?? 0;
  const maxPlayers = tournament.max_players ?? tournament.maxPlayers ?? "--";
  const occupancyPercent =
    typeof maxPlayers === "number" && maxPlayers > 0
      ? Math.min((registeredCount / maxPlayers) * 100, 100)
      : null;
  const locationLabel = tournament.venue_name
    ? `${tournament.venue_name}${tournament.city ? `, ${tournament.city}` : ""}`
    : tournament.location || tournament.city || tournament.mode || "Online";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="group relative flex h-full min-h-[320px] flex-col justify-between overflow-hidden rounded-[24px] border border-border/60 bg-gradient-to-b from-card via-card to-muted/20 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_48%),radial-gradient(circle_at_top_left,rgba(34,197,94,0.10),transparent_38%)]" />

      <div
        className={`relative h-1 w-full ${statusKey === "active" ? "bg-success" : statusKey === "completed" ? "bg-muted-foreground/40" : "bg-primary/60"}`}
      />

      <div className="relative flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full shrink-0 ${dot}`}
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Tournament
              </span>
            </div>

            <h3 className="min-h-[3.5rem] line-clamp-2 font-display text-lg font-semibold leading-snug text-foreground">
              {tournament.name}
            </h3>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className={`border px-2 py-0.5 text-[10px] ${statusColors[statusKey] || statusColors.upcoming}`}
              >
                {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
              </Badge>
              <Badge
                variant="secondary"
                className={`px-2 py-0.5 text-[10px] ${typeColors[tournament.pairingSystem || tournament.type] || typeColors.Swiss}`}
              >
                {tournament.pairingSystem || tournament.type || "Swiss"}
              </Badge>
              <Badge
                variant={
                  tournament.isRated || tournament.rated
                    ? "default"
                    : "secondary"
                }
                className="px-2 py-0.5 text-[10px]"
              >
                {tournament.isRated || tournament.rated ? "Rated" : "Unrated"}
              </Badge>
              {tournament.registrationType === "Paid" && (
                <Badge
                  variant="default"
                  className="bg-amber-500 px-2 py-0.5 text-[10px] hover:bg-amber-600"
                >
                  Paid
                </Badge>
              )}
              {isSubArbiter && (
                <Badge
                  variant="default"
                  className="bg-purple-500 px-2 py-0.5 text-[10px] hover:bg-purple-600"
                >
                  Selected as Arbiter
                </Badge>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            {tournament.prizePool && (
              <div className="flex items-center gap-1 rounded-full border border-chess-gold/25 bg-chess-gold/10 px-2.5 py-1 text-sm font-semibold text-chess-gold shadow-sm">
                <Trophy className="h-3.5 w-3.5" />
                {tournament.prizePool}
              </div>
            )}
            <button
              onClick={(e) => handleShare(e, tournament)}
              title="Share tournament"
              className="rounded-xl border border-border/70 bg-background/80 p-2 text-muted-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground/80">
              <Users className="h-3.5 w-3.5 shrink-0" />
              Players
            </div>
            <div className="mt-2 text-sm font-semibold text-foreground">
              {registeredCount}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / {maxPlayers}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground/80">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Time
            </div>
            <div className="mt-2 line-clamp-1 text-sm font-semibold text-foreground">
              {tournament.time_control ?? tournament.timeControl ?? "Standard"}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground/80">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Start
            </div>
            <div className="mt-2 line-clamp-1 text-sm font-semibold text-foreground">
              {tournament.start_date ??
                tournament.date ??
                tournament.startDate ??
                "--"}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground/80">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              Venue
            </div>
            <div className="mt-2 line-clamp-1 text-sm font-semibold text-foreground">
              {locationLabel}
            </div>
          </div>
        </div>

        {occupancyPercent !== null && (
          <div className="rounded-2xl border border-border/60 bg-background/80 px-3.5 py-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>Capacity</span>
              <span>{Math.round(occupancyPercent)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-info transition-all duration-500"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto space-y-3">
          {tournament.status === "active" && (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 px-3.5 py-3">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Round{" "}
                  {tournament.current_round ?? tournament.currentRound ?? 0}/
                  {tournament.rounds ?? 0}
                </span>
                <span>
                  {Math.round(
                    ((tournament.current_round ??
                      tournament.currentRound ??
                      0) /
                      (tournament.rounds || 1)) *
                      100,
                  )}
                  %
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-info transition-all duration-500"
                  style={{
                    width: `${((tournament.current_round ?? tournament.currentRound ?? 0) / (tournament.rounds || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {isParticipating ? (
            <div className="flex items-center gap-1.5 rounded-2xl border border-success/25 bg-success/10 px-3.5 py-3 text-sm font-medium text-success shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              You&apos;re participating
            </div>
          ) : (
            !hideActions &&
            showJoin &&
            (statusKey === "upcoming" || statusKey === "published") &&
            registeredCount <
              (tournament.max_players ?? tournament.maxPlayers ?? 999) && (
              <Button
                size="sm"
                className="h-11 w-full rounded-2xl text-sm font-semibold shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin?.(tournament);
                }}
              >
                Join Tournament
              </Button>
            )
          )}
        </div>
      </div>

      {customActions && (
        <div
          className={`mt-auto grid gap-2 border-t border-border/60 bg-muted/20 p-3 ${isSubArbiter ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {customActions}
        </div>
      )}
    </motion.div>
  );
}
