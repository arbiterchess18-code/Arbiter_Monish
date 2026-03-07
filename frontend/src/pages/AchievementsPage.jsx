import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Zap, Target, Crown, Trophy, Star, Award, Flame, Shield, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

const ACHIEVEMENTS_DATA = [
  { title: "Blitz King", icon: Zap, desc: "Win 10 blitz games", date: "Recent", progressFn: (s) => `${s.blitz_wins || 0}/10` },
  { title: "Rapid Master", icon: Target, desc: "Win 10 rapid games", date: "Recent", progressFn: (s) => `${s.rapid_wins || 0}/10` },
  { title: "Streak Master", icon: Star, desc: "Achieve 5 total wins", date: "Recent", progressFn: (s) => `${s.total_wins || 0}/5` },
  { title: "Endgame Specialist", icon: Flame, desc: "Win 20 games overall", date: "Recent", progressFn: (s) => `${s.total_wins || 0}/20` },
  { title: "Classical Specialist", icon: Crown, desc: "Play 50 classical games", progressFn: (s) => `${s.classical_games || 0}/50` },
  { title: "Tournament Champion", icon: Trophy, desc: "Win 30 total games", progressFn: (s) => `${s.total_wins || 0}/30` },
  { title: "Iron Draw", icon: Shield, desc: "Draw 10 match games", progressFn: (s) => `${s.total_draws || 0}/10` },
  { title: "Rating Climber", icon: Award, desc: "Achieve rating > 1500", progressFn: () => "Rating > 1500" },
];

export default function AchievementsPage() {
  const [unlocked, setUnlocked] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAchievements() {
      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL}/users/me/achievements`);
        if (res.ok) {
          const data = await res.json();
          setUnlocked(data.unlocked || []);
          setStats(data.stats || {});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAchievements();
  }, []);

  const achievements = ACHIEVEMENTS_DATA.map(a => {
    const isEarned = unlocked.includes(a.title);
    return {
      ...a,
      earned: isEarned,
      progress: isEarned ? null : a.progressFn(stats)
    };
  });

  const earned = achievements.filter(a => a.earned);
  const locked = achievements.filter(a => !a.earned);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Achievements" description={`${earned.length} of ${achievements.length} unlocked`} />

      <div>
        <h2 className="font-display font-semibold text-lg mb-4">Unlocked</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {earned.map((a, i) => (
            <motion.div key={a.title} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="stat-card text-center py-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full chess-gradient flex items-center justify-center">
                <a.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold">{a.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
              <Badge className="mt-2 bg-success/15 text-success border-0 text-[10px]">{a.date}</Badge>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display font-semibold text-lg mb-4">Locked</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {locked.map((a, i) => (
            <motion.div key={a.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.08 }} className="stat-card text-center py-6 opacity-50">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <a.icon className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold">{a.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
              <Badge variant="outline" className="mt-2 text-[10px]">{a.progress}</Badge>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
