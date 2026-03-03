import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { updateTournament } from "@/lib/tournament-service";
import { Users, Search, CheckCircle, XCircle, Clock } from "lucide-react";

export default function RegistrationsTab({ tournament, onTournamentUpdate }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredRegistrations = useMemo(() => {
    return (tournament.registeredPlayers || []).filter((player) => {
      const statusMatch =
        filterStatus === "all" ||
        (player.registrationStatus || "pending") === filterStatus;
      const searchMatch =
        player.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.email?.toLowerCase().includes(searchQuery.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [tournament.registeredPlayers, filterStatus, searchQuery]);

  const stats = {
    total: tournament.registeredPlayers?.length || 0,
    pending: (tournament.registeredPlayers || []).filter(
      (p) => (p.registrationStatus || "pending") === "pending",
    ).length,
    approved: (tournament.registeredPlayers || []).filter(
      (p) => p.registrationStatus === "approved",
    ).length,
    rejected: (tournament.registeredPlayers || []).filter(
      (p) => p.registrationStatus === "rejected",
    ).length,
  };

  const handleApprove = async (playerId) => {
    setIsUpdating(true);
    try {
      const updated = {
        ...tournament,
        registeredPlayers: tournament.registeredPlayers.map((p) =>
          p.id === playerId ? { ...p, registrationStatus: "approved" } : p,
        ),
      };
      updateTournament(tournament.id, {
        registeredPlayers: updated.registeredPlayers,
      });
      onTournamentUpdate(updated);
      toast.success("Player approved!");
    } catch (error) {
      toast.error(error.message || "Failed to approve player");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async (playerId) => {
    setIsUpdating(true);
    try {
      const updated = {
        ...tournament,
        registeredPlayers: tournament.registeredPlayers.map((p) =>
          p.id === playerId ? { ...p, registrationStatus: "rejected" } : p,
        ),
      };
      updateTournament(tournament.id, {
        registeredPlayers: updated.registeredPlayers,
      });
      onTournamentUpdate(updated);
      toast.success("Player rejected!");
    } catch (error) {
      toast.error(error.message || "Failed to reject player");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: "Pending", variant: "outline", className: "" },
      approved: {
        label: "Approved",
        variant: "default",
        className: "bg-green-600",
      },
      rejected: { label: "Rejected", variant: "destructive", className: "" },
    };
    const config = statusMap[status || "pending"] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Total Registrations
              </p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-4 w-4" /> Pending
              </p>
              <p className="text-3xl font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4" /> Approved
              </p>
              <p className="text-3xl font-bold">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <XCircle className="h-4 w-4" /> Rejected
              </p>
              <p className="text-3xl font-bold">{stats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            Player Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan="6"
                      className="text-center text-muted-foreground py-8"
                    >
                      {tournament.registeredPlayers?.length === 0
                        ? "No registrations yet"
                        : "No results matching your filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">
                        {player.name}
                      </TableCell>
                      <TableCell className="text-sm">{player.email}</TableCell>
                      <TableCell className="text-sm">
                        {player.rating || "N/A"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(player.registrationStatus)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(player.registeredAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {(player.registrationStatus || "pending") ===
                          "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(player.id)}
                              disabled={isUpdating}
                              className="gap-1"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(player.id)}
                              disabled={isUpdating}
                              className="gap-1 text-destructive border-destructive/30"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </>
                        )}
                        {player.registrationStatus === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(player.id)}
                            disabled={isUpdating}
                            className="gap-1 text-destructive border-destructive/30"
                          >
                            Reject
                          </Button>
                        )}
                        {player.registrationStatus === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(player.id)}
                            disabled={isUpdating}
                            className="gap-1"
                          >
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
