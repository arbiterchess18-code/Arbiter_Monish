import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Trophy, Swords, Clock, Users, Calendar, MapPin, ChevronRight, Edit, Trash2, Globe, Settings, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getArbiterTournaments } from "@/lib/tournament-service";
import { mockOrbiterStats, mockOrganizerRequests } from "@/lib/mock-data";

export default function OrbiterDashboard() {
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await getArbiterTournaments();
        if (Array.isArray(data)) {
          const filtered = data.filter(t => t.status === "active" || t.status === "upcoming");
          setActiveTournaments(filtered);
        }
      } catch (error) {
        console.error("Failed to fetch arbiter tournaments", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4 mb-6 border-border/60">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Arbiter Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Bento Grid View: High-density tournament administration.</p>
        </div>
        <Button className="rounded-none font-semibold">
          Create Tournament
        </Button>
      </div>

      {/* Bento Grid Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Total Managed", val: mockOrbiterStats.totalTournaments, icon: Trophy },
          { title: "Active Now", val: mockOrbiterStats.activeTournaments, icon: Clock },
          { title: "Ongoing Matches", val: mockOrbiterStats.ongoingRounds, icon: Swords },
          { title: "Pending Requests", val: mockOrbiterStats.pendingRequests, icon: Users },
        ].map((stat, idx) => (
          <div key={idx} className="bg-card border-2 border-border p-4 rounded-md shadow-none flex flex-col justify-between hover:border-foreground transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</span>
              <stat.icon className="h-4 w-4 text-foreground" />
            </div>
            <div className="text-3xl font-display font-black mt-4">{stat.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Tournaments Bento Box */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-border pb-2">
            <h2 className="font-display font-bold text-lg uppercase tracking-wide">Tournament Operations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground border-2 rounded-md border-border bg-muted/10 md:col-span-2">
                <Loader2 className="h-6 w-6 animate-spin gap-2" /> Loading data...
              </div>
            ) : activeTournaments.length > 0 ? (
              activeTournaments.map((t, i) => (
                <div
                  key={t.id ?? t.tournament_id}
                  className="bg-card border-2 border-border p-0 rounded-md shadow-none overflow-hidden hover:border-foreground transition-all flex flex-col"
                >
                  {/* Left Info Box */}
                  <div className="p-4 flex-1 border-b-2 border-border bg-muted/5">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-base tracking-tight">{t.name ?? t.tournament_name}</h3>
                      <Badge variant="outline" className={`rounded-none text-[10px] px-1.5 py-0 uppercase font-black border-2 ${t.status === "upcoming" ? "border-info text-info bg-info/10" : "border-success text-success bg-success/10"}`}>
                        {t.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-xs font-medium text-foreground/80 mt-3">
                      <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{t.start_date ?? t.date ?? "TBA"}</div>
                      <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{t.registered_count ?? t.players ?? 0}/{t.max_players ?? "∞"}</div>
                      <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{t.venue_name ?? t.city ?? t.mode ?? "Online"}</div>
                      <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{t.time_control || "Standard"}</div>
                    </div>
                  </div>

                  {/* Dense Action Buttons Box */}
                  <div className="grid grid-cols-2 divide-x-2 divide-y-2 border-t-2 border-border font-medium">
                    <Button variant="ghost" size="sm" className="rounded-none h-auto py-2.5 justify-center px-2 hover:bg-muted text-[10px] uppercase border-b-2 border-transparent" asChild>
                      <Link to={`/orbiter/manage/${t.id ?? t.tournament_id}`}>
                        <Settings className="h-3.5 w-3.5 mr-1" /> Manage
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-none h-auto py-2.5 justify-center px-2 hover:bg-muted text-[10px] uppercase text-blue-600 hover:text-blue-700 border-b-2 border-transparent">
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-none h-auto py-2.5 justify-center px-2 hover:bg-muted text-[10px] uppercase text-green-600 hover:text-green-700">
                      <Globe className="h-3.5 w-3.5 mr-1" /> Publish
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-none h-auto py-2.5 justify-center px-2 hover:bg-destructive/10 text-[10px] uppercase text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center border-2 border-dashed rounded-md border-border bg-muted/10 font-medium md:col-span-2">
                No active or upcoming tournaments found.
              </div>
            )}
          </div>
        </div>

        {/* Requests Bento Box */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-border pb-2">
            <h2 className="font-display font-bold text-lg uppercase tracking-wide">Pending Requests</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-8 text-center border-2 border-dashed rounded-md border-border bg-muted/10">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Empty Queue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
