import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";

export default function CustomRegistrationForm({
  tournament,
  onSubmit,
  isSubmitting,
  onCancel,
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const customFields = tournament.customFields || [];

  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear error on change
    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    customFields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }

      // Type-specific validation
      if (formData[field.name]) {
        switch (field.type) {
          case "email":
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[field.name])) {
              newErrors[field.name] = "Invalid email address";
            }
            break;
          case "number":
            if (isNaN(formData[field.name])) {
              newErrors[field.name] = "Must be a valid number";
            }
            break;
          case "date":
            if (!new Date(formData[field.name]).getTime()) {
              newErrors[field.name] = "Invalid date";
            }
            break;
          default:
            break;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const renderField = (field) => {
    const fieldKey = field.name || field.id;

    switch (field.type) {
      case "text":
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id={fieldKey}
              type="text"
              placeholder={field.placeholder}
              value={formData[fieldKey] || ""}
              onChange={(e) => handleInputChange(fieldKey, e.target.value)}
              disabled={isSubmitting}
            />
            {errors[fieldKey] && (
              <p className="text-sm text-destructive">{errors[fieldKey]}</p>
            )}
          </div>
        );

      case "email":
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id={fieldKey}
              type="email"
              placeholder={field.placeholder}
              value={formData[fieldKey] || ""}
              onChange={(e) => handleInputChange(fieldKey, e.target.value)}
              disabled={isSubmitting}
            />
            {errors[fieldKey] && (
              <p className="text-sm text-destructive">{errors[fieldKey]}</p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id={fieldKey}
              type="number"
              placeholder={field.placeholder}
              value={formData[fieldKey] || ""}
              onChange={(e) => handleInputChange(fieldKey, e.target.value)}
              disabled={isSubmitting}
            />
            {errors[fieldKey] && (
              <p className="text-sm text-destructive">{errors[fieldKey]}</p>
            )}
          </div>
        );

      case "date":
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id={fieldKey}
              type="date"
              value={formData[fieldKey] || ""}
              onChange={(e) => handleInputChange(fieldKey, e.target.value)}
              disabled={isSubmitting}
            />
            {errors[fieldKey] && (
              <p className="text-sm text-destructive">{errors[fieldKey]}</p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            <Textarea
              id={fieldKey}
              placeholder={field.placeholder}
              value={formData[fieldKey] || ""}
              onChange={(e) => handleInputChange(fieldKey, e.target.value)}
              disabled={isSubmitting}
            />
            {errors[fieldKey] && (
              <p className="text-sm text-destructive">{errors[fieldKey]}</p>
            )}
          </div>
        );

      case "select":
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            <Select
              value={formData[fieldKey] || ""}
              onValueChange={(value) => handleInputChange(fieldKey, value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id={fieldKey}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors[fieldKey] && (
              <p className="text-sm text-destructive">{errors[fieldKey]}</p>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div key={fieldKey} className="flex items-center space-x-2">
            <Checkbox
              id={fieldKey}
              checked={formData[fieldKey] || false}
              onCheckedChange={(checked) =>
                handleInputChange(fieldKey, checked)
              }
              disabled={isSubmitting}
            />
            <Label htmlFor={fieldKey} className="font-normal cursor-pointer">
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {customFields.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p>No additional fields required for registration.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {customFields.map((field) => renderField(field))}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Registration"}
        </Button>
      </div>
    </form>
  );
}
