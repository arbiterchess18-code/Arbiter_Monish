import { Calendar, MapPin, Users, Clock, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tournament } from "@/lib/mock-data";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  upcoming: "bg-info/15 text-info border-info/30",
  completed: "bg-muted text-muted-foreground border-border",
};

const typeColors: Record<string, string> = {
  Swiss: "bg-primary/10 text-primary",
  "Round Robin": "bg-accent/15 text-accent-foreground",
  Knockout: "bg-destructive/10 text-destructive",
  Blitz: "bg-warning/15 text-warning-foreground",
  Rapid: "bg-info/10 text-info",
  Classical: "bg-chess-dark/20 text-foreground",
};

interface TournamentCardProps {
  tournament: Tournament;
  index?: number;
  showJoin?: boolean;
  onJoin?: (tournament: Tournament) => void;
}

export function TournamentCard({ tournament, index = 0, showJoin, onJoin }: TournamentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="stat-card flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-lg truncate">{tournament.name}</h3>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className={statusColors[tournament.status]}>
              {tournament.status}
            </Badge>
            <Badge variant="secondary" className={typeColors[tournament.type]}>
              {tournament.type}
            </Badge>
            <Badge variant={tournament.rated ? "default" : "secondary"} className="text-[10px]">
              {tournament.rated ? "Rated" : "Unrated"}
            </Badge>
          </div>
        </div>
        {tournament.prizePool && (
          <div className="flex items-center gap-1 text-chess-gold font-semibold text-sm shrink-0">
            <Trophy className="h-4 w-4" />
            {tournament.prizePool}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {tournament.players}/{tournament.maxPlayers}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {tournament.timeControl}
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {tournament.startDate}
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {tournament.mode}
        </div>
      </div>

      {tournament.status === "active" && (
        <div className="mt-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Round {tournament.currentRound}/{tournament.rounds}</span>
            <span>{Math.round((tournament.currentRound / tournament.rounds) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(tournament.currentRound / tournament.rounds) * 100}%` }}
            />
          </div>
        </div>
      )}

      {showJoin && tournament.status === "upcoming" && tournament.players < tournament.maxPlayers && (
        <Button size="sm" className="mt-1 w-full" onClick={() => onJoin?.(tournament)}>
          Join Tournament
        </Button>
      )}
    </motion.div>
  );
}
