import { PageHeader } from "@/components/PageHeader";
import { mockOrganizerRequests } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function OrganizerRequests() {
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
                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => toast.success(`Approved ${r.name}`)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.info(`Rejected ${r.name}`)}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
