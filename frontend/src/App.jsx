import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { RoleProvider } from "@/lib/role-context";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import TournamentViewDetails from "./pages/TournamentViewDetails";
import ArbitersPage from "./pages/ArbitersPage";
import ArbiterDetailPage from "./pages/ArbiterDetailPage";
import LandingPage from "./pages/LandingPage";
import OAuthSuccess from "./pages/OAuthSuccess";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import { useRole } from "@/lib/role-context";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRole }) => {
  const { role } = useRole();
  const userData = sessionStorage.getItem("userData");

  if (!userData) return <Navigate to="/login" replace />;

  // Allow organizations to access arbiter routes
  if (allowedRole === "arbiter" && role === "organization") return children;

  if (allowedRole && role !== allowedRole)
    return <Navigate to="/login" replace />;

  return children;
};

const App = () => {
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted && !sessionStorage.getItem("userData")) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return (
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
                <Route path="/" element={<LandingPage />} />

                {/* Auth Routes - No Layout */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/oauth-success" element={<OAuthSuccess />} />

                {/* Application Routes - With Layout */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Routes>
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
                          <Route
                            path="/tournament/:id/view-details"
                            element={<TournamentViewDetails />}
                          />
                          <Route
                            path="/dashboard"
                            element={<UserDashboard />}
                          />
                          <Route
                            path="/history"
                            element={<MatchHistoryPage />}
                          />
                          <Route
                            path="/leaderboard"
                            element={<LeaderboardPage />}
                          />
                          <Route path="/arbiters" element={<ArbitersPage />} />
                          <Route
                            path="/arbiters/:id"
                            element={<ArbiterDetailPage />}
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
                          <Route
                            path="/orbiter"
                            element={<OrbiterDashboard />}
                          />
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
                          <Route
                            path="/orbiter/stats"
                            element={<OrbiterStats />}
                          />
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
                          
                          <Route 
                            path="/admin" 
                            element={<AdminDashboard />} 
                          />

                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </RoleProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
