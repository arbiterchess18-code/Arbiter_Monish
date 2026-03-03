import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  DollarSign,
  Medal,
  Play,
  Settings,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import {
  getRegistrationFormFields,
  getTournamentPairings,
  getTournamentRegistrationsApi,
  getTournamentViewDetails,
  startTournamentPairing,
  submitTournamentRegistration,
  updateTournament,
  updateTournamentRegistrationStatus,
} from "@/lib/tournament-service";
import { useRole } from "@/lib/role-context";

const DEFAULT_TABS = ["overview", "pairings"];

export default function TournamentViewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const [loading, setLoading] = useState(true);
  const [viewData, setViewData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [pairingsData, setPairingsData] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [registrationFormFields, setRegistrationFormFields] = useState([]);
  const [registrationFormData, setRegistrationFormData] = useState({});
  const [registrationErrors, setRegistrationErrors] = useState({});
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isStartingPairing, setIsStartingPairing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const tabs = viewData?.available_tabs?.length
    ? viewData.available_tabs
    : DEFAULT_TABS;
  const tournament = viewData?.tournament;
  const stats = viewData?.stats || {};
  const canManage = tabs.includes("management");

  const loadData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [viewDetails, pairings, fields] = await Promise.all([
        getTournamentViewDetails(id),
        getTournamentPairings(id),
        getRegistrationFormFields(id),
      ]);
      setViewData(viewDetails);
      setPairingsData(pairings);
      setRegistrationFormFields(fields || []);

      if ((viewDetails?.available_tabs || []).includes("registrations")) {
        const registrationData = await getTournamentRegistrationsApi(id);
        setRegistrations(registrationData || []);
      } else {
        setRegistrations([]);
      }
    } catch (error) {
      toast.error(error.message || "Failed to load tournament details");
      navigate("/orbiter/manage");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (!tabs.includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [tabs, activeTab]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((registration) => {
      const statusMatch =
        statusFilter === "all" ||
        (registration.status || "pending") === statusFilter;
      const query = searchQuery.trim().toLowerCase();
      const searchMatch =
        !query ||
        registration.user_name?.toLowerCase().includes(query) ||
        registration.user_email?.toLowerCase().includes(query);
      return statusMatch && searchMatch;
    });
  }, [registrations, statusFilter, searchQuery]);

  const registrationStats = useMemo(() => {
    return {
      total: registrations.length,
      pending: registrations.filter(
        (registration) => registration.status === "pending",
      ).length,
      approved: registrations.filter(
        (registration) => registration.status === "approved",
      ).length,
      rejected: registrations.filter(
        (registration) => registration.status === "rejected",
      ).length,
    };
  }, [registrations]);

  const validateRegistrationForm = () => {
    const errors = {};

    registrationFormFields.forEach((field) => {
      if (!field.is_required) return;
      const value = registrationFormData[field.field_name];
      if (value === undefined || value === null || `${value}`.trim() === "") {
        errors[field.field_name] = `${field.field_name} is required`;
      }
    });

    setRegistrationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!id) return;

    if (!validateRegistrationForm()) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsRegistering(true);
    try {
      await submitTournamentRegistration(id, registrationFormData);
      toast.success("Registration submitted successfully. Status: Pending");
      setRegistrationDialogOpen(false);
      setRegistrationFormData({});
      await loadData();
    } catch (error) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  const updateRegistrationStatus = async (registrationId, nextStatus) => {
    if (!id) return;

    try {
      await updateTournamentRegistrationStatus(id, registrationId, nextStatus);
      toast.success(`Registration ${nextStatus}`);
      const registrationData = await getTournamentRegistrationsApi(id);
      setRegistrations(registrationData || []);
      const pairings = await getTournamentPairings(id);
      setPairingsData(pairings);
    } catch (error) {
      toast.error(error.message || "Unable to update registration");
    }
  };

  const handleStartPairing = async () => {
    if (!id) return;

    setIsStartingPairing(true);
    try {
      await startTournamentPairing(id);
      toast.success("Pairings started successfully");
      const pairings = await getTournamentPairings(id);
      setPairingsData(pairings);
      const refreshedView = await getTournamentViewDetails(id);
      setViewData(refreshedView);
    } catch (error) {
      toast.error(error.message || "Failed to start pairing");
    } finally {
      setIsStartingPairing(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;

    try {
      await updateTournament(id, { status: "published" });
      toast.success("Event published");
      const refreshedView = await getTournamentViewDetails(id);
      setViewData(refreshedView);
    } catch (error) {
      toast.error(error.message || "Failed to publish event");
    }
  };

  const renderRegistrationField = (field) => {
    const fieldName = field.field_name;
    const value = registrationFormData[fieldName] || "";

    const onChange = (nextValue) => {
      setRegistrationFormData((previous) => ({
        ...previous,
        [fieldName]: nextValue,
      }));
      if (registrationErrors[fieldName]) {
        setRegistrationErrors((previous) => {
          const updated = { ...previous };
          delete updated[fieldName];
          return updated;
        });
      }
    };

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
        {field.field_type === "Dropdown" && (
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter value"
          />
        )}
        {field.field_type === "Text Area" && (
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}

        {registrationErrors[fieldName] ? (
          <p className="text-xs text-destructive">
            {registrationErrors[fieldName]}
          </p>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div className="text-muted-foreground">
          Loading tournament details...
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate("/orbiter/manage")}>
          Back
        </Button>
        <Card>
          <CardContent className="pt-6">Tournament not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={() =>
            navigate(canManage ? "/orbiter/manage" : "/tournaments")
          }
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Badge variant="outline" className="uppercase tracking-wide">
          {tournament.status || "upcoming"}
        </Badge>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{tournament.tournament_name}</h1>
        <p className="text-muted-foreground mt-1">
          {tournament.description || "Professional tournament management"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Players</p>
            <p className="text-xl font-semibold">{stats.players || "0/0"}</p>
            <Users className="h-4 w-4 text-muted-foreground mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Rounds</p>
            <p className="text-xl font-semibold">{stats.rounds || "0/0"}</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Prize Pool</p>
            <p className="text-xl font-semibold">{stats.prize_pool || "TBD"}</p>
            <Trophy className="h-4 w-4 text-muted-foreground mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Entry Fee</p>
            <p className="text-xl font-semibold">
              ₹{Number(stats.entry_fee || 0).toFixed(2)}
            </p>
            <DollarSign className="h-4 w-4 text-muted-foreground mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Rating Requirement</p>
            <p className="text-xl font-semibold">
              {stats.rating_requirement || 0}
            </p>
            <Shield className="h-4 w-4 text-muted-foreground mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Format</p>
            <p className="text-xl font-semibold">
              {stats.format || tournament.pairing_system || "Swiss"}
            </p>
            <Medal className="h-4 w-4 text-muted-foreground mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
        >
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tournament Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 text-sm">
                <p className="flex gap-2">
                  <Calendar className="h-4 w-4 mt-0.5" /> Dates:{" "}
                  {tournament.start_date || "-"} to {tournament.end_date || "-"}
                </p>
                <p>
                  Location:{" "}
                  {[
                    tournament.venue_name,
                    tournament.city,
                    tournament.state,
                    tournament.country,
                  ]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </p>
                <p>Organizer: {tournament.organizer_name || "-"}</p>
                <p>
                  Time Control: {tournament.time_control || "-"}
                  {tournament.increment ? ` + ${tournament.increment}` : ""}
                </p>
              </div>
              <div className="space-y-3">
                {role === "player" ? (
                  <Button
                    className="w-full"
                    onClick={() => setRegistrationDialogOpen(true)}
                  >
                    Register for Tournament
                  </Button>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  Tie-breakers: {(viewData?.tie_breaker_rules || []).join(", ")}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {tabs.includes("management") ? (
          <TabsContent value="management" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Control publishing, rounds, and tournament operations.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handlePublish}>Publish Event</Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/orbiter/create?edit=${id}`)}
                  >
                    Edit Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {tabs.includes("registrations") ? (
          <TabsContent value="registrations" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">
                    {registrationStats.total}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">
                    {registrationStats.pending}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">
                    {registrationStats.approved}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">
                    {registrationStats.rejected}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search & Filter</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-3">
                <Input
                  placeholder="Search by name/email"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="md:w-52">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Registrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredRegistrations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No registrations found.
                  </p>
                ) : (
                  filteredRegistrations.map((registration) => (
                    <div
                      key={registration.registration_id}
                      className="border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div>
                        <p className="font-medium">{registration.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {registration.user_email}
                        </p>
                        <p className="text-xs mt-1">
                          Status:{" "}
                          <span className="capitalize">
                            {registration.status}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateRegistrationStatus(
                              registration.registration_id,
                              "approved",
                            )
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateRegistrationStatus(
                              registration.registration_id,
                              "rejected",
                            )
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        <TabsContent value="pairings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pairings Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    Approved Participants
                  </p>
                  <p className="text-xl font-semibold">
                    {pairingsData?.approved_participants || 0}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Current Round</p>
                  <p className="text-xl font-semibold">
                    {pairingsData?.current_round || 0}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Round Status</p>
                  <p className="text-xl font-semibold capitalize">
                    {(pairingsData?.round_status || "not_started").replaceAll(
                      "_",
                      " ",
                    )}
                  </p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Pairing System:{" "}
                {pairingsData?.pairing_system ||
                  tournament.pairing_system ||
                  "Swiss"}{" "}
                | Tie-breakers:{" "}
                {(pairingsData?.tie_breaker_rules || []).join(", ")}
              </div>

              {canManage ? (
                <Button
                  onClick={handleStartPairing}
                  disabled={isStartingPairing}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isStartingPairing ? "Starting..." : "Start Pairing"}
                </Button>
              ) : null}

              <div className="space-y-3">
                {(pairingsData?.pairings || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pairings generated yet.
                  </p>
                ) : (
                  pairingsData.pairings.map((pairing) => (
                    <div
                      key={pairing.match_id}
                      className="border rounded-lg p-3 text-sm"
                    >
                      <p className="font-medium">
                        Round {pairing.round_number} • Board{" "}
                        {pairing.board_number || "-"}
                      </p>
                      <p className="text-muted-foreground">
                        {pairing.white_player_name || "TBD"} vs{" "}
                        {pairing.black_player_name || "BYE"}
                      </p>
                      <p className="text-xs mt-1">
                        Result: {pairing.result || "Pending"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {tabs.includes("settings") ? (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Pairing System: {tournament.pairing_system || "Swiss"}</p>
                <p>Rounds: {tournament.rounds || 0}</p>
                <p>Created By: {tournament.created_by || "-"}</p>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/orbiter/create?edit=${id}`)}
                >
                  Edit Tournament Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>

      <Dialog
        open={registrationDialogOpen}
        onOpenChange={setRegistrationDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register for Tournament</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {registrationFormFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No custom fields configured. Submit to register.
              </p>
            ) : (
              registrationFormFields.map((field) =>
                renderRegistrationField(field),
              )
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setRegistrationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={isRegistering}>
              {isRegistering ? "Submitting..." : "Submit Registration"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
