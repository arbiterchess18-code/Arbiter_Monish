import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { mockArbiterVacancies } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Calendar, DollarSign, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ArbiterVacanciesPage() {
  const [confirmVacancy, setConfirmVacancy] = useState(null);

  const handleApply = () => {
    toast.success("Application submitted successfully!");
    setConfirmVacancy(null);
  };

  const statusBadge = {
    open: "bg-success/15 text-success border-success/30",
    applied: "bg-info/15 text-info border-info/30",
    filled: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Arbiter Vacancies" description="Apply to arbitrate upcoming tournaments" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockArbiterVacancies.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card space-y-3"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-display font-semibold">{v.tournament}</h3>
              <Badge variant="outline" className={statusBadge[v.status]}>{v.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{v.description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {v.date}
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                {v.compensation}
              </div>
            </div>
            {v.status === "open" && (
              <Button size="sm" className="w-full" onClick={() => setConfirmVacancy(v.id)}>
                <Briefcase className="h-4 w-4 mr-1.5" /> Apply to Arbitrate
              </Button>
            )}
            {v.status === "applied" && (
              <Button size="sm" variant="outline" className="w-full" disabled>
                Application Pending
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      <ConfirmationDialog
        open={!!confirmVacancy}
        onOpenChange={(open) => !open && setConfirmVacancy(null)}
        title="Apply"
        description="Are you sure you want to apply for this arbiter position? Your profile and credentials will be shared with the organizer."
        confirmLabel="Submit Application"
        onConfirm={handleApply}
      />
    </div>
  );
}
