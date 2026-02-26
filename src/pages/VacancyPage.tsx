import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, MapPin, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const vacancies = [
  { id: "v1", title: "Regional Arbiter — South Zone", location: "Melbourne, AUS", deadline: "2026-03-15", status: "open" },
  { id: "v2", title: "National Rapid Championship Arbiter", location: "Sydney, AUS", deadline: "2026-04-01", status: "open" },
  { id: "v3", title: "Online Blitz Series Arbiter", location: "Remote", deadline: "2026-03-20", status: "applied" },
];

export default function VacancyPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Orbiter Vacancies" description="Apply for arbiter positions" />
      <div className="grid gap-4 max-w-2xl">
        {vacancies.map((v, i) => (
          <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg chess-gradient flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">{v.title}</h3>
                  <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{v.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Deadline: {v.deadline}</span>
                  </div>
                </div>
              </div>
              {v.status === "applied" ? (
                <Badge className="bg-success/15 text-success border-0 shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Applied</Badge>
              ) : (
                <Button size="sm" onClick={() => toast.success("Application submitted!")}>Apply</Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
