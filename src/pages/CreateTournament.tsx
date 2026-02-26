import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { toast } from "sonner";

const tieBreakers = [
  "Buchholz", "Sonneborn–Berger", "Head-to-head", "Direct encounter", "Wins", "Rating performance",
];

export default function CreateTournament() {
  const handleCreate = () => {
    toast.success("Tournament created successfully!");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Create Tournament" description="Set up a new chess tournament" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card space-y-6">
        <div className="grid gap-4">
          <div>
            <Label>Tournament Name</Label>
            <Input placeholder="e.g. Spring Classical Open 2026" className="mt-1.5" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tournament Type</Label>
              <Select>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {["Swiss System", "Round Robin", "Knockout", "Blitz", "Rapid", "Classical"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Time Control</Label>
              <Input placeholder="e.g. 90+30" className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Max Players</Label>
              <Input type="number" placeholder="64" className="mt-1.5" />
            </div>
            <div>
              <Label>Rounds</Label>
              <Input type="number" placeholder="Auto-calculated" className="mt-1.5" />
            </div>
            <div>
              <Label>Mode</Label>
              <Select>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" className="mt-1.5" />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Venue</Label>
            <Input placeholder="Location or platform name" className="mt-1.5" />
          </div>

          <div>
            <Label>Prize Pool (optional)</Label>
            <Input placeholder="e.g. $5,000" className="mt-1.5" />
          </div>
        </div>

        <div>
          <Label className="mb-3 block">Tie-Breakers (select and reorder)</Label>
          <div className="space-y-2">
            {tieBreakers.map(tb => (
              <div key={tb} className="flex items-center gap-3 p-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors">
                <Checkbox id={tb} defaultChecked={["Buchholz", "Sonneborn–Berger"].includes(tb)} />
                <label htmlFor={tb} className="text-sm cursor-pointer flex-1">{tb}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline">Save as Draft</Button>
          <Button onClick={handleCreate}>Create Tournament</Button>
        </div>
      </motion.div>
    </div>
  );
}
