import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateTournament } from "@/lib/tournament-service";
import { Settings, Save } from "lucide-react";

export default function SettingsTab({ tournament, onTournamentUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    description: tournament.description || "",
    timeControl: tournament.timeControl || "15",
    increment: tournament.increment || "10",
    isPrivate: tournament.isPrivate || false,
    isRated: tournament.isRated || false,
    pairingSystem: tournament.pairingSystem || "Swiss",
    tieBreakers: tournament.tieBreakers || ["Buchholz"],
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = updateTournament(tournament.id, formData);
      onTournamentUpdate(updated);
      toast.success("Settings updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const tieBreakerOptions = [
    "Buchholz",
    "Sonneborn-Berger",
    "Wins with Black",
    "Wins with White",
  ];

  return (
    <div className="space-y-6">
      {/* Tournament Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tournament Settings
          </CardTitle>
          {!isEditing && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit Settings
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Tournament description..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time Control (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.timeControl}
                    onChange={(e) =>
                      handleInputChange("timeControl", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Increment (seconds)</Label>
                  <Input
                    type="number"
                    value={formData.increment}
                    onChange={(e) =>
                      handleInputChange("increment", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pairing System</Label>
                  <Select
                    value={formData.pairingSystem}
                    onValueChange={(value) =>
                      handleInputChange("pairingSystem", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Swiss">Swiss System</SelectItem>
                      <SelectItem value="Round Robin">Round Robin</SelectItem>
                      <SelectItem value="Knockout">Knockout</SelectItem>
                      <SelectItem value="Arena">Arena</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Primary Tie-Breaker</Label>
                  <Select
                    value={formData.tieBreakers[0] || "Buchholz"}
                    onValueChange={(value) =>
                      handleInputChange("tieBreakers", [value])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tieBreakerOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      description: tournament.description || "",
                      timeControl: tournament.timeControl || "15",
                      increment: tournament.increment || "10",
                      isPrivate: tournament.isPrivate || false,
                      isRated: tournament.isRated || false,
                      pairingSystem: tournament.pairingSystem || "Swiss",
                      tieBreakers: tournament.tieBreakers || ["Buchholz"],
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">
                  {formData.description || "No description provided"}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Time Control</p>
                  <p className="font-medium">{formData.timeControl} min</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Increment</p>
                  <p className="font-medium">+{formData.increment} sec</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Pairing System
                  </p>
                  <p className="font-medium">{formData.pairingSystem}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Tie-Breaker</p>
                  <p className="font-medium">{formData.tieBreakers[0]}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Rated</p>
                  <p className="font-medium">
                    {formData.isRated ? "Yes" : "No"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Private</p>
                  <p className="font-medium">
                    {formData.isPrivate ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Settings Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Time Control:</strong> The base time given to each player
            for the entire game.
          </p>
          <p>
            <strong>Increment:</strong> Additional time added per move made.
          </p>
          <p>
            <strong>Pairing System:</strong> The system used to determine
            matchups in each round.
          </p>
          <p>
            <strong>Tie-Breaker:</strong> The method used to rank players with
            equal points.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
