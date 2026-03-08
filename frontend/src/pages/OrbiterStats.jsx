import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Swords, Trophy, Target, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";

const COLORS = ["hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--warning))"];

export default function OrbiterStats() {
  const [stats, setStats] = useState({
    totalMatches: 0,
    completedTournaments: 0,
    avgPlayers: 0,
    avgRating: 0,
    monthlyMatches: [],
    matchResults: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/tournaments/stats/overview`
      );

      if (!response.ok) throw new Error("Failed to fetch statistics");

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch statistics:", err);
      setError("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Tournament Statistics" description="Analytics across all managed tournaments" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader title="Tournament Statistics" description="Analytics across all managed tournaments" />
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-destructive text-center">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Tournament Statistics" description="Analytics across all managed tournaments" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Matches" value={stats.totalMatches} icon={Swords} delay={0} />
        <StatCard title="Completed" value={stats.completedTournaments} icon={Trophy} delay={0.1} />
        <StatCard title="Avg Players" value={stats.avgPlayers} icon={Target} delay={0.15} />
        <StatCard title="Avg Rating" value={stats.avgRating} icon={TrendingUp} delay={0.2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <h2 className="font-display font-semibold text-lg mb-4">Monthly Matches</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.monthlyMatches && stats.monthlyMatches.length > 0 ? stats.monthlyMatches : [{ month: "No data", matches: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Bar dataKey="matches" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
          <h2 className="font-display font-semibold text-lg mb-4">Result Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats.matchResults && stats.matchResults.length > 0 ? stats.matchResults : [{ result: "No matches", count: 0 }]}
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="count"
                label={({ result, percent }) => `${result} ${(percent * 100).toFixed(0)}%`}
              >
                {(stats.matchResults || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
