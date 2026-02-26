import { PageHeader } from "@/components/PageHeader";
import { TournamentCard } from "@/components/TournamentCard";
import { mockTournaments } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ManageTournaments() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Tournaments"
        description="Monitor and control all your tournaments"
        action={<Button onClick={() => navigate("/orbiter/create")}><PlusCircle className="h-4 w-4 mr-1.5" /> New Tournament</Button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockTournaments.map((t, i) => (
          <TournamentCard key={t.id} tournament={t} index={i} />
        ))}
      </div>
    </div>
  );
}
