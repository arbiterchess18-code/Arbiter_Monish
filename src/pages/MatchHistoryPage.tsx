import { PageHeader } from "@/components/PageHeader";
import { mockMatchHistory } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

const resultStyle: Record<string, string> = {
  "1-0": "bg-success/15 text-success border-success/30",
  "0-1": "bg-destructive/15 text-destructive border-destructive/30",
  "½-½": "bg-warning/15 text-warning-foreground border-warning/30",
};

export default function MatchHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Match History" description="Your complete match record" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Round</TableHead>
              <TableHead>White</TableHead>
              <TableHead>Black</TableHead>
              <TableHead className="text-center">Result</TableHead>
              <TableHead className="text-center">Rating Δ</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockMatchHistory.map((m) => {
              const isUserWhite = m.white === "You";
              const userWon = (isUserWhite && m.result === "1-0") || (!isUserWhite && m.result === "0-1");
              const draw = m.result === "½-½";
              return (
                <TableRow key={m.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">R{m.round}</TableCell>
                  <TableCell className={isUserWhite ? "font-medium" : ""}>{m.white}</TableCell>
                  <TableCell className={!isUserWhite ? "font-medium" : ""}>{m.black}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={resultStyle[m.result]}>{m.result}</Badge>
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
            })}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
