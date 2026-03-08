import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Trophy, Swords, Clock, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { TournamentCard } from "@/components/TournamentCard";
import { mockTournaments, mockOrbiterStats, mockOrganizerRequests } from "@/lib/mock-data";

export default function OrbiterDashboard() {
  const activeTournaments = mockTournaments.filter(t => t.status === "active");

  return (
    <div className="space-y-8">
      <PageHeader title="Arbiter Dashboard" description="Overview of all managed tournaments and activities" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tournaments" value={mockOrbiterStats.totalTournaments} icon={Trophy} delay={0} trend="+3 this month" trendUp />
        <StatCard title="Active Tournaments" value={mockOrbiterStats.activeTournaments} icon={Clock} delay={0.1} />
        <StatCard title="Ongoing Rounds" value={mockOrbiterStats.ongoingRounds} icon={Swords} delay={0.2} />
        <StatCard title="Pending Requests" value={mockOrbiterStats.pendingRequests} icon={Users} delay={0.3} trend="5 awaiting review" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display font-semibold text-lg">Active Tournaments</h2>
          {activeTournaments.map((t, i) => (
            <TournamentCard key={t.id} tournament={t} index={i} />
          ))}
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
          <h2 className="font-display font-semibold text-lg">Organizer Requests</h2>
          <div className="space-y-3">
            <div className="p-8 text-center border border-dashed rounded-xl border-border bg-muted/20">
              <p className="text-sm text-muted-foreground">No pending organizer requests.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
