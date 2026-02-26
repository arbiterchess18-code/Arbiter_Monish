import { useState } from "react";
import { Tournament, mockUserStats } from "@/lib/mock-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, Users, Trophy, AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface JoinTournamentDialogProps {
  tournament: Tournament | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinTournamentDialog({ tournament, open, onOpenChange }: JoinTournamentDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    start: true,
    rounds: true,
    results: false,
  });

  if (!tournament) return null;

  const userRating = mockUserStats.currentRating;
  const isEligible = !tournament.minRating || userRating >= tournament.minRating;
  const isMaxRatingOk = !tournament.maxRating || userRating <= tournament.maxRating;
  const canJoin = isEligible && isMaxRatingOk;

  const handleJoinClick = () => {
    if (tournament.rated && tournament.entryFee) {
      setConfirmOpen(true);
    } else {
      handleConfirmJoin();
    }
  };

  const handleConfirmJoin = () => {
    setConfirmOpen(false);
    onOpenChange(false);
    toast.success(`Successfully joined ${tournament.name}!`, {
      description: notifications.start ? "You'll be notified when the tournament starts." : undefined,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{tournament.name}</DialogTitle>
            <DialogDescription>Review tournament details before joining</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={tournament.rated ? "default" : "secondary"}>
                {tournament.rated ? "Rated" : "Unrated"}
              </Badge>
              <Badge variant="outline">{tournament.type}</Badge>
              <Badge variant="outline">{tournament.mode}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{tournament.players}/{tournament.maxPlayers} players</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{tournament.timeControl}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{tournament.startDate}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{tournament.venue}</span>
              </div>
              {tournament.prizePool && (
                <div className="flex items-center gap-2 text-chess-gold font-medium col-span-2">
                  <Trophy className="h-4 w-4" />
                  <span>Prize Pool: {tournament.prizePool}</span>
                </div>
              )}
            </div>

            {tournament.rated && !canJoin && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Rating Ineligible</p>
                  <p className="text-muted-foreground">
                    Your rating ({userRating}) does not meet the requirement
                    {tournament.minRating && ` (min: ${tournament.minRating})`}
                    {tournament.maxRating && ` (max: ${tournament.maxRating})`}.
                  </p>
                </div>
              </div>
            )}

            {tournament.rated && tournament.entryFee && canJoin && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Entry Fee: {tournament.entryFee}</p>
                  <p className="text-muted-foreground">You will be redirected to payment confirmation.</p>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bell className="h-4 w-4" />
                <span>Notification Preferences</span>
              </div>
              {([
                { key: "start" as const, label: "Tournament Start" },
                { key: "rounds" as const, label: "Round Announcements" },
                { key: "results" as const, label: "Result Updates" },
              ]).map(n => (
                <div key={n.key} className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">{n.label}</Label>
                  <Switch
                    checked={notifications[n.key]}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [n.key]: checked }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleJoinClick} disabled={!canJoin}>
              {tournament.rated && tournament.entryFee ? "Proceed to Payment" : "Join Tournament"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment & Join</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to join <strong>{tournament.name}</strong> with an entry fee of <strong>{tournament.entryFee}</strong>. 
              This is a rated tournament and will affect your rating.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmJoin}>Confirm & Pay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
