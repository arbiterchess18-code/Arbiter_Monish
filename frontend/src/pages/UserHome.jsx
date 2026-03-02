import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/StatCard";
import { TournamentCard } from "@/components/TournamentCard";
import { JoinTournamentDialog } from "@/components/JoinTournamentDialog";
import {
  Trophy, Users, DollarSign, ArrowRight, ShieldCheck,
  BarChart4, Zap, Globe, Github
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { mockTournaments } from "@/lib/mock-data";

export default function UserHome() {
  const navigate = useNavigate();
  const [joinTournament, setJoinTournament] = useState(null);
  const upcomingTournaments = mockTournaments.slice(0, 2);

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 p-8 md:p-12 lg:p-16">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-72 h-72 bg-primary/5 rounded-full blur-[80px]" />

        <div className="relative max-w-3xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase text-primary bg-primary/10 rounded-full mb-4">
              Version 2.4 Now Live
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-tight">
              The Modern Standard for <br />
              <span className="text-primary italic">Chess Management</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground leading-relaxed md:w-5/6"
          >
            A professional platform for organizers and players. Create, manage, and compete in tournaments with professional-grade tools and fair play monitoring.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap gap-4 pt-4"
          >
            <Button size="lg" className="rounded-full px-8 gap-2 group" onClick={() => navigate("/tournaments")}>
              Browse Tournaments <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8">
              Learn More
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Tournaments"
          value="3"
          icon={Trophy}
          delay={0.1}
          trend="+12% this month"
          trendUp
        />
        <StatCard
          title="Active Players"
          value="302"
          icon={Users}
          delay={0.2}
          trend="+48 new this week"
          trendUp
        />
        <StatCard
          title="Total Prize Pool"
          value="$12.4k"
          icon={DollarSign}
          delay={0.3}
          trend="Across all events"
        />
      </div>

      {/* Features Section */}
      <section className="space-y-8 pt-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-bold">Professional Tournament Management</h2>
          <p className="text-muted-foreground">Everything you need to organize, manage, and compete in world-class chess tournaments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Swiss & Round Robin",
              desc: "Industry-standard pairing algorithms for fair matches",
              icon: Zap,
              color: "bg-blue-500/10 text-blue-500"
            },
            {
              title: "Real-time Pairings",
              desc: "Instant pairing generation and score updates",
              icon: BarChart4,
              color: "bg-green-500/10 text-green-500"
            },
            {
              title: "FIDE Compliance",
              desc: "Strict adherence to international chess regulations",
              icon: ShieldCheck,
              color: "bg-purple-500/10 text-purple-500"
            },
            {
              title: "Performance Analytics",
              desc: "Detailed rating changes and performance tracking",
              icon: Globe,
              color: "bg-orange-500/10 text-orange-500"
            }
          ].map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Upcoming Highlight */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold">Featured Tournaments</h2>
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/tournaments")}>
            View All <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingTournaments.map((t, i) => (
            <TournamentCard key={t.id} tournament={t} index={i} showJoin onJoin={setJoinTournament} />
          ))}
        </div>
      </div>

      {/* About Section (Additional Info) */}
      <section className="p-8 md:p-12 rounded-3xl bg-secondary/50 border border-border flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold">Built for the Chess Community</h2>
          <p className="text-muted-foreground leading-relaxed">
            ChessMgr is an open-source initiative dedicated to digitalizing local and international chess circuits. We focus on providing low-latency scoreboards and anti-cheat integrations for both online and hybrid events.
          </p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Github className="h-4 w-4" /> Open Source
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-green-500">
              <Zap className="h-4 w-4" /> Fast & Scalable
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/3 aspect-video md:aspect-square rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden relative group">
          <img
            src="https://images.unsplash.com/photo-1528819622765-d6bcf132f793?q=80&w=1000&auto=format&fit=crop"
            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
            alt="Chess"
          />
          <div className="relative z-10 p-6 text-center">
            <span className="text-primary font-bold">Join the Network</span>
            <p className="text-xs text-muted-foreground mt-1">500+ Clubs trust us</p>
          </div>
        </div>
      </section>

      <JoinTournamentDialog
        tournament={joinTournament}
        open={!!joinTournament}
        onOpenChange={(open) => !open && setJoinTournament(null)}
      />
    </div>
  );
}

