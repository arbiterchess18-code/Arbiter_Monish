import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TournamentCard } from "@/components/TournamentCard";
import {
  PlusCircle,
  ClipboardList,
  Users,
  ShieldAlert,
  Settings,
  BarChart3,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { mockTournaments, mockOrbiterStats } from "@/lib/mock-data";

const ArbiterDashboard = () => {
  const navigate = useNavigate();
  const managedTournaments = mockTournaments
    .filter((t) => t.status === "active" || t.status === "upcoming")
    .slice(0, 2);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Arbiter Control Center"
          description="Professional-grade organization and fair play monitoring tools."
        />
        <Button
          onClick={() => navigate("/orbiter/create")}
          className="gap-2 rounded-full px-6 h-11"
        >
          <PlusCircle className="h-4 w-4" /> Create Tournament
        </Button>
      </div>

      {/* Management Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Managed Events"
          value={mockOrbiterStats.activeTournaments}
          icon={ClipboardList}
          delay={0}
          trend="2 Active Now"
        />
        <StatCard
          title="Ongoing Rounds"
          value={mockOrbiterStats.ongoingRounds}
          icon={Clock}
          delay={0.1}
          trend="Real-time monitoring"
        />
        <StatCard
          title="Pending Approvals"
          value={mockOrbiterStats.pendingRequests}
          icon={ShieldAlert}
          delay={0.2}
          trend="Needs attention"
          trendUp
        />
        <StatCard
          title="Total Matches"
          value={mockOrbiterStats.totalMatchesPlayed}
          icon={BarChart3}
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects / Tournaments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold">
              My Managed Tournaments
            </h2>
            <Button variant="link" onClick={() => navigate("/orbiter/manage")}>
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {managedTournaments.map((t, i) => (
              <TournamentCard key={t.id} tournament={t} index={i} />
            ))}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold">Quick Workflow</h2>
          <div className="stat-card p-4 space-y-3">
            <Button
              variant="secondary"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/orbiter/results")}
            >
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Submit Match Results
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/orbiter/requests")}
            >
              <Users className="h-4 w-4 text-blue-500" />
              Manage Player Requests
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/orbiter/stats")}
            >
              <Settings className="h-4 w-4 text-primary" />
              Arbiter Configuration
            </Button>
          </div>
        </div>
      </div>

      {/* Compliance & Monitoring Feed */}
      <section className="stat-card">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <h2 className="font-bold">Live Fair Play Monitoring</h2>
        </div>
        <div className="space-y-4">
          {[
            {
              time: "2 mins ago",
              event: "Anti-cheat check passed for Round 5 (Table 1)",
              icon: ShieldAlert,
              color: "text-green-500",
            },
            {
              time: "15 mins ago",
              event: "Manual result override needed for Tournament #12",
              icon: Settings,
              color: "text-amber-500",
            },
            {
              time: "1 hour ago",
              event: "New player request for 'Spring Invitational'",
              icon: Users,
              color: "text-blue-500",
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
            >
              <div
                className={`p-2 rounded-lg bg-background border border-border ${item.color}`}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.event}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {item.time}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ArbiterDashboard;
