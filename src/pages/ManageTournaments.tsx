import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TournamentCard } from "@/components/TournamentCard";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { mockTournaments } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { PlusCircle, StopCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ManageTournaments() {
  const navigate = useNavigate();
  const [endTournament, setEndTournament] = useState<string | null>(null);

  const handleEnd = () => {
    toast.success("Tournament ended successfully");
    setEndTournament(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Tournaments"
        description="Monitor and control all your tournaments"
        action={<Button onClick={() => navigate("/orbiter/create")}><PlusCircle className="h-4 w-4 mr-1.5" /> New Tournament</Button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockTournaments.map((t, i) => (
          <div key={t.id} className="relative">
            <TournamentCard tournament={t} index={i} />
            {t.status === "active" && (
              <div className="mt-2 px-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setEndTournament(t.name)}
                >
                  <StopCircle className="h-3.5 w-3.5 mr-1.5" /> End Tournament
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmationDialog
        open={!!endTournament}
        onOpenChange={(open) => !open && setEndTournament(null)}
        title="End Tournament"
        description={`Are you sure you want to end "${endTournament}"? This will finalize all standings and lock the results. This action cannot be undone.`}
        confirmLabel="End Tournament"
        onConfirm={handleEnd}
        destructive
      />
    </div>
  );
}
