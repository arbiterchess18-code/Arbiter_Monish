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
            {mockOrganizerRequests.map(req => (
              <div key={req.id} className="stat-card space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{req.name}</p>
                    <p className="text-xs text-muted-foreground">{req.tournament}</p>
                  </div>
                  <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/30 text-[10px]">
                    Pending
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="default" className="flex-1 h-8 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
