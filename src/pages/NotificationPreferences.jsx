import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Save } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const defaultPrefs = {
  tournamentStart: true,
  roundAnnouncements: true,
  resultUpdates: true,
  organizerApprovals: false,
  ratingChanges: true,
  newTournaments: false,
};

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState(defaultPrefs);

  const toggle = (key) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const labels = {
    tournamentStart: { label: "Tournament Start", desc: "Get notified when a tournament you joined begins" },
    roundAnnouncements: { label: "Round Announcements", desc: "Notifications for new round pairings" },
    resultUpdates: { label: "Result Updates", desc: "Updates when match results are posted" },
    organizerApprovals: { label: "Organizer Approvals", desc: "Status updates on organizer applications" },
    ratingChanges: { label: "Rating Changes", desc: "Notifications when your rating changes" },
    newTournaments: { label: "New Tournaments", desc: "Alerts for newly created tournaments" },
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Notifications" description="Manage your notification preferences" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card space-y-1">
        {Object.keys(labels).map((key, i) => (
          <div key={key} className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-border" : ""}`}>
            <div className="flex items-start gap-3">
              <Bell className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <Label className="text-sm font-medium">{labels[key].label}</Label>
                <p className="text-xs text-muted-foreground">{labels[key].desc}</p>
              </div>
            </div>
            <Switch checked={prefs[key]} onCheckedChange={() => toggle(key)} />
          </div>
        ))}
      </motion.div>

      <div className="flex justify-end">
        <Button onClick={() => toast.success("Preferences saved")}>
          <Save className="h-4 w-4 mr-1.5" /> Save Preferences
        </Button>
      </div>
    </div>
  );
}
