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
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

const statusColors = {
  active: "bg-success/15 text-success border-success/30",
  upcoming: "bg-info/15 text-info border-info/30",
  completed: "bg-muted text-muted-foreground border-border",
  published: "bg-blue-500/15 text-blue-600 border-blue-500/30",
};

const typeColors = {
  Swiss: "bg-primary/10 text-primary border-primary/20",
  "Round Robin": "bg-accent/15 text-accent-foreground border-accent/20",
  Knockout: "bg-destructive/10 text-destructive border-destructive/20",
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
  const registeredCount = tournament.registered_count ?? tournament.players ?? 0;
  const maxPlayers = tournament.max_players ?? tournament.maxPlayers ?? "--";
  const occupancyPercent = typeof maxPlayers === "number" && maxPlayers > 0 ? Math.min((registeredCount / maxPlayers) * 100, 100) : null;
  const locationLabel = tournament.venue_name ? `${tournament.venue_name}${tournament.city ? `, ${tournament.city}` : ""}` : tournament.location || tournament.city || tournament.mode || "Online";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, type: "spring", stiffness: 100 }}
      className="group relative flex flex-col h-full overflow-hidden rounded-xl bg-card p-5 sm:p-6 border border-border/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border"
    >
      {/* Top Section - Always exactly the same height footprint */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-start justify-between gap-4 mb-4 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="outline" className={`px-2 py-0.5 font-semibold text-xs tracking-wider ${statusColors[statusKey] || statusColors.upcoming}`}>
                {statusKey}
              </Badge>
              <Badge variant="outline" className={`px-2 py-0.5 font-semibold text-xs tracking-wider ${typeColors[tournament.pairingSystem || tournament.type] || typeColors.Swiss}`}>
                {tournament.pairingSystem || tournament.type || "Swiss"}
              </Badge>
              {(tournament.isRated || tournament.rated) && (
                <Badge variant="default" className="px-2 py-0.5 font-semibold text-xs tracking-wider shadow-sm">
                  Rated
                </Badge>
              )}
            </div>
            
            {/* Fixed height container for Title to prevent layout shifting */}
            <div className="h-[3.5rem] sm:h-[4rem] flex items-start w-full">
              <h3 
                className="font-display text-lg sm:text-xl font-bold tracking-tight leading-snug text-foreground overflow-hidden w-full"
                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}
              >
                {tournament.name}
              </h3>
            </div>
          </div>

          <button
            onClick={(e) => handleShare(e, tournament)}
            title="Share tournament"
            className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-muted/40 border border-border/50 text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* Short Data Row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
          {[
            { icon: Users, label: "Players", value: `${registeredCount} / ${maxPlayers}` },
            { icon: Clock, label: "Format", value: tournament.time_control || "Standard" },
            { icon: Calendar, label: "Date", value: tournament.start_date || tournament.date || "--" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg bg-muted/30 p-2.5 sm:p-3 border border-border/40 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 min-w-0">
                <stat.icon className="h-3.5 w-3.5 shrink-0" /> 
                <span className="truncate">{stat.label}</span>
              </div>
              <div className="font-display text-xs sm:text-sm font-semibold text-foreground truncate mt-0.5">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Venue Ribbon */}
        <div className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-3.5 py-2.5 border border-border/40 mb-5 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="font-display text-sm font-medium text-foreground truncate w-full flex-1">
            {locationLabel}
          </div>
        </div>
      </div>

      {/* Bottom Section - Pushed securely to bottom */}
      <div className="mt-auto flex flex-col gap-4">
        {/* Capacity Progress Bar - Using a fixed structural layout */}
        <div className="w-full flex flex-col justify-end h-9">
          {occupancyPercent !== null ? (
            <>
              <div className="flex justify-between text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-px">
                <span>Registration Capacity</span>
                <span>{Math.round(occupancyPercent)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000"
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
            </>
          ) : (
            <div className="h-1.5 w-full" /> /* Invisible spacer to keep alignment if null */
          )}
        </div>

        {isParticipating ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 border border-success/20 p-3 text-sm font-bold text-success uppercase tracking-wide">
            <CheckCircle2 className="h-4 w-4" /> Participating
          </div>
        ) : (
          !hideActions && showJoin && (statusKey === "upcoming" || statusKey === "published") && registeredCount < (tournament.max_players ?? tournament.maxPlayers ?? 999) && (
            <button
              onClick={(e) => { e.stopPropagation(); onJoin?.(tournament); }}
              className="w-full flex items-center justify-center h-10 sm:h-11 bg-primary rounded-xl border border-transparent shadow-sm hover:opacity-90 transition-opacity text-primary-foreground font-semibold text-xs sm:text-sm uppercase tracking-wider mt-1"
            >
              Join Tournament
            </button>
          )
        )}

        {customActions && (
          <div className="grid grid-flow-row grid-cols-2 gap-2 pt-4 border-t border-border/60 mt-1">
            {customActions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
