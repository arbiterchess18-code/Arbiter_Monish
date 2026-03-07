import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Trophy, Swords, TrendingUp, Target, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { TournamentCard } from "@/components/TournamentCard";
import { JoinTournamentDialog } from "@/components/JoinTournamentDialog";
import { ClubsTicker } from "@/components/ClubsTicker";
import {
  mockOrbiterPlayingStats,
  mockTournaments,
  mockRatingHistory,
} from "@/lib/mock-data";

export default function OrbiterPlayingDashboard() {
  const [joinTournament, setJoinTournament] = useState(null);
  const stats = mockOrbiterPlayingStats;
  const upcomingTournaments = mockTournaments.filter(
    (t) => t.status === "upcoming" || t.status === "active",
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Playing Dashboard"
        description="Your personal competitive performance as a player"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Rating"
          value={stats.currentRating}
          icon={TrendingUp}
          delay={0}
        />
        <StatCard
          title="Matches Played"
          value={stats.totalMatches}
          icon={Swords}
          delay={0.1}
        />
        <StatCard
          title="Win Rate"
          value={`${Math.round((stats.wins / stats.totalMatches) * 100)}%`}
          icon={BarChart3}
          delay={0.15}
        />
        <StatCard
          title="Tournaments Played"
          value={stats.totalTournaments}
          icon={Trophy}
          delay={0.2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 stat-card"
        >
          <h2 className="font-display font-semibold text-lg mb-4">
            Rating Progression
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mockRatingHistory}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                domain={["dataMin - 30", "dataMax + 30"]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="stat-card"
        >
          <h2 className="font-display font-semibold text-lg mb-4">
            Performance
          </h2>
          <div className="space-y-4">
            {[
              {
                label: "Wins",
                value: stats.wins,
                total: stats.totalMatches,
                color: "bg-success",
              },
              {
                label: "Draws",
                value: stats.draws,
                total: stats.totalMatches,
                color: "bg-warning",
              },
              {
                label: "Losses",
                value: stats.losses,
                total: stats.totalMatches,
                color: "bg-destructive",
              },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-medium">
                    {stat.value} ({Math.round((stat.value / stat.total) * 100)}
                    %)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stat.color} rounded-full transition-all duration-700`}
                    style={{ width: `${(stat.value / stat.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="space-y-4">
        <h2 className="font-display font-semibold text-lg">
          Tournaments to Join
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingTournaments.slice(0, 4).map((t, i) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              index={i}
              showJoin
              onJoin={setJoinTournament}
            />
          ))}
        </div>
      </div>

      <JoinTournamentDialog
        tournament={joinTournament}
        open={!!joinTournament}
        onOpenChange={(open) => !open && setJoinTournament(null)}
      />

      <ClubsTicker />
    </div>
  );
}
