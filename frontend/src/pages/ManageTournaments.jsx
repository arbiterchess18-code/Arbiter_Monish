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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ManageTournaments() {
  const navigate = useNavigate();
  const { role } = useRole();
  const [actionTournament, setActionTournament] = useState(null);
  const [actionType, setActionType] = useState(null); // 'end', 'delete'
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState("all");

  const currentUser = JSON.parse(sessionStorage.getItem("userData") || "{}");
  const userId = currentUser.user_id || currentUser.id;

  // Fetch tournaments created by this arbiter and assigned to this arbiter
  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const data = await getArbiterTournaments();
      // Map backend data to frontend format
      const mappedTournaments = data.map((t) => {
        // Relational mapping from tournament_staff
        let parsedSubArbiters = t.staff || [];

        return {
          id: t.tournament_id,
          name: t.tournament_name,
          date: t.start_date,
          endDate: t.end_date,
          location: `${t.venue_name}, ${t.city}`,
          venueName: t.venue_name,
          city: t.city,
          state: t.state,
          country: t.country,
          players: t.registered_count || 0,
          maxPlayers: t.max_players || 0,
          rounds: t.rounds || 0,
          status: t.status || "upcoming",
          isPublished: t.isPublished || t.status === "published",
          registrationType: t.registration_type || "Free",
          isRated: t.is_rated,
          eventType: t.event_type || "Rapid",
          timeControl: t.time_control,
          pairingSystem: t.pairing_system,
          createdBy: t.created_by,
          subArbiters: parsedSubArbiters,
        };
      });
      setTournaments(mappedTournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      toast.error("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "arbiter" || role === "admin" || role === "organization") {
      fetchTournaments();
    }
  }, [role]);

  // Compute whether the current user is a sub-arbiter on each tournament
  const isSubArbiterOnTournament = (t) =>
    !(t.createdBy?.toString() === userId?.toString()) &&
    t.subArbiters.some((sa) => sa?.user_id?.toString() === userId?.toString());

  if (role !== "arbiter" && role !== "admin" && role !== "organization") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        <PageHeader title="Manage Tournaments" description="Access denied" />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              Only Arbiter/Admin/Organization can access the Manage Tournament
              page.
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
    const isCurrentlyPublished = tournament.status === "published";
    const newStatus = isCurrentlyPublished ? "upcoming" : "published";
    try {
      await updateTournament(tournament.id, {
        status: newStatus,
        is_private: isCurrentlyPublished, // If unpublishing, maybe make it private? Or just rely on status.
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
          <div className="flex items-center gap-3">
            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger className="w-[200px] h-9 bg-background">
                <SelectValue placeholder="Filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tournaments</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
                <SelectItem value="sub_arbiter">
                  Appointed as Sub-Arbiter
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => navigate("/orbiter/create")}>
              <PlusCircle className="h-4 w-4 mr-1.5" /> New Tournament
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="loader"></div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {tournaments
            .filter((t) => {
              if (filterMode === "all") return true;
              if (filterMode === "ongoing") return t.status === "active";
              if (filterMode === "upcoming")
                return t.status === "upcoming" || t.status === "published";
              if (filterMode === "finished") return t.status === "completed";
              if (filterMode === "sub_arbiter")
                return t.subArbiters.some(
                  (sa) => sa?.user_id?.toString() === userId?.toString(),
                );
              return true;
            })
            .map((t, i) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const startDate = new Date(t.date);
              startDate.setHours(0, 0, 0, 0);
              const cannotUnpublish =
                t.status === "published" && today >= startDate;
              const cannotDelete = t.status === "active";

              const isCreator = t.createdBy?.toString() === userId?.toString();
              const isSubArbiterCard = isSubArbiterOnTournament(t);

              return (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  isSubArbiter={isSubArbiterCard}
                  index={i}
                  hideActions={true}
                  customActions={
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`w-full text-xs font-medium px-0 ${isSubArbiterCard ? "col-span-2" : ""}`}
                        onClick={() => navigate(`/tournament/${t.id}`)}
                        title="View tournament details"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                      </Button>

                      {!isSubArbiterCard && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs font-medium px-0"
                            onClick={() =>
                              navigate(`/orbiter/create?edit=${t.id}`)
                            }
                            title="Edit tournament"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>

                          <Button
                            variant={
                              t.status === "published" ? "default" : "outline"
                            }
                            size="sm"
                            className={`w-full text-xs font-medium px-0 ${t.status === "published" ? "bg-green-600 hover:bg-green-700" : ""}`}
                            onClick={() => togglePublish(t)}
                            disabled={cannotUnpublish}
                            title={
                              cannotUnpublish
                                ? "Cannot unpublish once the start date has arrived"
                                : t.status === "published"
                                  ? "Unpublish tournament"
                                  : "Publish tournament"
                            }
                          >
                            {t.status === "published" ? (
                              <>
                                <StopCircle className="h-3.5 w-3.5 mr-1" />{" "}
                                Unpublish
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
                            className="w-full text-xs font-medium px-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => {
                              setActionTournament(t.id);
                              setActionType("delete");
                            }}
                            disabled={cannotDelete}
                            title={
                              cannotDelete
                                ? "Cannot delete an ongoing tournament"
                                : "Delete tournament"
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                          </Button>
                        </>
                      )}
                    </>
                  }
                />
              );
            })}
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
