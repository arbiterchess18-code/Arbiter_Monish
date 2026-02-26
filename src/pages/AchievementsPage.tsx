import { PageHeader } from "@/components/PageHeader";
import { Zap, Target, Crown, Trophy, Star, Award, Flame, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const achievements = [
  { title: "Blitz King", icon: Zap, earned: true, desc: "Win 10 blitz games in a row", date: "2026-01-15" },
  { title: "Rapid Master", icon: Target, earned: true, desc: "Win a rapid tournament", date: "2026-02-10" },
  { title: "Streak Master", icon: Star, earned: true, desc: "Achieve 5 consecutive wins", date: "2025-12-20" },
  { title: "Endgame Specialist", icon: Flame, earned: true, desc: "Win 10 endgames with minor pieces", date: "2025-11-08" },
  { title: "Classical Specialist", icon: Crown, earned: false, desc: "Play 50 classical games", progress: "32/50" },
  { title: "Tournament Champion", icon: Trophy, earned: false, desc: "Win a tournament outright", progress: "Best: 2nd" },
  { title: "Iron Draw", icon: Shield, earned: false, desc: "Draw against 3 titled players", progress: "1/3" },
  { title: "Rating Climber", icon: Award, earned: false, desc: "Gain 200 rating points in a season", progress: "+118" },
];

export default function AchievementsPage() {
  const earned = achievements.filter(a => a.earned);
  const locked = achievements.filter(a => !a.earned);

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
