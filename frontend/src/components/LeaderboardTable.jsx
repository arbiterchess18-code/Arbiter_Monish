import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { motion } from "framer-motion";

const rankBadge = (rank) => {
  return <span className="text-muted-foreground font-medium ml-1.5">{rank}</span>;
};

export function LeaderboardTable({ entries }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">#</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-center">Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, i) => (
            <TableRow key={entry.player.id} className="group hover:bg-muted/50 transition-colors">
              <TableCell>{rankBadge(entry.rank)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full chess-gradient flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {entry.player.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {entry.player.title && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 font-bold text-chess-gold border-chess-gold/40">
                          {entry.player.title}
                        </Badge>
                      )}
                      {entry.player.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{entry.player.country}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center font-medium">{entry.player.rating}</TableCell>

            </TableRow>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
