import { PageHeader } from "@/components/PageHeader";
import { mockTournaments, mockPlayers } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";

const mockPairings = [
  { board: 1, white: "Magnus Andersson", black: "Elena Petrova", result: null },
  { board: 2, white: "Raj Krishnan", black: "Carlos Rivera", result: null },
  { board: 3, white: "Sophie Laurent", black: "James Okonkwo", result: null },
  { board: 4, white: "Akira Tanaka", black: "Lisa Müller", result: null },
];

export default function ResultsEntry() {
  const handleSubmit = () => toast.success("Results submitted successfully!");

  return (
    <div className="space-y-6">
      <PageHeader title="Results Entry" description="Enter and validate match results" />

      <div className="flex gap-3">
        <Select defaultValue="1">
          <SelectTrigger className="w-64"><SelectValue placeholder="Select tournament" /></SelectTrigger>
          <SelectContent>
            {mockTournaments.filter(t => t.status === "active").map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select defaultValue="5">
          <SelectTrigger className="w-32"><SelectValue placeholder="Round" /></SelectTrigger>
          <SelectContent>
            {[1,2,3,4,5,6,7,8,9].map(r => <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Board</TableHead>
              <TableHead>White</TableHead>
              <TableHead>Black</TableHead>
              <TableHead className="w-40">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPairings.map(p => (
              <TableRow key={p.board}>
                <TableCell className="font-medium">{p.board}</TableCell>
                <TableCell>{p.white}</TableCell>
                <TableCell>{p.black}</TableCell>
                <TableCell>
                  <Select>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-0">1-0</SelectItem>
                      <SelectItem value="0-1">0-1</SelectItem>
                      <SelectItem value="½-½">½-½</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      <div className="flex justify-end gap-3">
        <Button variant="outline">Validate</Button>
        <Button onClick={handleSubmit}>Submit Results</Button>
      </div>
    </div>
  );
}
