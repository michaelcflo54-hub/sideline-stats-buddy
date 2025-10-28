import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import TeamManagement from "./pages/TeamManagement";
import TeamHub from "./pages/TeamHub";
import CoachesPage from "./pages/CoachesPage";
import PlayerManagement from "./pages/PlayerManagement";
import SchedulePage from "./pages/SchedulePage";
import PlayerStatsPage from "./pages/PlayerStatsPage";
import PlaybookManagement from "./pages/PlaybookManagement";
import PracticePlan from "./pages/PracticePlan";
import GameDetails from "./pages/GameDetails";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import Estimate from "./pages/Estimate";
import Gallery from "./pages/Gallery";
import OwnerDashboard from "./pages/OwnerDashboard";
import Customer from "./pages/Customer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/estimate" element={<Estimate />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/customer" element={<Customer />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/team" element={<TeamHub />} />
            <Route path="/team/coaches" element={<CoachesPage />} />
            <Route path="/team/players" element={<PlayerManagement />} />
            <Route path="/team/schedule" element={<SchedulePage />} />
            <Route path="/team/player-stats" element={<PlayerStatsPage />} />
            <Route path="/team/analytics" element={<Analytics />} />
            <Route path="/playbook" element={<PlaybookManagement />} />
            <Route path="/practice-plan" element={<PracticePlan />} />
            <Route path="/game/:gameId" element={<GameDetails />} />
            {/* Legacy routes for backward compatibility */}
            <Route path="/players" element={<PlayerManagement />} />
            <Route path="/analytics" element={<Analytics />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
