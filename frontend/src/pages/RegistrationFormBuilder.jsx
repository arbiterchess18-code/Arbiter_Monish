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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  X,
  Eye,
  GripVertical,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  getTournamentById,
  saveRegistrationFormFields,
  getRegistrationFormFields,
} from "@/lib/tournament-service";
import { useRole } from "@/lib/role-context";

const FIELD_TYPES = [
  { value: "Text", label: "Text", description: "Single line text input" },
  { value: "Email", label: "Email", description: "Email input field" },
  { value: "Number", label: "Number", description: "Numeric input" },
  { value: "Date", label: "Date", description: "Date picker" },
  { value: "Dropdown", label: "Dropdown", description: "Dropdown select" },
  { value: "Text Area", label: "Text Area", description: "Multi-line text" },
];

export default function RegistrationFormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const [tournament, setTournament] = useState(null);
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const fetchTournamentAndFields = async () => {
      try {
        const data = await getTournamentById(id);
        if (!data) {
          toast.error("Tournament not found");
          navigate("/orbiter/create");
          return;
        }
        setTournament(data);

        // Fetch existing form fields
        const existingFields = await getRegistrationFormFields(id);
        if (existingFields && existingFields.length > 0) {
          setFields(existingFields);
        }
      } catch (error) {
        console.error("Error fetching tournament:", error);
        toast.error("Failed to load tournament");
        navigate("/orbiter/create");
      } finally {
        setLoading(false);
      }
    };
    fetchTournamentAndFields();
  }, [id, navigate]);

  if (role !== "arbiter" && role !== "admin") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loader"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        <PageHeader
          title="Create Registration Form"
          description="Tournament not found"
        />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              The tournament you're looking for doesn't exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        field_name: "",
        field_type: "Text",
        is_required: false,
        field_order: prev.length,
      },
    ]);
  };

  const removeField = (index) => {
    const updated = [...fields];
    updated.splice(index, 1);
    // Reorder remaining fields
    updated.forEach((field, idx) => {
      field.field_order = idx;
    });
    setFields(updated);
  };

  const updateField = (index, key, value) => {
    const updated = [...fields];
    updated[index][key] = value;
    setFields(updated);
    // Clear error for this field
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const moveField = (index, direction) => {
    const updated = [...fields];
    if (direction === "up" && index > 0) {
      [updated[index], updated[index - 1]] = [
        updated[index - 1],
        updated[index],
      ];
    } else if (direction === "down" && index < updated.length - 1) {
      [updated[index], updated[index + 1]] = [
        updated[index + 1],
        updated[index],
      ];
    }
    // Update order
    updated.forEach((field, idx) => {
      field.field_order = idx;
    });
    setFields(updated);
  };

  const validate = () => {
    const nextErrors = {};
    let valid = true;

    if (fields.length === 0) {
      toast.error("Add at least one field to create the registration form");
      return false;
    }

    fields.forEach((field, index) => {
      if (!field.field_name || field.field_name.trim().length < 2) {
        nextErrors[index] = "Field name is required (minimum 2 characters)";
        valid = false;
      }
      const validTypes = FIELD_TYPES.map((t) => t.value);
      if (!validTypes.includes(field.field_type)) {
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

    setSaving(true);
    try {
      await saveRegistrationFormFields(id, fields);
      toast.success("Registration form saved successfully!");
      setTimeout(() => {
        navigate(`/arbiter/tournament/${id}/summary`);
      }, 500);
    } catch (error) {
      console.error("Error saving form:", error);
      toast.error(error.message || "Failed to save registration form");
    } finally {
      setSaving(false);
    }
  };

  const getFieldTypeIcon = (type) => {
    const typeObj = FIELD_TYPES.find((t) => t.value === type);
    return typeObj?.label || type;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/arbiter/tournament/${id}/summary`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </Button>
          <Badge variant="secondary" className="text-xs px-3 py-1">
            Step 3: Registration Form
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          {showPreview ? "Hide" : "Show"} Preview
        </Button>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Create Registration Form</h1>
        <p className="text-muted-foreground">
          Design a custom registration form for{" "}
          <span className="font-semibold text-foreground">
            {tournament.tournament_name || tournament.name}
          </span>
        </p>
      </div>

      {/* Instructions Card */}
      <Card className="border-blue-500/30 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-blue-600 dark:text-blue-400 text-lg font-semibold">
              ℹ️
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                How to build your registration form
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
                <li>
                  Add fields that participants must fill out during signup
                </li>
                <li>Choose field types like Text, Email, Number, Date, etc.</li>
                <li>Mark fields as "Required" if they must be completed</li>
                <li>Reorder fields by dragging using the grip handle</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Form Builder */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Registration Form Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No fields added yet. Start building your form!
              </p>
              <Button onClick={addField} className="gap-2">
                <Plus className="w-4 h-4" /> Add First Field
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 bg-card transition-colors ${errors[index]
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-muted hover:border-muted-foreground/30"
                    }`}
                >
                  <div className="space-y-4">
                    {/* Field Editor Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Drag Handle */}
                      <div className="md:col-span-1 flex items-end justify-center pb-1 gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveField(index, "up")}
                          disabled={index === 0}
                          className="h-9 w-9"
                        >
                          <GripVertical className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Field Name */}
                      <div className="md:col-span-4">
                        <Label className="text-xs text-muted-foreground">
                          Field Name *
                        </Label>
                        <Input
                          placeholder="e.g. Player Rating"
                          value={field.field_name || ""}
                          onChange={(e) =>
                            updateField(index, "field_name", e.target.value)
                          }
                          className="mt-1"
                        />
                      </div>

                      {/* Field Type */}
                      <div className="md:col-span-4">
                        <Label className="text-xs text-muted-foreground">
                          Field Type *
                        </Label>
                        <Select
                          value={field.field_type || "Text"}
                          onValueChange={(value) =>
                            updateField(index, "field_type", value)
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Required Toggle */}
                      <div className="md:col-span-2 flex items-end gap-2 pb-0.5">
                        <Checkbox
                          id={`required-${index}`}
                          checked={Boolean(field.is_required)}
                          onCheckedChange={(checked) =>
                            updateField(index, "is_required", checked)
                          }
                        />
                        <Label
                          htmlFor={`required-${index}`}
                          className="text-xs cursor-pointer whitespace-nowrap"
                        >
                          Required
                        </Label>
                      </div>

                      {/* Delete Button */}
                      <div className="md:col-span-1 flex justify-end items-end pb-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(index)}
                          className="h-9 w-9 text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Error Message */}
                    {errors[index] && (
                      <div className="flex gap-2 items-start">
                        <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-destructive">
                          {errors[index]}
                        </p>
                      </div>
                    )}

                    {/* Field Preview */}
                    <div className="bg-muted/50 rounded p-3 border">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">
                            {field.field_name || "Unnamed Field"}
                          </label>
                          {field.is_required && (
                            <span className="text-destructive text-lg">*</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getFieldTypeIcon(field.field_type)} field
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Field Button */}
          {fields.length > 0 && (
            <Button
              variant="outline"
              onClick={addField}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" /> Add Another Field
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Form Preview (if enabled) */}
      {showPreview && fields.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Form Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is how the form will appear to participants during
              registration:
            </p>
            <div className="bg-background border rounded-lg p-6 space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    {field.field_name || "Unnamed Field"}
                    {field.is_required && (
                      <span className="text-destructive">*</span>
                    )}
                  </label>
                  {field.field_type === "Text Area" ? (
                    <textarea
                      disabled
                      className="w-full px-3 py-2 border rounded-md bg-muted text-sm"
                      placeholder="Sample text area input"
                      rows={3}
                    />
                  ) : field.field_type === "Dropdown" ? (
                    <select
                      disabled
                      className="w-full px-3 py-2 border rounded-md bg-muted text-sm"
                    >
                      <option>Select {field.field_name}</option>
                    </select>
                  ) : (
                    <input
                      disabled
                      type={
                        field.field_type === "Email"
                          ? "email"
                          : field.field_type === "Number"
                            ? "number"
                            : field.field_type === "Date"
                              ? "date"
                              : "text"
                      }
                      className="w-full px-3 py-2 border rounded-md bg-muted text-sm"
                      placeholder={`Enter ${field.field_name}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {fields.length > 0 && (
        <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">
                {fields.length} field{fields.length !== 1 ? "s" : ""} configured
              </p>
              <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                Save your form to link it to this tournament.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center pt-4">
        <Button
          variant="outline"
          onClick={() => navigate(`/arbiter/tournament/${id}/summary`)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving || fields.length === 0}
          className="gap-2"
        >
          {saving ? (
            <>
              <span className="animate-spin">⏳</span> Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Save Form
            </>
          )}
        </Button>
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>
          After saving, you'll be able to manage this form and publish your
          tournament.
        </p>
      </div>
    </div>
  );
}
