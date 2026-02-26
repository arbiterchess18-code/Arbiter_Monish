import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { mockOrbiterStats } from "@/lib/mock-data";
import { Swords, Trophy, Target, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";

const matchDist = [
  { result: "White Wins", count: 145 },
  { result: "Black Wins", count: 128 },
  { result: "Draws", count: 92 },
];
const COLORS = ["hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--warning))"];

const monthlyData = [
  { month: "Sep", matches: 68 },
  { month: "Oct", matches: 92 },
  { month: "Nov", matches: 115 },
  { month: "Dec", matches: 78 },
  { month: "Jan", matches: 134 },
  { month: "Feb", matches: 155 },
];

export default function OrbiterStats() {
  return (
    <div className="space-y-8">
      <PageHeader title="Tournament Statistics" description="Analytics across all managed tournaments" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Matches" value={mockOrbiterStats.totalMatchesPlayed} icon={Swords} delay={0} />
        <StatCard title="Completed" value={mockOrbiterStats.completedTournaments} icon={Trophy} delay={0.1} />
        <StatCard title="Avg Players" value={35} icon={Target} delay={0.15} />
        <StatCard title="Avg Rating" value={2120} icon={TrendingUp} delay={0.2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <h2 className="font-display font-semibold text-lg mb-4">Monthly Matches</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
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
              <Pie data={matchDist} innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="count" label={({ result, percent }) => `${result} ${(percent * 100).toFixed(0)}%`}>
                {matchDist.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
