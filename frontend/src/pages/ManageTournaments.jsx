import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  StopCircle,
  Loader2,
  Edit2,
  Share2,
  Eye,
  Trash2,
  Globe,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TournamentCard } from "@/components/TournamentCard";
import {
  getArbiterTournaments,
  updateTournament,
  deleteTournament,
} from "@/lib/tournament-service";
import { useRole } from "@/lib/role-context";
import { Card, CardContent } from "@/components/ui/card";

export default function ManageTournaments() {
  const navigate = useNavigate();
  const { role } = useRole();
  const [actionTournament, setActionTournament] = useState(null);
  const [actionType, setActionType] = useState(null); // 'end', 'delete'
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch tournaments created by this arbiter
  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const data = await getArbiterTournaments();
      // Map backend data to frontend format
      const mappedTournaments = data.map((t) => ({
        id: t.tournament_id,
        name: t.tournament_name,
        date: t.start_date,
        endDate: t.end_date,
        location: `${t.venue_name}, ${t.city}`,
        venueName: t.venue_name,
        city: t.city,
        state: t.state,
        country: t.country,
        players: t.max_players || 0,
        rounds: t.rounds || 0,
        status: t.status || "upcoming",
        isPublished: t.isPublished || t.status === "published",
        registrationType: t.registration_type || "Free",
        isRated: t.is_rated,
        eventType: t.event_type || "Rapid",
        timeControl: t.time_control,
        pairingSystem: t.pairing_system,
      }));
      setTournaments(mappedTournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      toast.error("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "arbiter" || role === "admin") {
      fetchTournaments();
    }
  }, [role]);

  if (role !== "arbiter" && role !== "admin") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        <PageHeader title="Manage Tournaments" description="Access denied" />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              Only Arbiter/Admin can access the Manage Tournament page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const confirmAction = async () => {
    try {
      const tournament = tournaments.find((t) => t.id === actionTournament);
      if (!tournament) return;

      if (actionType === "end") {
        await updateTournament(tournament.id, { status: "completed" });
        toast.success("Tournament ended successfully");
      } else if (actionType === "delete") {
        await deleteTournament(tournament.id);
        toast.success("Tournament deleted successfully");
      }

      // Refresh list
      fetchTournaments();
    } catch (error) {
      console.error(`Error performing ${actionType}:`, error);
      toast.error(`Failed to ${actionType} tournament: ${error.message}`);
    } finally {
      setActionTournament(null);
      setActionType(null);
    }
  };

  const togglePublish = async (tournament) => {
    const isCurrentlyPublished = tournament.isPublished;
    const newStatus = isCurrentlyPublished ? "upcoming" : "published"; // or active
    try {
      await updateTournament(tournament.id, {
        isPublished: !isCurrentlyPublished,
        status: newStatus,
      });
      toast.success(
        isCurrentlyPublished
          ? "Tournament unpublished"
          : "Tournament published",
      );
      fetchTournaments();
    } catch (error) {
      console.error("Error toggling publish state:", error);
      toast.error(
        `Failed to ${isCurrentlyPublished ? "unpublish" : "publish"} tournament: ${error.message}`,
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Tournaments"
        description="Monitor and control all your tournaments"
        action={
          <Button onClick={() => navigate("/orbiter/create")}>
            <PlusCircle className="h-4 w-4 mr-1.5" /> New Tournament
          </Button>
        }
      />

      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground/90 pb-2 border-b">
          Your Tournaments
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <p className="text-muted-foreground mb-4">
            No tournaments found. Create your first tournament!
          </p>
          <Button onClick={() => navigate("/orbiter/create")}>
            <PlusCircle className="h-4 w-4 mr-1.5" /> Create Tournament
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {tournaments.map((t, i) => (
            <div
              key={t.id}
              className="relative flex flex-col h-full bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex-1">
                <TournamentCard tournament={t} index={i} hideActions={true} />
              </div>

              {/* Quick Actions Footer */}
              <div className="bg-muted/30 border-t p-3 grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium"
                  onClick={() => navigate(`/tournament/${t.id}/view-details`)}
                  title="View tournament details"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium"
                  onClick={() => navigate(`/orbiter/create?edit=${t.id}`)}
                  title="Edit tournament"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>

                <Button
                  variant={t.isPublished ? "default" : "outline"}
                  size="sm"
                  className={`w-full text-xs font-medium ${t.isPublished ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => togglePublish(t)}
                  title={
                    t.isPublished
                      ? "Unpublish tournament"
                      : "Publish tournament"
                  }
                >
                  {t.isPublished ? (
                    <>
                      <StopCircle className="h-3.5 w-3.5 mr-1" /> Unpublish
                    </>
                  ) : (
                    <>
                      <Globe className="h-3.5 w-3.5 mr-1" /> Publish
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => {
                    setActionTournament(t.id);
                    setActionType("delete");
                  }}
                  title="Delete tournament"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reusable Dialog for Actions */}
      <ConfirmationDialog
        open={!!actionTournament}
        onOpenChange={(open) => {
          if (!open) {
            setActionTournament(null);
            setActionType(null);
          }
        }}
        title={actionType === "delete" ? "Delete Tournament" : "End Tournament"}
        description={
          actionType === "delete"
            ? `Are you sure you want to permanently delete this tournament? All associated data will be removed. This cannot be undone.`
            : `Are you sure you want to end this tournament? This will finalize all standings and lock the results. This action cannot be undone.`
        }
        confirmLabel={actionType === "delete" ? "Delete" : "End Tournament"}
        onConfirm={confirmAction}
        destructive={true}
      />
    </div>
  );
}
