import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TournamentCard } from "@/components/TournamentCard";
import { Trophy, Swords, TrendingUp, BarChart3, Target, Zap, Award, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { mockTournaments, mockRatingHistory } from "@/lib/mock-data";
import { apiFetch } from "@/lib/api";

const PlayerDashboard = () => {
    const upcomingTournaments = mockTournaments.filter(t => t.status === "upcoming").slice(0, 3);
    const activeTournaments = mockTournaments.filter(t => t.status === "active");

    const [stats, setStats] = useState({});
    const [unlocked, setUnlocked] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const res = await apiFetch(`${import.meta.env.VITE_API_URL}/users/me/achievements`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.stats || {});
                    setUnlocked(data.unlocked || []);
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
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <PageHeader
                    title="Player Dashboard"
                    description="Welcome back, Champion! Here's your chess career at a glance."
                />
                <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                        PL
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-primary">Active Rank</p>
                        <p className="text-sm font-semibold">Candidate Master</p>
                    </div>
                </div>
            </div>

            {/* Primary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Current Rating" value={stats.current_rating || 0} icon={TrendingUp} delay={0} />
                <StatCard title="Total Matches" value={stats.total_matches || 0} icon={Swords} delay={0.1} />
                <StatCard title="Win Rate" value={`${stats.win_rate || 0}%`} icon={BarChart3} delay={0.2} trend={`${stats.total_wins} Wins`} trendUp={(stats.win_rate || 0) >= 50} />
                <StatCard title="Achievements" value={unlocked.length} icon={Award} delay={0.3} trend={`${8 - unlocked.length} Locked`} trendUp />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rating Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 stat-card overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 p-6">
                        <Target className="h-5 w-5 text-primary/20" />
                    </div>
                    <h2 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" /> Rating Progression
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={mockRatingHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis domain={["dataMin - 50", "dataMax + 50"]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "12px",
                                    fontSize: "13px",
                                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="rating"
                                stroke="hsl(var(--primary))"
                                strokeWidth={3}
                                dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Quick Actions / Tips */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-6 text-primary-foreground space-y-6 flex flex-col justify-between"
                >
                    <div>
                        <Zap className="h-10 w-10 mb-4 opacity-50" />
                        <h3 className="text-2xl font-bold leading-tight">Improve Your Game with Pro Tools</h3>
                        <p className="text-primary-foreground/80 mt-2 text-sm">
                            Use our built-in performance analytics to identify your weaknesses and prepare for your next opponent.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3 border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <Target className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium">Analyze Last Game</span>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3 border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <Trophy className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium">Browse Open Invitations</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Tournaments Participation */}
            <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold">Your Active Engagements</h2>
                {activeTournaments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeTournaments.map((t, i) => (
                            <TournamentCard key={t.id} tournament={t} index={i} />
                        ))}
                    </div>
                ) : (
                    <div className="p-12 rounded-3xl border border-dashed border-border text-center">
                        <p className="text-muted-foreground">You are not currently enrolled in any active tournaments.</p>
                    </div>
                )}
            </div>

            {/* Suggested for You */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-display font-bold">Suggested for You</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {upcomingTournaments.map((t, i) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-colors group cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">{t.type}</div>
                                <div className="text-xs text-muted-foreground">{t.startDate}</div>
                            </div>
                            <h4 className="font-bold group-hover:text-primary transition-colors">{t.name}</h4>
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{t.venue} • {t.mode}</p>
                            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                                <span className="text-sm font-semibold">{t.prizePool || "Medals"}</span>
                                <span className="text-xs text-primary font-bold">Join Now</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PlayerDashboard;
