import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  AlertTriangle,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRegistrationFormFields,
  registerPlayer,
} from "@/lib/tournament-service";

export function JoinTournamentDialog({
  tournament,
  open,
  onOpenChange,
  onSuccess,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);
  const [registrationFields, setRegistrationFields] = useState([]);
  const [customFormData, setCustomFormData] = useState({});
  const [customFormErrors, setCustomFormErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    rating: "",
    fideId: "",
    title: "",
  });
  const [notifications, setNotifications] = useState({
    start: true,
    rounds: true,
    results: false,
  });

  if (!tournament) return null;

  const tournamentId = tournament.id ?? tournament.tournament_id;
  const tournamentName = tournament.name ?? tournament.tournament_name;
  const minRating = tournament.minRating ?? tournament.min_rating;

  // Pre-fill from userData if available
  const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      name: prev.name || userData.name || "",
      email: prev.email || userData.email || "",
      rating: prev.rating || userData.rating || "",
    }));
  }, [userData.email, userData.name, userData.rating]);

  useEffect(() => {
    const fetchFields = async () => {
      if (!open || !tournamentId) return;
      setLoadingCustomFields(true);
      const fields = await getRegistrationFormFields(tournamentId);
      setRegistrationFields(fields || []);
      setLoadingCustomFields(false);
    };
    fetchFields();
  }, [open, tournamentId]);

  const useCustomRegistration = registrationFields.length > 0;

  const isEligible =
    useCustomRegistration ||
    !minRating ||
    parseInt(formData.rating) >= parseInt(minRating);

  const validateCustomForm = () => {
    const nextErrors = {};
    registrationFields.forEach((field) => {
      if (field.field_type === "Display Image") return;
      if (!field.is_required) return;
      const value = customFormData[field.field_name];
      if (!value || `${value}`.trim() === "") {
        nextErrors[field.field_name] = `${field.field_name} is required`;
      }
    });
    setCustomFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const canJoin = useCustomRegistration
    ? registrationFields.every((field) => {
        if (field.field_type === "Display Image") return true;
        if (!field.is_required) return true;
        const value = customFormData[field.field_name];
        return (
          value !== undefined && value !== null && `${value}`.trim() !== ""
        );
      })
    : isEligible && formData.name && formData.email;

  const handleJoinClick = () => {
    if (useCustomRegistration && !validateCustomForm()) {
      toast.error("Please fill all required custom fields");
      return;
    }

    if (!canJoin) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (
      tournament.rated &&
      tournament.entryFee &&
      tournament.entryFee !== "0"
    ) {
      setConfirmOpen(true);
    } else {
      handleConfirmJoin();
    }
  };

  const handleConfirmJoin = async () => {
    setConfirmOpen(false);
    setRegistering(true);

    try {
      await registerPlayer(
        tournamentId,
        useCustomRegistration
          ? customFormData
          : {
              ...formData,
              rating: parseInt(formData.rating) || 0,
            },
      );

      toast.success(`Successfully joined ${tournamentName}!`, {
        description: notifications.start
          ? "You'll be notified when the tournament starts."
          : undefined,
      });

      onSuccess?.();
      onOpenChange(false);

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        rating: "",
        fideId: "",
        title: "",
      });
      setCustomFormData({});
      setCustomFormErrors({});
    } catch (error) {
      toast.error(error.message || "Failed to register");
    } finally {
      setRegistering(false);
    }
  };

  const renderCustomField = (field) => {
    const fieldName = field.field_name;
    const value = customFormData[fieldName] || "";

    const onChange = (nextValue) => {
      setCustomFormData((prev) => ({
        ...prev,
        [fieldName]: nextValue,
      }));
      if (customFormErrors[fieldName]) {
        setCustomFormErrors((prev) => {
          const updated = { ...prev };
          delete updated[fieldName];
          return updated;
        });
      }
    };

    if (field.field_type === "Display Image") {
      return (
        <div key={field.field_id || fieldName} className="space-y-2">
          {fieldName ? <Label>{fieldName}</Label> : null}
          {field.field_image ? (
            <img
              src={field.field_image}
              alt={fieldName || "Registration information image"}
              className="max-h-56 w-auto rounded-md border"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Registration image will be shown here.
            </p>
          )}
        </div>
      );
    }

    return (
      <div key={field.field_id || fieldName} className="space-y-2">
        <Label>
          {fieldName}
          {field.is_required ? (
            <span className="text-destructive"> *</span>
          ) : null}
        </Label>

        {field.field_type === "Text" && (
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {field.field_type === "Email" && (
          <Input
            type="email"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {field.field_type === "Number" && (
          <Input
            type="number"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {field.field_type === "Date" && (
          <Input
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {field.field_type === "Text Area" && (
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {field.field_type === "Dropdown" && (
          <Input
            placeholder={`Enter ${fieldName}`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}

        {customFormErrors[fieldName] ? (
          <p className="text-xs text-destructive">
            {customFormErrors[fieldName]}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {tournament.name}
            </DialogTitle>
            <DialogDescription>
              Review tournament details before joining
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={tournament.rated ? "default" : "secondary"}>
                {tournament.rated ? "Rated" : "Unrated"}
              </Badge>
              <Badge variant="outline">{tournament.type}</Badge>
              <Badge variant="outline">{tournament.mode}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {tournament.registeredPlayers?.length || 0}/
                  {tournament.maxPlayers || 64} players
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {tournament.timeControl}+{tournament.increment}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{tournament.startDate}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{tournament.venue || "Online"}</span>
              </div>
              {tournament.prizePool && (
                <div className="flex items-center gap-2 text-chess-gold font-medium col-span-2">
                  <Trophy className="h-4 w-4" />
                  <span>Prize Pool: {tournament.prizePool}</span>
                </div>
              )}
            </div>

            {/* Registration Form */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="font-medium text-sm">
                {useCustomRegistration
                  ? "Custom Registration Form"
                  : "Player Information"}
              </div>

              {loadingCustomFields ? (
                <div className="text-sm text-muted-foreground">
                  Loading registration form...
                </div>
              ) : null}

              {!loadingCustomFields && useCustomRegistration ? (
                <div className="space-y-3">
                  {registrationFields.map((field) => renderCustomField(field))}
                </div>
              ) : (
                <>
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Rating {minRating ? "*" : ""}</Label>
                      <Input
                        type="number"
                        placeholder="1500"
                        value={formData.rating}
                        onChange={(e) =>
                          setFormData({ ...formData, rating: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Phone</Label>
                      <Input
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {tournament.rated && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>FIDE ID</Label>
                        <Input
                          placeholder="Optional"
                          value={formData.fideId}
                          onChange={(e) =>
                            setFormData({ ...formData, fideId: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Title</Label>
                        <Input
                          placeholder="GM, IM, FM..."
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!useCustomRegistration &&
              minRating &&
              formData.rating &&
              parseInt(formData.rating) < parseInt(minRating) && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">
                      Rating Below Minimum
                    </p>
                    <p className="text-muted-foreground">
                      Required minimum rating: {minRating}
                    </p>
                  </div>
                </div>
              )}

            {tournament.rated &&
              tournament.entryFee &&
              tournament.entryFee !== "0" &&
              canJoin && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">
                      Entry Fee: ₹{tournament.entryFee}
                    </p>
                    <p className="text-muted-foreground">
                      You will be redirected to payment confirmation.
                    </p>
                  </div>
                </div>
              )}

            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bell className="h-4 w-4" />
                <span>Notification Preferences</span>
              </div>
              {[
                { key: "start", label: "Tournament Start" },
                { key: "rounds", label: "Round Announcements" },
                { key: "results", label: "Result Updates" },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">
                    {n.label}
                  </Label>
                  <Switch
                    checked={notifications[n.key]}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({
                        ...prev,
                        [n.key]: checked,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleJoinClick}
              disabled={!canJoin || registering}
            >
              {registering
                ? "Registering..."
                : tournament.entryFee && tournament.entryFee !== "0"
                  ? "Proceed to Payment"
                  : "Join Tournament"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment & Join</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to join <strong>{tournament.name}</strong> with an
              entry fee of <strong>{tournament.entryFee}</strong>. This is a
              rated tournament and will affect your rating.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmJoin}>
              Confirm & Pay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
