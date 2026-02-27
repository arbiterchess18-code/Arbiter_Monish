import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { TournamentCard } from "@/components/TournamentCard";
import { JoinTournamentDialog } from "@/components/JoinTournamentDialog";
import { mockTournaments } from "@/lib/mock-data";

export default function TournamentsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [joinTournament, setJoinTournament] = useState(null);

  const filtered = mockTournaments.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Discover Tournaments" description="Find and join chess tournaments" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tournaments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
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
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-display text-lg">No tournaments found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t, i) => (
            <TournamentCard key={t.id} tournament={t} index={i} showJoin onJoin={setJoinTournament} />
          ))}
        </div>
      )}

      <JoinTournamentDialog
        tournament={joinTournament}
        open={!!joinTournament}
        onOpenChange={(open) => !open && setJoinTournament(null)}
      />
    </div>
  );
}
