import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Trophy, Swords, Target, TrendingUp, Zap, Award, Crown, Star, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";

const COLORS = [
  "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))",
  "hsl(var(--primary))", "hsl(var(--chess-gold))", "hsl(var(--muted-foreground))",
];

const ACHIEVEMENTS_DATA = [
  { title: "Blitz King", icon: Zap, desc: "Win 10 blitz games" },
  { title: "Rapid Master", icon: Target, desc: "Win 10 rapid games" },
  { title: "Streak Master", icon: Star, desc: "Achieve 5 total wins" },
  { title: "Endgame Specialist", icon: Target, desc: "Win 20 games overall" },
  { title: "Classical Specialist", icon: Crown, desc: "Play 50 classical games" },
  { title: "Tournament Champion", icon: Trophy, desc: "Win 30 total games" },
  { title: "Iron Draw", icon: Award, desc: "Draw 10 match games" },
  { title: "Rating Climber", icon: TrendingUp, desc: "Achieve rating > 1500" },
];

export default function UserDashboard() {
  const [unlocked, setUnlocked] = useState([]);
  const [stats, setStats] = useState({});
  const [ratingHistory, setRatingHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [achRes, profRes] = await Promise.all([
          apiFetch(`${import.meta.env.VITE_API_URL}/users/me/achievements`),
          apiFetch(`${import.meta.env.VITE_API_URL}/users/me`)
        ]);

        if (achRes.ok) {
          const achData = await achRes.json();
          setUnlocked(achData.unlocked || []);
          setStats(achData.stats || {});
        }

        if (profRes.ok) {
          const profData = await profRes.json();
          setRatingHistory(profData.rating_history || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rawColorPerf = [
    { name: "White Wins", value: stats.white_wins || 0 },
    { name: "White Draws", value: stats.white_draws || 0 },
    { name: "White Losses", value: stats.white_losses || 0 },
    { name: "Black Wins", value: stats.black_wins || 0 },
    { name: "Black Draws", value: stats.black_draws || 0 },
    { name: "Black Losses", value: stats.black_losses || 0 },
  ];

  const displayColorPerf = rawColorPerf.some(c => c.value > 0) ? rawColorPerf.filter(c => c.value > 0) : [{ name: "No Data", value: 1 }];

  return (
    <div className="space-y-8">
      <PageHeader title="My Dashboard" description="Your complete chess performance overview" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Matches Played" value={stats.total_matches || 0} icon={Swords} delay={0} />
        <StatCard title="Wins" value={stats.total_wins || 0} icon={Trophy} delay={0.1} trend={`${stats.win_rate || 0}% win rate`} trendUp />
        <StatCard title="Current Rating" value={stats.current_rating || 0} icon={TrendingUp} delay={0.2} />
        <StatCard title="Tournaments" value={stats.tournaments_played || 0} icon={Target} delay={0.25} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 stat-card">
          <h2 className="font-display font-semibold text-lg mb-4">Rating Progression</h2>
          <ResponsiveContainer width="100%" height={250}>
            {ratingHistory.length > 0 ? (
              <LineChart data={ratingHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis domain={["dataMin - 30", "dataMax + 30"]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
              </LineChart>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                No rating history available yet
              </div>
            )}
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
          <h2 className="font-display font-semibold text-lg mb-4">Color Performance</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={displayColorPerf} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {displayColorPerf.map((_, i) => <Cell key={i} fill={displayColorPerf[0].name === "No Data" ? "hsl(var(--muted))" : COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 text-[11px] mt-2">
            {displayColorPerf[0].name !== "No Data" && displayColorPerf.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground truncate">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <h2 className="font-display font-semibold text-lg mb-4">Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ACHIEVEMENTS_DATA.filter((a) => unlocked.includes(a.title)).length > 0 ? (
            ACHIEVEMENTS_DATA.filter((a) => unlocked.includes(a.title)).map((a) => (
              <div key={a.title} className="stat-card text-center py-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center chess-gradient text-primary-foreground">
                  <a.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium">{a.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{a.desc}</p>
                <Badge className="mt-1.5 text-[9px] bg-success/15 text-success border-0">Earned</Badge>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center border rounded-xl border-dashed">
              <p className="text-sm text-muted-foreground">No achievements unlocked yet. Keep playing!</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
