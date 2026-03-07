import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Swords, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClubsTicker } from "@/components/ClubsTicker";

const roleCards = [
  {
    title: "For Players",
    desc: "Join tournaments, track pairings, submit results, and build your performance history in one place.",
    icon: Swords,
  },
  {
    title: "For Arbiters",
    desc: "Run fair events with structured rounds, live standings, controlled workflows, and clear reporting.",
    icon: Trophy,
  },
  {
    title: "For Organizations",
    desc: "Create branded circuits, manage registrations, and coordinate tournament operations at scale.",
    icon: Users,
  },
];

const steps = [
  "Create your account and choose your role.",
  "Join or organize tournaments with guided workflows.",
  "Follow live pairings, progress, and final standings.",
  "Build a trusted competitive profile over time.",
];

const chessPieces = ["♔", "♕", "♖", "♗", "♘", "♙"];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.22),transparent_48%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.16),transparent_42%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="space-y-6"
            >
              <p className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                Chess Orbiter Platform
              </p>
              <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
                One Arena for Players, Arbiters, and Organizers
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Chess Orbiter is a complete tournament platform that simplifies
                registrations, pairings, match operations, and result tracking.
                Start from one secure dashboard and scale to club-level or
                championship-level events.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate("/login")} className="gap-2">
                  Enter Platform <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/login")}>
                  Explore Features
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="rounded-3xl border border-border bg-card/70 p-6 backdrop-blur-sm"
            >
              <h2 className="mb-4 font-display text-2xl font-bold">
                How It Works
              </h2>
              <ol className="space-y-3">
                {steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-sm text-muted-foreground md:text-base">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-2xl border border-border bg-background/70 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Chess Identity
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {chessPieces.map((piece, index) => (
                    <div
                      key={`${piece}-${index}`}
                      className="flex h-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xl text-primary"
                    >
                      {piece}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <div className="mb-7 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            Built for Every Chess Role
          </h2>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 md:inline-flex">
            <ShieldCheck className="h-4 w-4" /> Secure Access Control
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {roleCards.map((card, index) => (
            <motion.button
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index }}
              onClick={() => navigate("/login")}
              className="group rounded-2xl border border-border bg-card p-6 text-left transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{card.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {card.desc}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary">
                Login to Continue
              </p>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 md:px-8 md:pb-10">
        <div className="rounded-3xl border border-border bg-gradient-to-r from-primary/15 via-background to-accent/20 p-6 md:p-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h3 className="font-display text-2xl font-bold">
                Ready to Enter the Arena?
              </h3>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                Every path in the platform is protected. Sign in to register for
                tournaments, manage operations, or track your chess journey.
              </p>
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="w-full md:w-auto"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </section>

      <ClubsTicker />
    </div>
  );
}
