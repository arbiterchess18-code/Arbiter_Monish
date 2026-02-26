import { PageHeader } from "@/components/PageHeader";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { mockLeaderboard } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard"
        description="Grand Masters Open 2026 — Live Standings"
        action={
          <div className="flex gap-2">
            <Select defaultValue="gmo">
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gmo">Grand Masters Open 2026</SelectItem>
                <SelectItem value="wbl">Weekend Blitz Championship</SelectItem>
                <SelectItem value="wsl">Winter Swiss League</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
          </div>
        }
      />

      <div className="stat-card overflow-hidden p-0">
        <LeaderboardTable entries={mockLeaderboard} />
      </div>
    </div>
  );
}
