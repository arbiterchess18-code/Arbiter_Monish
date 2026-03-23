import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TournamentCard } from "@/components/TournamentCard";
import {
  Trophy,
  Swords,
  TrendingUp,
  BarChart3,
  Target,
  Zap,
  CalendarCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { getMyTournaments } from "@/lib/tournament-service";
import { useNavigate } from "react-router-dom";

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsRes, tournamentsRes, myTourns] = await Promise.all([
          apiFetch(`${import.meta.env.VITE_API_URL}/users/me/player-stats`),
          apiFetch(`${import.meta.env.VITE_API_URL}/tournaments/public`),
          getMyTournaments(),
        ]);

        if (statsRes.ok) {
          setStats(await statsRes.json());
        }

        if (tournamentsRes.ok) {
          setTournaments(await tournamentsRes.json());
        }

        setMyTournaments(myTourns || []);
      } catch (error) {
        console.error("Failed to load player dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const normalizeTournament = (tournament) => ({
    ...tournament,
    id: tournament.tournament_id,
    name: tournament.tournament_name,
    pairingSystem: tournament.pairing_system,
    isRated: tournament.is_rated,
    timeControl: tournament.time_control,
    startDate: tournament.start_date,
    maxPlayers: tournament.max_players,
    currentRound: tournament.current_round,
    location: tournament.venue_name,
  });

  const upcomingTournaments = useMemo(
    () =>
      tournaments
        .filter((t) => t.status === "upcoming" || t.status === "published")
        .map(normalizeTournament)
        .slice(0, 3),
    [tournaments],
  );

  const activeTournaments = useMemo(
    () =>
      tournaments.filter((t) => t.status === "active").map(normalizeTournament),
    [tournaments],
  );

  const rankTitle = useMemo(() => {
    const rating = stats?.currentRating ?? 0;
    if (rating >= 2200) return "Candidate Master";
    if (rating >= 2000) return "Expert";
    if (rating >= 1800) return "Class A";
    if (rating >= 1600) return "Class B";
    if (rating >= 1400) return "Class C";
    return "Rising Player";
  }, [stats]);

  const userInitials = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("userData");
      if (!raw) return "PL";
      const parsed = JSON.parse(raw);
      const first = (parsed.firstName || "").trim();
      const last = (parsed.lastName || "").trim();
      const initials = `${first[0] || ""}${last[0] || ""}`.toUpperCase();
      return initials || "PL";
    } catch {
      return "PL";
    }
  }, []);

  const winPercent = stats?.winRate ?? 0;
  const wins = stats?.wins ?? 0;
  const draws = stats?.draws ?? 0;
  const losses = stats?.losses ?? 0;
  const totalMatches = stats?.totalMatches ?? 0;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Player Dashboard"
          description="Welcome back, Champion! Here's your chess career at a glance."
        />
        <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
            {userInitials}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-primary">
              Active Rank
            </p>
            <p className="text-sm font-semibold">
              {loading ? "Loading..." : rankTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Current Rating"
          value={loading ? "--" : (stats?.currentRating ?? 0)}
          icon={TrendingUp}
          delay={0}
        />
        <StatCard
          title="Total Matches"
          value={loading ? "--" : totalMatches}
          icon={Swords}
          delay={0.1}
        />
        <StatCard
          title="Wins"
          value={loading ? "--" : wins}
          icon={Target}
          delay={0.2}
        />
        <StatCard
          title="Win Rate"
          value={loading ? "--" : `${winPercent}%`}
          icon={BarChart3}
          delay={0.3}
        />
        <StatCard
          title="Tournaments"
          value={loading ? "--" : (stats?.totalTournaments ?? 0)}
          icon={Trophy}
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 stat-card overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-6">
            <Target className="h-5 w-5 text-primary/20" />
          </div>
          <h2 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Live Performance
            Summary
          </h2>
          <div className="space-y-4">
            {[
              { label: "Wins", value: wins, color: "bg-success" },
              { label: "Draws", value: draws, color: "bg-warning" },
              { label: "Losses", value: losses, color: "bg-destructive" },
            ].map((item) => {
              const ratio =
                totalMatches > 0 ? (item.value / totalMatches) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">
                      {item.value} ({Math.round(ratio)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-700`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-6 text-primary-foreground space-y-6 flex flex-col justify-between"
        >
          <div>
            <Zap className="h-10 w-10 mb-4 opacity-50" />
            <h3 className="text-2xl font-bold leading-tight">
              Improve Your Game with Pro Tools
            </h3>
            <p className="text-primary-foreground/80 mt-2 text-sm">
              Use our built-in performance analytics to identify your weaknesses
              and prepare for your next opponent.
            </p>
          </div>
          <div className="space-y-3">
            <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3 border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Target className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Analyze Last Game</span>
            </div>
            <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3 border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Trophy className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">
                Browse Open Invitations
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-display font-bold">My Events</h2>
          {myTournaments.length > 0 && (
            <span className="ml-1 text-xs bg-primary/10 text-primary font-semibold rounded-full px-2 py-0.5">
              {myTournaments.length}
            </span>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[240px] rounded-xl bg-muted/30 animate-pulse"
              />
            ))}
          </div>
        ) : myTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {myTournaments.map((t, i) => (
              <div
                key={t.tournament_id}
                className="cursor-pointer h-full"
                onClick={() => navigate(`/tournament/${t.tournament_id}`)}
              >
                <TournamentCard
                  tournament={t}
                  index={i}
                  isParticipating
                  hideActions
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 rounded-2xl border border-dashed border-border text-center text-muted-foreground">
            <CalendarCheck className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              You haven&apos;t joined any tournaments yet.
            </p>
            <p className="text-sm mt-1">
              Browse the Tournaments page to find and register.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold">
          Your Active Engagements
        </h2>
        {activeTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {activeTournaments.map((t, i) => (
              <TournamentCard key={t.id} tournament={t} index={i} />
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-3xl border border-dashed border-border text-center">
            <p className="text-muted-foreground">
              No active tournaments are available right now.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold">Suggested for You</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {upcomingTournaments.map((t, i) => (
            <motion.div
              key={t.tournament_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-colors group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">
                  {t.pairing_system || t.event_type || "Open"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.start_date || "TBA"}
                </div>
              </div>
              <h4 className="font-bold group-hover:text-primary transition-colors">
                {t.tournament_name}
              </h4>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                {t.venue_name || "Venue TBA"} •{" "}
                {t.is_private ? "Private" : "Public"}
              </p>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {t.entry_fee ? `Entry: ${t.entry_fee}` : "Free Entry"}
                </span>
                <span className="text-xs text-primary font-bold">Join Now</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerDashboard;
