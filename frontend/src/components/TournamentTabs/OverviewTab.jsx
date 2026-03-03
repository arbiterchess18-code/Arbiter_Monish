import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRole } from "@/lib/role-context";
import {
  registerPlayerForTournament,
  getTournamentById,
} from "@/lib/tournament-service";
import {
  Calendar,
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
  Building,
  DollarSign,
} from "lucide-react";
import CustomRegistrationForm from "@/components/CustomRegistrationForm";

export default function OverviewTab({ tournament, canRegister }) {
  const { role } = useRole();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = JSON.parse(sessionStorage.getItem("userData") || "{}");

  const isPlayerRegistered = tournament.registeredPlayers?.some(
    (p) => p.email === currentUser.email,
  );

  const handleRegistration = async (formData) => {
    if (!currentUser.email) {
      toast.error("User email not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      registerPlayerForTournament(tournament.id, {
        email: currentUser.email,
        name: currentUser.name || "Anonymous",
        ...formData,
      });

      toast.success(
        "Registration submitted successfully! Awaiting arbiter approval.",
      );
      setShowRegistrationForm(false);

      // Refresh tournament data
      const updated = getTournamentById(tournament.id);
      if (updated) {
        window.dispatchEvent(
          new CustomEvent("tournamentUpdated", { detail: updated }),
        );
      }
    } catch (error) {
      toast.error(error.message || "Failed to register");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tournament Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tournament Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Dates</p>
                <p className="font-medium">
                  {new Date(tournament.startDate).toLocaleDateString()} -{" "}
                  {new Date(tournament.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">
                  {tournament.venueName}, {tournament.city}, {tournament.state}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Time Control</p>
                <p className="font-medium">
                  {tournament.timeControl} + {tournament.increment}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Entry Fee</p>
                <p className="font-medium">
                  {tournament.registrationType === "Free"
                    ? "Free"
                    : `$${tournament.entryFee}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organizer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p className="font-medium">{tournament.contactPerson}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{tournament.contactEmail}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{tournament.contactPhone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Organizer</p>
                <p className="font-medium">{tournament.organizerName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {tournament.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About This Tournament</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tournament.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Registration Section */}
      {role === "player" && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPlayerRegistered ? (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <Badge variant="secondary" className="bg-green-600">
                  Registered
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Your registration is being reviewed by the tournament
                  organizer.
                </span>
              </div>
            ) : tournament.status === "draft" ? (
              <div className="text-sm text-muted-foreground">
                Registration will open when the tournament is published.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Players: {tournament.registeredPlayers?.length || 0} /{" "}
                  {tournament.maxPlayers}
                </p>
                {tournament.minRating && (
                  <p className="text-sm text-muted-foreground">
                    Minimum Rating Required: {tournament.minRating}
                  </p>
                )}
                <Button
                  onClick={() => setShowRegistrationForm(true)}
                  className="w-full"
                  disabled={
                    (tournament.registeredPlayers?.length || 0) >=
                    parseInt(tournament.maxPlayers || 64)
                  }
                >
                  Register for Tournament
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Registration Form Dialog */}
      <Dialog
        open={showRegistrationForm}
        onOpenChange={setShowRegistrationForm}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tournament Registration</DialogTitle>
          </DialogHeader>
          <CustomRegistrationForm
            tournament={tournament}
            onSubmit={handleRegistration}
            isSubmitting={isSubmitting}
            onCancel={() => setShowRegistrationForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
