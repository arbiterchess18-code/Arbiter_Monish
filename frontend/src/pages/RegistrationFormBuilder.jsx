import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";
import { getTournamentById, updateTournament } from "@/lib/tournament-service";
import { useRole } from "@/lib/role-context";

const FIELD_TYPES = [
  "Text",
  "Email",
  "Number",
  "Date",
  "Dropdown",
  "Text Area",
];

export default function RegistrationFormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const [tournament, setTournament] = useState(null);
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const data = getTournamentById(id);
    if (!data) {
      toast.error("Tournament not found");
      navigate("/orbiter/create");
      return;
    }
    setTournament(data);
    setFields(data.registrationFormFields || data.customFields || []);
  }, [id, navigate]);

  if (role !== "arbiter" && role !== "admin") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Create Registration Form"
          description="Access denied"
        />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              Only Arbiter/Admin can build registration forms.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-muted-foreground">
        Loading registration builder...
      </div>
    );
  }

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { label: "", type: "Text", required: false },
    ]);
  };

  const removeField = (index) => {
    const updated = [...fields];
    updated.splice(index, 1);
    setFields(updated);
  };

  const updateField = (index, key, value) => {
    const updated = [...fields];
    updated[index][key] = value;
    setFields(updated);
  };

  const validate = () => {
    const nextErrors = {};
    let valid = true;

    fields.forEach((field, index) => {
      if (!field.label || field.label.trim().length < 2) {
        nextErrors[index] = "Field Name is required (min 2 characters)";
        valid = false;
      }
      if (!FIELD_TYPES.includes(field.type)) {
        nextErrors[index] = "Invalid field type";
        valid = false;
      }
    });

    setErrors(nextErrors);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fix validation errors in form fields");
      return;
    }

    try {
      setSaving(true);
      updateTournament(id, {
        registrationFormFields: fields,
        customFields: fields,
      });
      toast.success("Registration form saved and linked to tournament");
      navigate(`/arbiter/tournament/${id}/summary`);
    } catch (error) {
      toast.error(error.message || "Failed to save registration form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/arbiter/tournament/${id}/summary`)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Event
        </Button>
        <Badge variant="outline">Step 3 of 3</Badge>
      </div>

      <PageHeader
        title="Create Registration Form"
        description={`Design a custom registration form for ${tournament.name}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration Form Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={index}
              className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-end border rounded-lg p-4 ${errors[index] ? "border-destructive" : ""}`}
            >
              <div className="md:col-span-4">
                <Label>Field Name</Label>
                <Input
                  placeholder="e.g. Player Age"
                  value={field.label}
                  onChange={(event) =>
                    updateField(index, "label", event.target.value)
                  }
                  className="mt-1.5"
                />
              </div>

              <div className="md:col-span-4">
                <Label>Field Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) => updateField(index, "type", value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex items-center gap-2 pb-2">
                <Switch
                  checked={Boolean(field.required)}
                  onCheckedChange={(checked) =>
                    updateField(index, "required", checked)
                  }
                />
                <Label>Required</Label>
              </div>

              <div className="md:col-span-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(index)}
                >
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              {errors[index] && (
                <p className="md:col-span-12 text-sm text-destructive">
                  {errors[index]}
                </p>
              )}
            </div>
          ))}

          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No fields added. Click + Add Field to start.
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={addField}>
              <Plus className="w-4 h-4 mr-2" /> Add Field
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
