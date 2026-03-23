import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { TournamentCard } from "@/components/TournamentCard";
import { JoinTournamentDialog } from "@/components/JoinTournamentDialog";
import {
  getPublicTournaments,
  getMyRegisteredTournamentIds,
} from "@/lib/tournament-service";
import { useNavigate } from "react-router-dom";

export default function TournamentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [joinTournament, setJoinTournament] = useState(null);
  const [allTournaments, setAllTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRegisteredIds, setMyRegisteredIds] = useState(new Set());

  useEffect(() => {
    getMyRegisteredTournamentIds().then((ids) =>
      setMyRegisteredIds(new Set(ids)),
    );
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadTournaments();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, typeFilter, statusFilter]);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const realTournaments = await getPublicTournaments({
        search,
        type: typeFilter,
        status: statusFilter,
      });

      // Standardize IDs for real tournaments
      const standardizedReal = realTournaments.map((t) => ({
        ...t,
        id: t.tournament_id,
        name: t.tournament_name,
      }));

      setAllTournaments(standardizedReal);
    } catch (error) {
      console.error("Error loading tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSuccess = () => {
    setJoinTournament(null);
    loadTournaments();
  };

  const handleCardClick = (tournament) => {
    navigate(`/tournament/${tournament.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discover Tournaments"
        description="Find and join chess tournaments"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tournaments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Swiss">Swiss</SelectItem>
            <SelectItem value="Round Robin">Round Robin</SelectItem>
            <SelectItem value="Knockout">Knockout</SelectItem>
            <SelectItem value="Blitz">Blitz</SelectItem>
            <SelectItem value="Rapid">Rapid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="loader"></div>
        </div>
      ) : allTournaments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-display text-lg">No tournaments found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {allTournaments.map((t, i) => (
            <div
              key={t.id}
              onClick={() => handleCardClick(t)}
              className="cursor-pointer h-full"
            >
              <TournamentCard
                tournament={t}
                index={i}
                showJoin
                onJoin={setJoinTournament}
                isParticipating={myRegisteredIds.has(t.id)}
              />
            </div>
          ))}
        </div>
      )}

      <JoinTournamentDialog
        tournament={joinTournament}
        open={!!joinTournament}
        onOpenChange={(open) => !open && setJoinTournament(null)}
        onSuccess={handleJoinSuccess}
      />
    </div>
  );
}
