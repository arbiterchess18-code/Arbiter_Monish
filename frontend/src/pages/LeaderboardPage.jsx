import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, RefreshCcw } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [ratingType, setRatingType] = useState("world-fide");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [ratingType]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      let url = `${baseUrl}/leaderboard/?type=${ratingType}`;
      if (ratingType === "world-fide") {
        url = `${baseUrl}/leaderboard/world-top/?source=fide`;
      } else if (ratingType === "world-lichess") {
        url = `${baseUrl}/leaderboard/world-top/?source=lichess`;
      }

      const response = await axios.get(url);
      setLeaderboard(response.data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Failed to load leaderboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      await axios.post(`${baseUrl}/leaderboard/sync`);
      toast.success("Ratings synced successfully");
      fetchLeaderboard();
    } catch (error) {
      console.error("Error syncing ratings:", error);
      toast.error("Failed to sync ratings");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard"
        description={ratingType.startsWith("world") ? "FIDE World Rankings" : "Global Player Standings"}
        action={
          <div className="flex gap-2">
            <Select value={ratingType} onValueChange={setRatingType}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="world-fide">World Ranking (FIDE)</SelectItem>
                <SelectItem value="world-lichess">World Ranking (Lichess)</SelectItem>
                
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSync}
              disabled={syncing}
              className={syncing ? "animate-spin" : ""}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
          </div>
        }
      />

      <div className="stat-card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground italic">Loading leaderboard...</div>
        ) : (
          <LeaderboardTable entries={leaderboard} />
        )}
      </div>
    </div>
  );
}
