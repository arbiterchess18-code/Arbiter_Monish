import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRole } from "@/lib/role-context";
import {
  getTournamentById,
  getTournamentRegistrations,
} from "@/lib/tournament-service";
import {
  Users,
  Trophy,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Shield,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import OverviewTab from "@/components/TournamentTabs/OverviewTab";
import ManagementTab from "@/components/TournamentTabs/ManagementTab";
import RegistrationsTab from "@/components/TournamentTabs/RegistrationsTab";
import PairingsTab from "@/components/TournamentTabs/PairingsTab";
import SettingsTab from "@/components/TournamentTabs/SettingsTab";

export default function TournamentViewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const currentUser = JSON.parse(localStorage.getItem("userData") || "{}");
  const isArbiter = currentUser.email === tournament?.createdBy;
  const isAdmin = role === "admin";
  const canManage = isArbiter || isAdmin;

  useEffect(() => {
    if (!id) {
      toast.error("Tournament ID not found");
      navigate("/orbiter/manage");
      return;
    }

    loadTournament();
  }, [id, navigate]);

  const loadTournament = () => {
    const tournamentData = getTournamentById(id);
    if (!tournamentData) {
      toast.error("Tournament not found");
      navigate("/orbiter/manage");
      return;
    }

    setTournament(tournamentData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading tournament...</div>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  // Determine available tabs based on role
  const getTabs = () => {
    const tabs = [{ value: "overview", label: "Overview" }];

    if (canManage) {
      tabs.push(
        { value: "management", label: "Management" },
        { value: "registrations", label: "Registrations" },
        { value: "pairings", label: "Pairings" },
        { value: "settings", label: "Settings" },
      );
    } else {
      tabs.push({ value: "pairings", label: "Pairings" });
    }

    return tabs;
  };

  const tabs = getTabs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/orbiter/manage")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tournaments
        </Button>
      </div>

      {/* Tournament Summary Cards */}
      <div>
        <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
        <p className="text-muted-foreground mb-4">{tournament.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Players</p>
                  <p className="text-2xl font-bold">
                    {tournament.registeredPlayers?.length || 0}
                    <span className="text-sm text-muted-foreground">
                      /{tournament.maxPlayers}
                    </span>
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rounds</p>
                  <p className="text-2xl font-bold">
                    {tournament.currentRound}
                    <span className="text-sm text-muted-foreground">
                      /{tournament.rounds}
                    </span>
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Prize Pool</p>
                  <p className="text-2xl font-bold">
                    ${tournament.prizePool || "N/A"}
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Entry Fee</p>
                  <p className="text-2xl font-bold">
                    ${tournament.entryFee || "Free"}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Min Rating</p>
                  <p className="text-2xl font-bold">
                    {tournament.minRating || "None"}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Format</p>
                  <p className="text-2xl font-bold">
                    {tournament.pairingSystem}
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="pt-4 flex items-center gap-2">
          <Badge variant="outline">{tournament.type}</Badge>
          {tournament.isRated && <Badge variant="secondary">Rated</Badge>}
          {tournament.isPrivate && <Badge variant="outline">Private</Badge>}
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className="grid w-full gap-2"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
        >
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <OverviewTab
            tournament={tournament}
            canRegister={role === "player"}
          />
        </TabsContent>

        {/* Management Tab */}
        {canManage && (
          <TabsContent value="management">
            <ManagementTab
              tournament={tournament}
              onTournamentUpdate={setTournament}
            />
          </TabsContent>
        )}

        {/* Registrations Tab */}
        {canManage && (
          <TabsContent value="registrations">
            <RegistrationsTab
              tournament={tournament}
              onTournamentUpdate={setTournament}
            />
          </TabsContent>
        )}

        {/* Pairings Tab */}
        <TabsContent value="pairings">
          <PairingsTab
            tournament={tournament}
            canManage={canManage}
            onTournamentUpdate={loadTournament}
          />
        </TabsContent>

        {/* Settings Tab */}
        {canManage && (
          <TabsContent value="settings">
            <SettingsTab
              tournament={tournament}
              onTournamentUpdate={setTournament}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
