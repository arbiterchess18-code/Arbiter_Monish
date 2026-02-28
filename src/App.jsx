import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleProvider } from "@/lib/role-context";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ArbiterDashboardPage from "./pages/ArbiterDashboard";
import PlayerDashboardPage from "./pages/PlayerDashboard";
import TournamentsPage from "./pages/TournamentsPage";
import UserDashboard from "./pages/UserDashboard";
import MatchHistoryPage from "./pages/MatchHistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AchievementsPage from "./pages/AchievementsPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationPreferences from "./pages/NotificationPreferences";
import OrbiterDashboard from "./pages/OrbiterDashboard";
import CreateTournament from "./pages/CreateTournament";
import ManageTournaments from "./pages/ManageTournaments";
import ResultsEntry from "./pages/ResultsEntry";
import OrbiterStats from "./pages/OrbiterStats";
import OrganizerRequests from "./pages/OrganizerRequests";
import OrbiterPlayingDashboard from "./pages/OrbiterPlayingDashboard";
import ArbiterVacanciesPage from "./pages/ArbiterVacanciesPage";
import TournamentDetails from "./pages/TournamentDetails";
import TournamentPairings from "./pages/TournamentPairings";
import TournamentSummary from "./pages/TournamentSummary";
import RegistrationFormBuilder from "./pages/RegistrationFormBuilder";
import NotFound from "./pages/NotFound";
import { useRole } from "@/lib/role-context";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRole }) => {
  const { role } = useRole();
  const token = localStorage.getItem("authToken");

  if (!token) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole)
    return <Navigate to="/login" replace />;

  return children;
};

const HomeRedirect = () => {
  const { role } = useRole();
  const token = localStorage.getItem("authToken");

  if (!token) return <Navigate to="/login" replace />;
  if (role === "arbiter") return <Navigate to="/arbiter-userhome" replace />;
  if (role === "player") return <Navigate to="/player-userhome" replace />;

  return <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="chess-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RoleProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              {/* Auth Routes - No Layout */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Application Routes - With Layout */}
              <Route
                path="/*"
                element={
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<HomeRedirect />} />

                      {/* Role Specific User Homes */}
                      <Route
                        path="/arbiter-userhome"
                        element={
                          <ProtectedRoute allowedRole="arbiter">
                            <ArbiterDashboardPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/player-userhome"
                        element={
                          <ProtectedRoute allowedRole="player">
                            <PlayerDashboardPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Other Routes */}
                      <Route
                        path="/tournaments"
                        element={<TournamentsPage />}
                      />
                      <Route
                        path="/tournament/:id"
                        element={<TournamentDetails />}
                      />
                      <Route path="/dashboard" element={<UserDashboard />} />
                      <Route path="/history" element={<MatchHistoryPage />} />
                      <Route
                        path="/leaderboard"
                        element={<LeaderboardPage />}
                      />
                      <Route
                        path="/achievements"
                        element={<AchievementsPage />}
                      />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route
                        path="/notifications"
                        element={<NotificationPreferences />}
                      />

                      {/* Orbiter Conducting Routes */}
                      <Route path="/orbiter" element={<OrbiterDashboard />} />
                      <Route
                        path="/orbiter/create"
                        element={<CreateTournament />}
                      />
                      <Route
                        path="/orbiter/manage"
                        element={<ManageTournaments />}
                      />
                      <Route
                        path="/orbiter/results"
                        element={<ResultsEntry />}
                      />
                      <Route
                        path="/orbiter/leaderboards"
                        element={<LeaderboardPage />}
                      />
                      <Route path="/orbiter/stats" element={<OrbiterStats />} />
                      <Route
                        path="/orbiter/requests"
                        element={<OrganizerRequests />}
                      />

                      {/* Arbiter Tournament Management Routes */}
                      <Route
                        path="/arbiter/tournament/:id/pairings"
                        element={<TournamentPairings />}
                      />
                      <Route
                        path="/arbiter/tournament/:id/summary"
                        element={<TournamentSummary />}
                      />
                      <Route
                        path="/arbiter/tournament/:id/registration-form"
                        element={<RegistrationFormBuilder />}
                      />

                      {/* Orbiter Playing Routes */}
                      <Route
                        path="/orbiter/playing"
                        element={<OrbiterPlayingDashboard />}
                      />
                      <Route
                        path="/orbiter/my-history"
                        element={<MatchHistoryPage />}
                      />
                      <Route
                        path="/orbiter/achievements"
                        element={<AchievementsPage />}
                      />
                      <Route
                        path="/orbiter/vacancies"
                        element={<ArbiterVacanciesPage />}
                      />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                }
              />
            </Routes>
          </BrowserRouter>
        </RoleProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
