import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ArrowLeft,
  FileText,
  Users,
  Zap,
  Trophy,
  Edit2,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { getTournamentById, updateTournament } from "@/lib/tournament-service";
import { useRole } from "@/lib/role-context";

export default function TournamentSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const data = await getTournamentById(id);
        if (!data) {
          toast.error("Tournament not found");
          navigate("/orbiter/create");
          return;
        }
        setTournament(data);
      } catch (error) {
        console.error("Error fetching tournament:", error);
        toast.error("Failed to load tournament");
        navigate("/orbiter/create");
      } finally {
        setLoading(false);
      }
    };
    fetchTournament();
  }, [id, navigate]);

  if (role !== "arbiter" && role !== "admin") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader title="Tournament Summary" description="Access denied" />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              Only Arbiter/Admin can access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loader"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Tournament Summary"
          description="Tournament not found"
        />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              The tournament you're looking for doesn't exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await updateTournament(id, {
        status: "published",
        isPublished: true,
      });
      setTournament((prev) => ({
        ...prev,
        status: "published",
        isPublished: true,
      }));
      toast.success("Tournament published successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to publish tournament");
    } finally {
      setIsPublishing(false);
    }
  };

  const eventTypeMap = {
    Rapid: "RAPID",
    Blitz: "BLITZ",
    Standard: "STANDARD",
    Classical: "CLASSICAL",
    Business: "BUSINESS",
  };
  const displayEventType =
    eventTypeMap[tournament.event_type] ||
    eventTypeMap[tournament.eventType] ||
    tournament.event_type?.toUpperCase() ||
    tournament.eventType?.toUpperCase() ||
    "TOURNAMENT";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/orbiter/create")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Badge variant="secondary" className="text-xs px-3 py-1">
            Step 2: Tournament Summary
          </Badge>
        </div>
        {tournament.isPublished && (
          <Badge className="bg-green-600 text-white gap-1">
            <CheckCircle2 className="w-3 h-3" /> Published
          </Badge>
        )}
      </div>

      {/* Main Tournament Card */}
      <Card className="border-2 border-primary/20 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-purple-500 to-primary"></div>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-3">
              <Badge className="bg-primary-foreground text-primary border-primary w-fit">
                {displayEventType}
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                {tournament.tournament_name || tournament.name}
              </h1>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          {tournament.description && (
            <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {tournament.description}
              </p>
            </div>
          )}

          {/* Date & Time Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Start Date
                </span>
              </div>
              <p className="text-lg font-semibold">
                {formatDate(tournament.start_date || tournament.startDate)}
              </p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Start Time
                </span>
              </div>
              <p className="text-lg font-semibold">
                {tournament.start_time || tournament.startTime || "-"}
              </p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Max Players
                </span>
              </div>
              <p className="text-lg font-semibold">
                {tournament.max_players || tournament.maxPlayers || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Venue Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Venue Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Venue Name</p>
              <p className="font-semibold">
                {tournament.venue_name || tournament.venueName || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-medium">
                {[tournament.city, tournament.state, tournament.country]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </p>
            </div>
            {tournament.google_maps_link || tournament.googleMapsLink ? (
              <Button variant="outline" size="sm" className="w-full text-xs">
                View on Maps
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Registration Type Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Registration Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Registration Type</p>
              <Badge variant="outline" className="mt-1">
                {tournament.registration_type ||
                  tournament.registrationType ||
                  "Open"}
              </Badge>
            </div>
            {(tournament.registration_type === "Paid" ||
              tournament.registrationType === "Paid") && (
                <div>
                  <p className="text-xs text-muted-foreground">Entry Fee</p>
                  <p className="text-lg font-semibold text-primary">
                    ₹
                    {parseFloat(
                      tournament.entry_fee || tournament.entryFee || 0,
                    ).toFixed(2)}
                  </p>
                </div>
              )}
            <div>
              <p className="text-xs text-muted-foreground">Tournament Status</p>
              <Badge
                className="mt-1"
                variant={
                  tournament.status === "upcoming" ? "secondary" : "default"
                }
              >
                {tournament.status?.charAt(0).toUpperCase() +
                  tournament.status?.slice(1) || "Upcoming"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Game Control Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Game Control & System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">System Type</p>
              <p className="font-semibold text-sm mt-1">
                {tournament.pairing_system ||
                  tournament.pairingSystem ||
                  "Swiss"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Event Type</p>
              <p className="font-semibold text-sm mt-1">
                {tournament.event_type || tournament.eventType || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rounds</p>
              <p className="font-semibold text-sm mt-1">
                {tournament.rounds || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time Control</p>
              <p className="font-semibold text-sm mt-1">
                {tournament.time_control || tournament.timeControl || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizer Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Organized By
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Organizer Name</p>
            <p className="font-semibold">
              {tournament.organizer_name ||
                tournament.organizerName ||
                "Unknown"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Contact Person</p>
              <p className="text-sm font-medium">
                {tournament.contact_person || tournament.contactPerson || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contact Email</p>
              <p className="text-sm font-medium">
                {tournament.contact_email || tournament.contactEmail || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Confirmation Message */}
      {!tournament.isPublished && (
        <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">
                Tournament Created Successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                Your tournament has been created and saved. You can now publish
                it or create a custom registration form.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center pt-4">
        <Button
          variant="outline"
          onClick={() => navigate(`/orbiter/create?edit=${id}`)}
          className="gap-2"
        >
          <Edit2 className="w-4 h-4" /> Edit Event
        </Button>

        <Button
          onClick={handlePublish}
          disabled={isPublishing || tournament.isPublished}
          className="gap-2"
        >
          {isPublishing ? (
            <>
              <span className="animate-spin">⏳</span> Publishing...
            </>
          ) : tournament.isPublished ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Published
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" /> Publish Event
            </>
          )}
        </Button>

        <Button
          onClick={() =>
            navigate(`/arbiter/tournament/${id}/registration-form`)
          }
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <FileText className="w-4 h-4" /> Create Registration Form
        </Button>
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>
          Next: Create a custom registration form for your tournament or publish
          it as-is.
        </p>
      </div>
    </div>
  );
}
