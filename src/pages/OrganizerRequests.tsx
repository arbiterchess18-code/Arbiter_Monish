import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { mockOrganizerRequests } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function OrganizerRequests() {
  const [confirm, setConfirm] = useState<{ id: string; name: string; action: "approve" | "reject" } | null>(null);

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.action === "approve") {
      toast.success(`Approved ${confirm.name}`);
    } else {
      toast.info(`Rejected ${confirm.name}`);
    }
    setConfirm(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Organizer Requests" description="Review and manage tournament hosting applications" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Tournament</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockOrganizerRequests.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{r.tournament}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.date}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/30">Pending</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setConfirm({ id: r.id, name: r.name, action: "approve" })}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirm({ id: r.id, name: r.name, action: "reject" })}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      <ConfirmationDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.action === "approve" ? "Approve Request" : "Reject Request"}
        description={confirm?.action === "approve"
          ? `Are you sure you want to approve ${confirm?.name}'s organizer request? They will gain access to create and manage tournaments.`
          : `Are you sure you want to reject ${confirm?.name}'s request? This action cannot be undone.`}
        confirmLabel={confirm?.action === "approve" ? "Approve" : "Reject"}
        onConfirm={handleConfirm}
        destructive={confirm?.action === "reject"}
      />
    </div>
  );
}
