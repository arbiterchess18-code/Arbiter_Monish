import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit2, Save, X, User, Bell } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const profile = {
    name: "Alex Thompson",
    bio: "Passionate chess player focusing on positional play. Regular participant in local and online tournaments.",
    acfId: "ACF-2024-1847",
    fideId: "1234567",
    title: "CM",
    rating: 1968,
    preferences: "Classical, Rapid",
    country: "AUS",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Profile"
        description="Your chess identity"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/notifications")}>
              <Bell className="h-4 w-4 mr-1.5" /> Notifications
            </Button>
            <Button variant={editing ? "destructive" : "default"} size="sm" onClick={() => setEditing(!editing)}>
              {editing ? <><X className="h-4 w-4 mr-1.5" /> Cancel</> : <><Edit2 className="h-4 w-4 mr-1.5" /> Edit Profile</>}
            </Button>
          </div>
        }
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full chess-gradient flex items-center justify-center">
            <User className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{profile.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-chess-gold border-chess-gold/40 font-bold">{profile.title}</Badge>
              <span className="text-sm text-muted-foreground">Rating: {profile.rating}</span>
              <span className="text-sm text-muted-foreground">• {profile.country}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <Label>Bio</Label>
            {editing ? <Textarea defaultValue={profile.bio} className="mt-1.5" /> : <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ACF ID</Label>
              {editing ? <Input defaultValue={profile.acfId} className="mt-1.5" /> : <p className="text-sm text-muted-foreground mt-1">{profile.acfId}</p>}
            </div>
            <div>
              <Label>FIDE ID</Label>
              {editing ? <Input defaultValue={profile.fideId} className="mt-1.5" /> : <p className="text-sm text-muted-foreground mt-1">{profile.fideId}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Chess Title</Label>
              {editing ? (
                <Select defaultValue={profile.title}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["GM", "IM", "FM", "CM", "NM", "None"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <p className="text-sm text-muted-foreground mt-1">{profile.title}</p>}
            </div>
            <div>
              <Label>Playing Preferences</Label>
              {editing ? <Input defaultValue={profile.preferences} className="mt-1.5" /> : <p className="text-sm text-muted-foreground mt-1">{profile.preferences}</p>}
            </div>
          </div>
        </div>

        {editing && (
          <div className="flex justify-end">
            <Button onClick={() => setEditing(false)}>
              <Save className="h-4 w-4 mr-1.5" /> Save Changes
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
