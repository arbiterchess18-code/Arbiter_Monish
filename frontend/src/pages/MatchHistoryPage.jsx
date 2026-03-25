import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

const resultStyle = {
  "1-0": "bg-success/15 text-success border-success/30",
  "0-1": "bg-destructive/15 text-destructive border-destructive/30",
  "1/2-1/2": "bg-warning/15 text-warning-foreground border-warning/30",
  "½-½": "bg-warning/15 text-warning-foreground border-warning/30",
  "Bye": "bg-success/15 text-success border-success/30",
};

export default function MatchHistoryPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tournamentFilter, setTournamentFilter] = useState("all");

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await apiFetch(`${import.meta.env.VITE_API_URL}/users/me/matches`);
        if (response.ok) {
          const data = await response.json();
          setMatches(data);
        }
      } catch (error) {
        console.error("Error fetching match history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  const tournamentNames = useMemo(() => {
    const names = [...new Set(matches.map(m => m.tournamentName))];
    return names;
  }, [matches]);

  const filtered = useMemo(() => {
    if (tournamentFilter === "all") return matches;
    return matches.filter(m => m.tournamentName === tournamentFilter);
  }, [tournamentFilter, matches]);

  return (
    <div className="space-y-6">
      <PageHeader title="Match History" description="Your complete match record" />

      <div className="flex gap-3">
        <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Filter by tournament" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tournaments</SelectItem>
            {tournamentNames.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tournament</TableHead>
              <TableHead>Round</TableHead>
              <TableHead>White</TableHead>
              <TableHead>Black</TableHead>
              <TableHead className="text-center">Result</TableHead>
              <TableHead className="text-center">Rating Δ</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No matches found</TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => {
                const isUserWhite = m.white === "You";
                return (
                  <TableRow key={m.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{m.tournamentName}</TableCell>
                    <TableCell className="font-medium">R{m.round}</TableCell>
                    <TableCell className={isUserWhite ? "font-medium" : ""}>{m.white}</TableCell>
                    <TableCell className={!isUserWhite ? "font-medium" : ""}>{m.black}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={resultStyle[m.result] || ""}>{m.result}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center gap-1 text-sm font-medium ${m.ratingChange > 0 ? "text-success" : m.ratingChange < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {m.ratingChange > 0 ? <TrendingUp className="h-3 w-3" /> : m.ratingChange < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {m.ratingChange > 0 ? "+" : ""}{m.ratingChange}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{m.date}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
