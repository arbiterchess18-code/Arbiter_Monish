import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleProvider } from "@/lib/role-context";
import { AppLayout } from "@/components/AppLayout";
import UserHome from "./pages/UserHome";
import TournamentsPage from "./pages/TournamentsPage";
import UserDashboard from "./pages/UserDashboard";
import MatchHistoryPage from "./pages/MatchHistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AchievementsPage from "./pages/AchievementsPage";
import ProfilePage from "./pages/ProfilePage";
import VacancyPage from "./pages/VacancyPage";
import OrbiterDashboard from "./pages/OrbiterDashboard";
import CreateTournament from "./pages/CreateTournament";
import ManageTournaments from "./pages/ManageTournaments";
import ResultsEntry from "./pages/ResultsEntry";
import OrbiterStats from "./pages/OrbiterStats";
import OrganizerRequests from "./pages/OrganizerRequests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              {/* User Routes */}
              <Route path="/" element={<UserHome />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/history" element={<MatchHistoryPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/vacancy" element={<VacancyPage />} />
              {/* Orbiter Routes */}
              <Route path="/orbiter" element={<OrbiterDashboard />} />
              <Route path="/orbiter/create" element={<CreateTournament />} />
              <Route path="/orbiter/manage" element={<ManageTournaments />} />
              <Route path="/orbiter/results" element={<ResultsEntry />} />
              <Route path="/orbiter/leaderboards" element={<LeaderboardPage />} />
              <Route path="/orbiter/stats" element={<OrbiterStats />} />
              <Route path="/orbiter/requests" element={<OrganizerRequests />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
