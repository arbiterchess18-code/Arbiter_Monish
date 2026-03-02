import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MapPin,
  ShieldCheck,
  Info,
  User,
  Phone,
  Mail,
  Building,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Trophy,
  Gamepad2,
  Settings,
  Upload,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createTournament,
  validateTournament,
  getTournamentById,
  updateTournament,
} from "@/lib/tournament-service";
import { useRole } from "@/lib/role-context";

export default function CreateTournament() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editTournamentId = searchParams.get("edit");
  const { role } = useRole();
  const canCreateTournament = role === "arbiter" || role === "admin";

  const [currentStep, setCurrentStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDragOver, setIsDragOver] = useState(false);

  const [tournamentData, setTournamentData] = useState({
    name: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    description: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    city: "",
    state: "",
    country: "India",
    venueName: "",
    googleMapsLink: "",
    registrationType: "Free",
    entryFee: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    organizerName: "",
    isOrganizerVerified: false,
    hasPrizes: false,
    prizeCategories: [],
    tieBreakers: ["Buchholz"],
    customFields: [],
    detailsPdfName: "",
    detailsPdfSize: 0,
    detailsPdfType: "",
    eventType: "Rapid",
    pairingSystem: "Swiss",
    type: "Swiss System",
    timeControl: "15",
    increment: "10",
    rounds: "5",
    maxPlayers: "64",
    minRating: "",
    mode: "Offline",
    isRated: false,
    isPrivate: false,
    fideId: "",
    aicfId: "",
    kscaId: "",
  });

  useEffect(() => {
    if (tournamentData.type === "Swiss System") {
      const suggestedRounds = Math.ceil(
        Math.log2(parseInt(tournamentData.maxPlayers) || 64),
      );
      setTournamentData((prev) => ({
        ...prev,
        rounds: suggestedRounds.toString(),
      }));
    }
  }, [tournamentData.type, tournamentData.maxPlayers]);

  useEffect(() => {
    if (!editTournamentId) return;
    const fetchTournament = async () => {
      const existingTournament = await getTournamentById(editTournamentId);
      if (!existingTournament) {
        toast.error("Tournament not found for editing");
        return;
      }
      setTournamentData((prev) => ({
        ...prev,
        ...existingTournament,
        name: existingTournament.tournament_name || existingTournament.name,
        pairingSystem:
          existingTournament.pairingSystem ||
          (existingTournament.type === "Swiss System" ? "Swiss" : "Swiss"),
        eventType: existingTournament.eventType || prev.eventType,
      }));
    };
    fetchTournament();
  }, [editTournamentId]);

  const validateField = (field, value) => {
    let error = "";
    switch (field) {
      case "name":
        if (!value || value.trim().length < 3) {
          error = "Tournament name must be at least 3 characters";
        }
        break;
      case "startDate":
        if (!value) error = "This field is required";
        break;
      case "contactEmail":
        if (!value) {
          error = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = "Invalid email format";
        }
        break;
      case "contactPhone":
        if (!value) {
          error = "Phone number is required";
        } else if (!/^\+?[\d\s-]{10,15}$/.test(value)) {
          error = "Invalid phone number (10-15 digits)";
        }
        break;
      case "contactPerson":
      case "venueName":
      case "organizerName":
        if (!value || value.trim().length < 2) {
          error = "This field is required (minimum 2 characters)";
        }
        break;
      case "eventType":
      case "pairingSystem":
        if (!value) error = "This field is required";
        break;
      case "timeControl":
      case "increment":
      case "rounds":
        if (!value || parseFloat(value) <= 0) {
          error = "Must be a positive number";
        }
        break;
      case "entryFee":
        if (
          tournamentData.registrationType === "Paid" &&
          (!value || parseFloat(value) <= 0)
        ) {
          error = "Entry fee must be greater than 0 for paid tournaments";
        }
        break;
      case "accountNumber":
        if (
          tournamentData.registrationType === "Paid" &&
          value &&
          !/^\d{9,18}$/.test(value)
        ) {
          error = "Invalid account number (9-18 digits)";
        }
        break;
      case "ifscCode":
        if (
          tournamentData.registrationType === "Paid" &&
          value &&
          !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)
        ) {
          error = "Invalid IFSC code (e.g., SBIN0001234)";
        }
        break;
      case "fideId":
      case "aicfId":
      case "kscaId":
        if (value && !/^[a-zA-Z0-9]+$/.test(value)) {
          error = "Only alphanumeric characters are allowed";
        }
        break;
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleInputChange = (field, value) => {
    if (field === "isPrivate") {
      setTournamentData((prev) => ({
        ...prev,
        isPrivate: value,
        customFields: value ? prev.customFields : [],
      }));
      return;
    }
    if (field === "isRated") {
      setTournamentData((prev) => ({
        ...prev,
        isRated: value,
        fideId: value ? prev.fideId : "",
        aicfId: value ? prev.aicfId : "",
        kscaId: value ? prev.kscaId : "",
      }));
      if (!value) {
        setErrors((prev) => ({
          ...prev,
          fideId: "",
          aicfId: "",
          kscaId: "",
        }));
      }
      return;
    }
    if (field === "pairingSystem") {
      const typeMap = {
        Swiss: "Swiss System",
        "Round Robin": "Round Robin",
        Knockout: "Knockout",
        Arena: "Arena",
      };
      setTournamentData((prev) => ({
        ...prev,
        pairingSystem: value,
        type: typeMap[value] || value,
      }));
      validateField("pairingSystem", value);
      return;
    }
    setTournamentData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handlePdfFile = (file) => {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    const maxSizeBytes = 10 * 1024 * 1024;

    if (!isPdf) {
      setErrors((prev) => ({
        ...prev,
        detailsPdf: "Only PDF files are allowed",
      }));
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > maxSizeBytes) {
      setErrors((prev) => ({
        ...prev,
        detailsPdf: "PDF file must be 10MB or less",
      }));
      toast.error("PDF file must be 10MB or less");
      return;
    }
    setTournamentData((prev) => ({
      ...prev,
      detailsPdfName: file.name,
      detailsPdfSize: file.size,
      detailsPdfType: "application/pdf",
    }));
    setErrors((prev) => ({ ...prev, detailsPdf: "" }));
  };

  const handlePdfDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    handlePdfFile(file);
  };

  const addPrize = () => {
    setTournamentData((prev) => ({
      ...prev,
      prizeCategories: [...prev.prizeCategories, { category: "", amount: "" }],
    }));
  };

  const removePrize = (index) => {
    const updated = [...tournamentData.prizeCategories];
    updated.splice(index, 1);
    setTournamentData((prev) => ({ ...prev, prizeCategories: updated }));
  };

  const updatePrize = (index, field, value) => {
    const updated = [...tournamentData.prizeCategories];
    updated[index][field] = value;
    setTournamentData((prev) => ({ ...prev, prizeCategories: updated }));
  };

  const toggleTieBreaker = (method) => {
    setTournamentData((prev) => {
      const current = prev.tieBreakers;
      if (current.includes(method)) {
        return { ...prev, tieBreakers: current.filter((m) => m !== method) };
      } else {
        return { ...prev, tieBreakers: [...current, method] };
      }
    });
  };

  const addCustomField = () => {
    setTournamentData((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { label: "", type: "Text", required: false },
      ],
    }));
  };

  const removeCustomField = (index) => {
    const updated = [...tournamentData.customFields];
    updated.splice(index, 1);
    setTournamentData((prev) => ({ ...prev, customFields: updated }));
  };

  const updateCustomField = (index, field, value) => {
    const updated = [...tournamentData.customFields];
    updated[index][field] = value;
    setTournamentData((prev) => ({ ...prev, customFields: updated }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    let isValid = true;

    if (step === 1) {
      // Step 1: Validate essential general info fields only
      const requiredFields = {
        name: "Tournament name is required (minimum 3 characters)",
        startDate: "Start date is required",
        contactPerson: "Contact person is required",
        contactEmail: "Contact email is required",
        contactPhone: "Contact phone is required",
        city: "City is required",
        venueName: "Venue name is required",
        organizerName: "Organizer name is required",
      };

      // Check name length
      if (!tournamentData.name || tournamentData.name.trim().length < 3) {
        newErrors.name = "Tournament name must be at least 3 characters";
        isValid = false;
      }

      // Check contact email format
      if (!tournamentData.contactEmail) {
        newErrors.contactEmail = "Contact email is required";
        isValid = false;
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tournamentData.contactEmail)
      ) {
        newErrors.contactEmail = "Invalid email format";
        isValid = false;
      }

      // Check phone format
      if (!tournamentData.contactPhone) {
        newErrors.contactPhone = "Contact phone is required";
        isValid = false;
      } else if (!/^\+?[\d\s-()]{10,15}$/.test(tournamentData.contactPhone)) {
        newErrors.contactPhone = "Phone must be 10-15 digits";
        isValid = false;
      }

      // Check other required fields (just non-empty)
      [
        "startDate",
        "contactPerson",
        "city",
        "venueName",
        "organizerName",
      ].forEach((field) => {
        const value = tournamentData[field];
        if (!value || (typeof value === "string" && value.trim() === "")) {
          newErrors[field] = requiredFields[field];
          isValid = false;
        }
      });

      // Date validation
      if (
        tournamentData.startDate &&
        tournamentData.endDate &&
        new Date(tournamentData.endDate) < new Date(tournamentData.startDate)
      ) {
        newErrors.endDate = "End date must be after start date";
        isValid = false;
      }
    } else if (step === 2) {
      // Step 2: Validate game settings
      if (!tournamentData.eventType) {
        newErrors.eventType = "Event type is required";
        isValid = false;
      }

      if (!tournamentData.pairingSystem) {
        newErrors.pairingSystem = "Pairing system is required";
        isValid = false;
      }

      // Validate numeric fields
      ["timeControl", "increment", "rounds"].forEach((field) => {
        const value = tournamentData[field];
        if (!value || parseFloat(value) <= 0) {
          newErrors[field] = `${field} must be a positive number`;
          isValid = false;
        }
      });

      // If prizes are enabled, validate them
      if (tournamentData.hasPrizes) {
        if (tournamentData.prizeCategories.length === 0) {
          newErrors.prizeCategories = "Add at least one prize category";
          isValid = false;
        } else {
          tournamentData.prizeCategories.forEach((prize, index) => {
            if (!prize.category || prize.category.trim().length < 2) {
              newErrors[`prizeCategory_${index}`] = "Category name required";
              isValid = false;
            }
            if (!prize.amount || Number(prize.amount) <= 0) {
              newErrors[`prizeAmount_${index}`] = "Amount must be > 0";
              isValid = false;
            }
          });
        }
      }

      // Validate tie-breakers for Swiss system
      if (
        tournamentData.pairingSystem === "Swiss" &&
        tournamentData.tieBreakers.length === 0
      ) {
        newErrors.tieBreakers = "Select at least one tie breaker for Swiss";
        isValid = false;
      }
    } else if (step === 3) {
      // Step 3: Validate payment and rating fields if applicable
      if (tournamentData.registrationType === "Paid") {
        ["entryFee", "accountHolderName", "accountNumber", "ifscCode"].forEach(
          (field) => {
            const value = tournamentData[field];
            if (!value || (typeof value === "string" && value.trim() === "")) {
              newErrors[field] = "This field is required for paid tournaments";
              isValid = false;
            }
          },
        );
      }

      // Validate rating IDs if rated
      if (tournamentData.isRated) {
        ["fideId", "aicfId", "kscaId"].forEach((field) => {
          const value = tournamentData[field];
          if (value && !/^[a-zA-Z0-9]+$/.test(value)) {
            newErrors[field] = "Only alphanumeric characters allowed";
            isValid = false;
          }
        });
      }

      // Validate custom fields if private
      if (tournamentData.isPrivate) {
        tournamentData.customFields.forEach((field, index) => {
          if (
            !field.label ||
            (typeof field.label === "string" && field.label.trim().length < 2)
          ) {
            newErrors[`customField_${index}`] = "Field label required";
            isValid = false;
          }
        });
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success(`Proceeding to Step ${currentStep + 1}`);
    } else {
      toast.error("Please fix validation errors before proceeding");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast.error("Please fix all validation errors before submitting");
      return;
    }

    const serviceValidation = validateTournament(tournamentData);
    if (!serviceValidation.isValid) {
      toast.error(serviceValidation.errors[0] || "Tournament data is invalid");
      return;
    }

    setIsPublishing(true);
    try {
      const payload = {
        ...tournamentData,
        customFields: tournamentData.isPrivate
          ? tournamentData.customFields
          : [],
        fideId: tournamentData.isRated ? tournamentData.fideId : "",
        aicfId: tournamentData.isRated ? tournamentData.aicfId : "",
        kscaId: tournamentData.isRated ? tournamentData.kscaId : "",
      };

      const savedTournament = editTournamentId
        ? await updateTournament(editTournamentId, payload)
        : await createTournament(payload);

      toast.success(
        editTournamentId
          ? "Tournament updated successfully!"
          : "Tournament created successfully!",
      );

      const savedId = savedTournament.tournament_id || savedTournament.id;
      setTimeout(() => {
        navigate(`/arbiter/tournament/${savedId}/summary`);
      }, 500);
    } catch (error) {
      toast.error(error.message || "Failed to create tournament");
    } finally {
      setIsPublishing(false);
    }
  };

  // Step Indicator Component
  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-colors ${currentStep >= step
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
                }`}
            >
              {step < currentStep && <CheckCircle2 className="w-5 h-5" />}
              {step >= currentStep && step}
            </div>
            {step < 3 && (
              <div
                className={`flex-1 h-1 mx-2 rounded ${currentStep > step ? "bg-primary" : "bg-muted"
                  }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-sm text-muted-foreground px-1">
        <span>General Info</span>
        <span>Game Settings &amp; Prizes</span>
        <span>Details &amp; IDs</span>
      </div>
    </div>
  );

  if (!canCreateTournament) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-20">
        <PageHeader
          title="Create Tournament"
          description="Multi-step tournament creation"
        />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Only users with Arbiter/Admin role can create tournaments.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <PageHeader
        title={editTournamentId ? "Edit Tournament" : "Create Tournament"}
        description="Complete the steps below to create your tournament"
      />

      <StepIndicator />

      {/* STEP 1: General Info */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="stat-card">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                <Info className="w-5 h-5" /> Basic Information
              </div>

              <div>
                <Label>
                  Tournament Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. National Chess Championship 2024"
                  value={tournamentData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`mt-1.5 ${errors.name ? "border-destructive" : ""}`}
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={tournamentData.startDate}
                    onChange={(e) =>
                      handleInputChange("startDate", e.target.value)
                    }
                    className={`mt-1.5 ${errors.startDate ? "border-destructive" : ""
                      }`}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.startDate}
                    </p>
                  )}
                </div>

                <div>
                  <Label>
                    Start Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="time"
                    value={tournamentData.startTime}
                    onChange={(e) =>
                      handleInputChange("startTime", e.target.value)
                    }
                    className={`mt-1.5 ${errors.startTime ? "border-destructive" : ""
                      }`}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.startTime}
                    </p>
                  )}
                </div>

                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={tournamentData.endDate}
                    onChange={(e) =>
                      handleInputChange("endDate", e.target.value)
                    }
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label>Tournament Description</Label>
                <Textarea
                  placeholder="Provide details about rules, schedule, and other important information..."
                  value={tournamentData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="mt-1.5 h-20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="stat-card">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                <User className="w-5 h-5" /> Contact Information
              </div>

              <div>
                <Label>
                  Contact Person <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Full name of the contact person"
                  value={tournamentData.contactPerson}
                  onChange={(e) =>
                    handleInputChange("contactPerson", e.target.value)
                  }
                  className={`mt-1.5 ${errors.contactPerson ? "border-destructive" : ""
                    }`}
                />
                {errors.contactPerson && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.contactPerson}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>
                    Contact Email <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="contact@example.com"
                      value={tournamentData.contactEmail}
                      onChange={(e) =>
                        handleInputChange("contactEmail", e.target.value)
                      }
                      className={`mt-1.5 pl-10 ${errors.contactEmail ? "border-destructive" : ""
                        }`}
                    />
                  </div>
                  {errors.contactEmail && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.contactEmail}
                    </p>
                  )}
                </div>

                <div>
                  <Label>
                    Contact Phone <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={tournamentData.contactPhone}
                      onChange={(e) =>
                        handleInputChange("contactPhone", e.target.value)
                      }
                      className={`mt-1.5 pl-10 ${errors.contactPhone ? "border-destructive" : ""
                        }`}
                    />
                  </div>
                  {errors.contactPhone && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.contactPhone}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venue Information */}
          <Card className="stat-card">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                <Building className="w-5 h-5" /> Venue Information
              </div>

              <div>
                <Label>
                  Venue Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Grand Chess Hall"
                  value={tournamentData.venueName}
                  onChange={(e) =>
                    handleInputChange("venueName", e.target.value)
                  }
                  className={`mt-1.5 ${errors.venueName ? "border-destructive" : ""
                    }`}
                />
                {errors.venueName && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.venueName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Mumbai"
                    value={tournamentData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className={`mt-1.5 ${errors.city ? "border-destructive" : ""}`}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.city}
                    </p>
                  )}
                </div>

                <div>
                  <Label>State</Label>
                  <Input
                    placeholder="e.g. Maharashtra"
                    value={tournamentData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label>
                    Country <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="India"
                    value={tournamentData.country}
                    onChange={(e) =>
                      handleInputChange("country", e.target.value)
                    }
                    className={`mt-1.5 ${errors.country ? "border-destructive" : ""
                      }`}
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.country}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>
                  Google Maps Link{" "}
                  <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={tournamentData.googleMapsLink}
                    onChange={(e) =>
                      handleInputChange("googleMapsLink", e.target.value)
                    }
                    className={`mt-1.5 pl-10 ${errors.googleMapsLink ? "border-destructive" : ""
                      }`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organizer Information */}
          <Card className="stat-card">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                <ShieldCheck className="w-5 h-5" /> Organizer Details
              </div>

              <div>
                <Label>
                  Organizer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Name of organizing body/individual"
                  value={tournamentData.organizerName}
                  onChange={(e) =>
                    handleInputChange("organizerName", e.target.value)
                  }
                  className={`mt-1.5 ${errors.organizerName ? "border-destructive" : ""
                    }`}
                />
                {errors.organizerName && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.organizerName}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    Verified Organizer
                    {tournamentData.isOrganizerVerified && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Mark this organizer as verified
                  </p>
                </div>
                <Switch
                  checked={tournamentData.isOrganizerVerified}
                  onCheckedChange={(checked) =>
                    handleInputChange("isOrganizerVerified", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Registration Details */}
          <Card className="stat-card">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                <DollarSign className="w-5 h-5" /> Registration Type
              </div>

              <div>
                <RadioGroup
                  value={tournamentData.registrationType}
                  onValueChange={(value) =>
                    handleInputChange("registrationType", value)
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3 flex-1 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="Free" id="free" />
                    <Label htmlFor="free" className="cursor-pointer flex-1">
                      Free Tournament
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 flex-1 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="Paid" id="paid" />
                    <Label htmlFor="paid" className="cursor-pointer flex-1">
                      Paid Tournament
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {tournamentData.registrationType === "Paid" && (
                <div>
                  <Label>
                    Entry Fee (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 500"
                    value={tournamentData.entryFee}
                    onChange={(e) =>
                      handleInputChange("entryFee", e.target.value)
                    }
                    className={`mt-1.5 ${errors.entryFee ? "border-destructive" : ""
                      }`}
                  />
                  {errors.entryFee && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.entryFee}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 2: Game Settings + Prizes */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Game Control */}
          <Card className="stat-card">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                <Gamepad2 className="w-5 h-5" /> Game Settings
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>
                    Type of Event <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={tournamentData.eventType}
                    onValueChange={(value) =>
                      handleInputChange("eventType", value)
                    }
                  >
                    <SelectTrigger
                      className={`mt-1.5 ${errors.eventType ? "border-destructive" : ""
                        }`}
                    >
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Blitz">Blitz</SelectItem>
                      <SelectItem value="Rapid">Rapid</SelectItem>
                      <SelectItem value="Classical">Classical</SelectItem>
                      <SelectItem value="Bullet">Bullet</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.eventType && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.eventType}
                    </p>
                  )}
                </div>

                <div>
                  <Label>
                    Pairing System <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={tournamentData.pairingSystem}
                    onValueChange={(value) =>
                      handleInputChange("pairingSystem", value)
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Swiss">Swiss</SelectItem>
                      <SelectItem value="Round Robin">Round Robin</SelectItem>
                      <SelectItem value="Knockout">Knockout</SelectItem>
                      <SelectItem value="Arena">Arena</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>
                    Time Control (minutes){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="15"
                    value={tournamentData.timeControl}
                    onChange={(e) =>
                      handleInputChange("timeControl", e.target.value)
                    }
                    className={`mt-1.5 ${errors.timeControl ? "border-destructive" : ""
                      }`}
                  />
                  {errors.timeControl && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.timeControl}
                    </p>
                  )}
                </div>

                <div>
                  <Label>
                    Time Increment (seconds){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={tournamentData.increment}
                    onChange={(e) =>
                      handleInputChange("increment", e.target.value)
                    }
                    className={`mt-1.5 ${errors.increment ? "border-destructive" : ""
                      }`}
                  />
                  {errors.increment && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.increment}
                    </p>
                  )}
                </div>

                <div>
                  <Label>
                    Number of Rounds <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={tournamentData.rounds}
                    onChange={(e) =>
                      handleInputChange("rounds", e.target.value)
                    }
                    className={`mt-1.5 ${errors.rounds ? "border-destructive" : ""
                      }`}
                  />
                  {errors.rounds && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.rounds}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prize Categories */}
          <Card className="stat-card">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Trophy className="w-5 h-5" /> Prize Categories
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Has Prizes?</Label>
                  <Switch
                    checked={tournamentData.hasPrizes}
                    onCheckedChange={(checked) =>
                      handleInputChange("hasPrizes", checked)
                    }
                  />
                </div>
              </div>

              {tournamentData.hasPrizes && (
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPrize}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Prize Category
                  </Button>

                  {tournamentData.prizeCategories.map((prize, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 items-end p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <Label>Category</Label>
                        <Input
                          placeholder="e.g., Winner, Runner-up"
                          className="mt-1"
                          value={prize.category}
                          onChange={(e) =>
                            updatePrize(idx, "category", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Amount (₹)</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 10000"
                          className="mt-1"
                          value={prize.amount}
                          onChange={(e) =>
                            updatePrize(idx, "amount", e.target.value)
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePrize(idx)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {errors.prizeCategories && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{" "}
                      {errors.prizeCategories}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tie Breaker Rules */}
          {tournamentData.pairingSystem === "Swiss" && (
            <Card className="stat-card">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                  <Settings className="w-5 h-5" /> Tie Breaker Rules
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Select tie breaker methods in order of priority
                </p>

                <div className="space-y-3">
                  {[
                    {
                      id: "buchholz",
                      value: "Buchholz",
                      label: "Buchholz",
                      desc: "Sum of opponents' scores",
                    },
                    {
                      id: "sonneborn",
                      value: "Sonneborn-Berger",
                      label: "Sonneborn-Berger",
                      desc: "Weighted opponents' scores",
                    },
                    {
                      id: "blackWins",
                      value: "Number of Wins with Black Pieces",
                      label: "Number of Wins with Black Pieces",
                      desc: "Counts victories as Black",
                    },
                  ].map((breaker) => (
                    <div
                      key={breaker.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <Checkbox
                        id={breaker.id}
                        checked={tournamentData.tieBreakers.includes(
                          breaker.value,
                        )}
                        onCheckedChange={() => toggleTieBreaker(breaker.value)}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={breaker.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {breaker.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {breaker.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.tieBreakers && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.tieBreakers}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* STEP 3: PDF + Rating IDs + Payment + Custom Fields */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Document Upload */}
          <Card className="stat-card">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                <Upload className="w-5 h-5" /> Tournament Document
              </div>
              <p className="text-sm text-muted-foreground">
                Upload a PDF file with tournament details (optional)
              </p>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handlePdfDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/30"
                  }`}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">
                  Drag & Drop PDF here
                </p>
                <Label htmlFor="detailsPdf" className="inline-block">
                  <span className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium cursor-pointer hover:bg-muted">
                    Choose File
                  </span>
                </Label>
                <Input
                  id="detailsPdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(event) => handlePdfFile(event.target.files?.[0])}
                />
                {tournamentData.detailsPdfName && (
                  <p className="text-sm mt-3">
                    Selected:{" "}
                    <span className="font-medium">
                      {tournamentData.detailsPdfName}
                    </span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tournament Controls */}
          <Card className="stat-card">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                <Settings className="w-5 h-5" /> Tournament Controls
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div>
                  <Label>Private Tournament</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable custom registration fields
                  </p>
                </div>
                <Switch
                  checked={tournamentData.isPrivate}
                  onCheckedChange={(checked) =>
                    handleInputChange("isPrivate", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div>
                  <Label>Rated Tournament</Label>
                  <p className="text-xs text-muted-foreground">
                    Make this a rated tournament
                  </p>
                </div>
                <Switch
                  checked={tournamentData.isRated}
                  onCheckedChange={(checked) =>
                    handleInputChange("isRated", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Rating IDs */}
          {tournamentData.isRated && (
            <Card className="stat-card border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                  <Badge>Rating IDs</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "FIDE Event ID", field: "fideId" },
                    { label: "AICF Event ID", field: "aicfId" },
                    { label: "KSCA Event ID", field: "kscaId" },
                  ].map((item) => (
                    <div key={item.field}>
                      <Label>{item.label}</Label>
                      <Input
                        placeholder={`Enter ${item.label.toLowerCase()}`}
                        value={tournamentData[item.field]}
                        onChange={(e) =>
                          handleInputChange(item.field, e.target.value)
                        }
                        className={`mt-1.5 ${errors[item.field] ? "border-destructive" : ""
                          }`}
                      />
                      {errors[item.field] && (
                        <p className="text-sm text-destructive mt-1">
                          {errors[item.field]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Fields */}
          {tournamentData.isPrivate && (
            <Card className="stat-card border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Settings className="w-5 h-5" /> Custom Fields
                  </div>
                  <Button variant="outline" size="sm" onClick={addCustomField}>
                    <Plus className="w-4 h-4 mr-1" /> Add Field
                  </Button>
                </div>

                {tournamentData.customFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 items-end p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <Label>Label</Label>
                      <Input
                        placeholder="e.g., T-Shirt Size"
                        className="mt-1"
                        value={field.label}
                        onChange={(e) =>
                          updateCustomField(idx, "label", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(value) =>
                          updateCustomField(idx, "type", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Text">Text</SelectItem>
                          <SelectItem value="Number">Number</SelectItem>
                          <SelectItem value="Dropdown">Dropdown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                      <Checkbox
                        id={`required-${idx}`}
                        checked={field.required}
                        onCheckedChange={(checked) =>
                          updateCustomField(idx, "required", checked)
                        }
                      />
                      <Label
                        htmlFor={`required-${idx}`}
                        className="text-sm cursor-pointer"
                      >
                        Required
                      </Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomField(idx)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          {tournamentData.registrationType === "Paid" && (
            <Card className="stat-card border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                  <DollarSign className="w-5 h-5" /> Payment Details
                </div>

                <div>
                  <Label>
                    Account Holder Name{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Full name as per bank records"
                    value={tournamentData.accountHolderName}
                    onChange={(e) =>
                      handleInputChange("accountHolderName", e.target.value)
                    }
                    className={`mt-1.5 ${errors.accountHolderName ? "border-destructive" : ""
                      }`}
                  />
                  {errors.accountHolderName && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.accountHolderName}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>
                      Account Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Enter bank account number"
                      value={tournamentData.accountNumber}
                      onChange={(e) =>
                        handleInputChange("accountNumber", e.target.value)
                      }
                      className={`mt-1.5 ${errors.accountNumber ? "border-destructive" : ""
                        }`}
                    />
                    {errors.accountNumber && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.accountNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>
                      IFSC Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. SBIN0001234"
                      value={tournamentData.ifscCode}
                      onChange={(e) =>
                        handleInputChange(
                          "ifscCode",
                          e.target.value.toUpperCase(),
                        )
                      }
                      className={`mt-1.5 ${errors.ifscCode ? "border-destructive" : ""
                        }`}
                    />
                    {errors.ifscCode && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.ifscCode}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center gap-4 pt-8 border-t">
        <Button
          variant="outline"
          onClick={handlePreviousStep}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Previous
        </Button>

        <div className="text-sm text-muted-foreground font-medium">
          Step {currentStep} of 3
        </div>

        {currentStep < 3 ? (
          <Button onClick={handleNextStep} className="gap-2">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isPublishing}
            className="gap-2"
          >
            {isPublishing ? (
              <>
                <span className="animate-spin">⏳</span> Publishing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Submit Tournament
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
