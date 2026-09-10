import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Play,
  Flag,
  RotateCcw,
  Trophy,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Clock,
  X,
  ShieldAlert,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function PairingSettingsFloatingButton({
  tournament,
  isArbiter,
  selectedRound,
  setSelectedRound,
  availableRounds,
  actualCurrentRound,
  isCurrentRoundSubmitted,
  isSelectedRoundSubmitted,
  actualIncompleteMatches,
  incompleteMatches,
  generatingPairings,
  canGenerateNextRound,
  isFinalRound,
  permissions,
  onGenerateNextRound,
  onFinalizeRound,
  onRegeneratePairings,
  onCompleteTournament,
  onRefresh,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  density,
  setDensity,
  highlightPending,
  setHighlightPending,
  autoRefreshInterval,
  setAutoRefreshInterval,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto refresh timer
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;
    const timer = setInterval(() => {
      onRefresh?.();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, onRefresh]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const hasPendingMatches = incompleteMatches > 0;

  // Options list for the vertical Antigravity dock
  const menuOptions = [
    // 1. Complete Tournament (if final round ready)
    ...(isFinalRound && isCurrentRoundSubmitted && permissions?.canCompleteTournament
      ? [
          {
            id: "complete",
            label: "Complete Tournament",
            icon: Trophy,
            color: "text-amber-400 hover:text-amber-300 hover:bg-amber-400/20",
            onClick: () => setShowCompleteConfirm(true),
          },
        ]
      : []),

    // 2. Generate Next Round
    ...(isArbiter && tournament?.status === "active" && actualCurrentRound < (tournament?.rounds || 100)
      ? [
          {
            id: "generate",
            label:
              actualCurrentRound === 0
                ? "Generate Round 1"
                : `Generate Round ${actualCurrentRound + 1}`,
            icon: Play,
            color: canGenerateNextRound
              ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/20"
              : "text-muted-foreground opacity-50 cursor-not-allowed",
            disabled: !canGenerateNextRound || generatingPairings,
            onClick: () => {
              if (canGenerateNextRound && !generatingPairings) {
                setShowGenerateConfirm(true);
              }
            },
          },
        ]
      : []),

    // 3. Finalize Current Round
    ...(isArbiter && tournament?.status === "active" && actualCurrentRound > 0
      ? [
          {
            id: "finalize",
            label: isSelectedRoundSubmitted
              ? `Round ${selectedRound} Finalized ✓`
              : `Finalize Round ${selectedRound} Results`,
            icon: Flag,
            color: isSelectedRoundSubmitted
              ? "text-muted-foreground opacity-60"
              : incompleteMatches === 0
                ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/20"
                : "text-amber-400 hover:text-amber-300 hover:bg-amber-400/20",
            disabled: isSelectedRoundSubmitted || incompleteMatches > 0 || generatingPairings,
            onClick: () => {
              if (!isSelectedRoundSubmitted && incompleteMatches === 0 && !generatingPairings) {
                setShowFinalizeConfirm(true);
              }
            },
          },
        ]
      : []),

    // 4. Regenerate Pairings
    ...(permissions?.canRegeneratePairings && !isCurrentRoundSubmitted && incompleteMatches > 0
      ? [
          {
            id: "regenerate",
            label: `Regenerate Round ${actualCurrentRound} Pairings`,
            icon: RotateCcw,
            color: "text-rose-400 hover:text-rose-300 hover:bg-rose-400/20",
            onClick: () => setShowRegenerateConfirm(true),
          },
        ]
      : []),

    // 5. Print Pairings
    {
      id: "print",
      label: "Print Pairings Sheet",
      icon: Printer,
      color: "text-blue-400 hover:text-blue-300 hover:bg-blue-400/20",
      onClick: () => {
        setTimeout(() => window.print(), 100);
      },
    },

    // 6. Refresh Pairings
    {
      id: "refresh",
      label: "Refresh Pairings",
      icon: RefreshCw,
      color: "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/20",
      className: isRefreshing ? "animate-spin" : "",
      onClick: handleManualRefresh,
    },

    // 7. Toggle Compact / Normal View
    {
      id: "density",
      label: density === "compact" ? "Standard View" : "Compact View",
      icon: Layers,
      color: "text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/20",
      onClick: () => setDensity?.(density === "compact" ? "normal" : "compact"),
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center select-none">
        {/* Antigravity Upward Expanding Dock */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0, y: 15 }}
              animate={{ opacity: 1, scaleY: 1, y: 0 }}
              exit={{ opacity: 0, scaleY: 0, y: 15 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: "bottom center" }}
              className="mb-3 flex flex-col items-center gap-1.5 p-2 rounded-full border border-border/70 bg-card/90 backdrop-blur-2xl shadow-2xl ring-1 ring-white/10"
            >
              {menuOptions.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{
                      duration: 0.2,
                      delay: (menuOptions.length - 1 - index) * 0.03,
                    }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={item.onClick}
                          disabled={item.disabled}
                          className={`flex items-center justify-center h-11 w-11 rounded-full transition-all duration-200 ${
                            item.color || "text-foreground hover:bg-muted"
                          } ${item.disabled ? "cursor-not-allowed opacity-40" : "active:scale-95"}`}
                          aria-label={item.label}
                        >
                          <IconComponent className={`h-5 w-5 ${item.className || ""}`} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        sideOffset={12}
                        className="bg-card/95 backdrop-blur-md border border-border/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xl rounded-lg"
                      >
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anchored Main Trigger Button with Slow Continuous Rotation */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsOpen((prev) => !prev)}
              className={`relative flex items-center justify-center h-14 w-14 rounded-full shadow-2xl transition-all duration-300 ${
                isOpen
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/30"
                  : "bg-gradient-to-tr from-emerald-600 via-primary to-emerald-500 text-white shadow-primary/40 ring-2 ring-white/20 hover:shadow-primary/60"
              }`}
              aria-label="Toggle Pairing Operations"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                  className="flex items-center justify-center"
                >
                  <Settings className="h-6 w-6" />
                </motion.div>
              )}

              {/* Status Indicator Badge */}
              {!isOpen && incompleteMatches > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black ring-2 ring-background animate-pulse">
                  {incompleteMatches > 99 ? "99+" : incompleteMatches}
                </span>
              )}

              {!isOpen && incompleteMatches === 0 && actualCurrentRound > 0 && !isSelectedRoundSubmitted && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-background text-[11px] font-bold">
                  ✓
                </span>
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={12} className="text-xs font-semibold">
            {isOpen ? "Close Menu" : "Pairing Settings & Operations"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Confirmation Safeguard Dialogs */}
      {/* 1. Generate Next Round Confirm */}
      <Dialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Play className="h-5 w-5 text-chess-gold" />
              {actualCurrentRound === 0
                ? "Generate Round 1 Pairings?"
                : `Generate Round ${actualCurrentRound + 1} Pairings?`}
            </DialogTitle>
            <DialogDescription>
              {actualCurrentRound === 0
                ? "This will initialize Swiss pairings for Round 1 based on player ratings."
                : `This will calculate Swiss pairings for Round ${actualCurrentRound + 1}. Please confirm to proceed.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowGenerateConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={() => {
                setShowGenerateConfirm(false);
                setIsOpen(false);
                onGenerateNextRound();
              }}
            >
              Proceed & Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Finalize Round Confirm */}
      <Dialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Flag className="h-5 w-5" />
              Finalize Round {selectedRound} Results?
            </DialogTitle>
            <DialogDescription>
              All match results for Round {selectedRound} will be submitted and standings will be recalculated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowFinalizeConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-success text-white hover:bg-success/90"
              onClick={() => {
                setShowFinalizeConfirm(false);
                setIsOpen(false);
                onFinalizeRound();
              }}
            >
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Regenerate Pairings Confirm */}
      <Dialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <ShieldAlert className="h-5 w-5" />
              Regenerate Pairings?
            </DialogTitle>
            <DialogDescription>
              This will re-calculate Swiss pairings for Round {actualCurrentRound}. Any results already entered for this round will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRegenerateConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowRegenerateConfirm(false);
                setIsOpen(false);
                onRegeneratePairings();
              }}
            >
              Regenerate Pairings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Complete Tournament Confirm */}
      <Dialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Trophy className="h-5 w-5 text-chess-gold" />
              Complete Tournament
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to conclude the tournament and finalize standings? All rounds are finished and results are recorded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCompleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-success text-white hover:bg-success/90"
              onClick={() => {
                setShowCompleteConfirm(false);
                setIsOpen(false);
                onCompleteTournament();
              }}
            >
              Finalize & Conclude
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
