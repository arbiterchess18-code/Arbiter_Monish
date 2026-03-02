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
} from "lucide-react";
import { getTournamentById, updateTournament } from "@/lib/tournament-service";
import { useRole } from "@/lib/role-context";

export default function TournamentSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const [tournament, setTournament] = useState(null);

  useEffect(() => {
    const data = getTournamentById(id);
    if (!data) {
      toast.error("Tournament not found");
      navigate("/orbiter/create");
      return;
    }
    setTournament(data);
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

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-muted-foreground">
        Loading tournament summary...
      </div>
    );
  }

  const handlePublish = () => {
    try {
      updateTournament(id, {
        isPublished: true,
        publishedAt: new Date().toISOString(),
      });
      setTournament((prev) => ({
        ...prev,
        isPublished: true,
        publishedAt: new Date().toISOString(),
      }));
      toast.success("Event published successfully");
    } catch (error) {
      toast.error(error.message || "Failed to publish event");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/orbiter/create")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Badge variant="outline">Step 2 of 3</Badge>
      </div>

      <PageHeader
        title="Tournament Summary"
        description="Tournament has been created successfully. Review details before publishing."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Badge className="w-fit">
              {(tournament.eventType || "Business").toUpperCase()}
            </Badge>
            {tournament.isPublished && (
              <Badge variant="secondary">Published</Badge>
            )}
          </div>
          <CardTitle className="text-2xl sm:text-3xl mt-2">
            {tournament.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" /> {tournament.startDate || "-"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" /> {tournament.startTime || "-"}
            </div>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {tournament.description || "No description provided."}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Venue</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {tournament.venueName || "-"}
            </div>
            <p>
              {[tournament.city, tournament.state, tournament.country]
                .filter(Boolean)
                .join(", ") || "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration Type</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>{tournament.registrationType || "Free"}</p>
            {tournament.registrationType === "Paid" && (
              <p>Entry Fee: ₹{tournament.entryFee || "0"}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organized By</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" /> {tournament.organizerName || "Unknown"}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(`/orbiter/create?edit=${id}`)}
        >
          Edit Event
        </Button>
        <Button onClick={handlePublish}>Publish Event</Button>
        <Button
          variant="secondary"
          onClick={() =>
            navigate(`/arbiter/tournament/${id}/registration-form`)
          }
        >
          <FileText className="w-4 h-4 mr-2" /> Create Registration Form
        </Button>
      </div>
    </div>
  );
}
