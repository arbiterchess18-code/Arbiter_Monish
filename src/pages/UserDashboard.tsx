import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { mockUserStats, mockRatingHistory, mockMatchHistory } from "@/lib/mock-data";
import { Trophy, Swords, Target, TrendingUp, Zap, Award, Crown, Star } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const colorPerf = [
  { name: "White Wins", value: 20 },
  { name: "White Draws", value: 12 },
  { name: "White Losses", value: 7 },
  { name: "Black Wins", value: 14 },
  { name: "Black Draws", value: 10 },
  { name: "Black Losses", value: 15 },
];

const COLORS = [
  "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))",
  "hsl(var(--primary))", "hsl(var(--chess-gold))", "hsl(var(--muted-foreground))",
];

const achievements = [
  { title: "Blitz King", icon: Zap, earned: true, desc: "Win 10 blitz games" },
  { title: "Rapid Master", icon: Target, earned: true, desc: "Win a rapid tournament" },
  { title: "Classical Specialist", icon: Crown, earned: false, desc: "Play 50 classical games" },
  { title: "Tournament Champion", icon: Trophy, earned: false, desc: "Win a tournament" },
  { title: "Streak Master", icon: Star, earned: true, desc: "5 consecutive wins" },
  { title: "Iron Draw", icon: Award, earned: false, desc: "Draw 3 GMs" },
];

export default function UserDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader title="My Dashboard" description="Your complete chess performance overview" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Matches Played" value={mockUserStats.totalMatches} icon={Swords} delay={0} />
        <StatCard title="Wins" value={mockUserStats.wins} icon={Trophy} delay={0.1} trend={`${Math.round((mockUserStats.wins / mockUserStats.totalMatches) * 100)}% win rate`} trendUp />
        <StatCard title="Current Rating" value={mockUserStats.currentRating} icon={TrendingUp} delay={0.2} />
        <StatCard title="Tournaments" value={mockUserStats.totalTournaments} icon={Target} delay={0.25} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 stat-card">
          <h2 className="font-display font-semibold text-lg mb-4">Rating Progression</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mockRatingHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis domain={["dataMin - 30", "dataMax + 30"]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
          <h2 className="font-display font-semibold text-lg mb-4">Color Performance</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={colorPerf} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {colorPerf.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 text-[11px] mt-2">
            {colorPerf.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-muted-foreground truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <h2 className="font-display font-semibold text-lg mb-4">Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {achievements.map((a) => (
            <div key={a.title} className={`stat-card text-center py-4 ${!a.earned ? "opacity-40" : ""}`}>
              <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${a.earned ? "chess-gradient text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium">{a.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{a.desc}</p>
              {a.earned && <Badge className="mt-1.5 text-[9px] bg-success/15 text-success border-0">Earned</Badge>}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
