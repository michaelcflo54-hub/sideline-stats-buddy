import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Estimate from "./pages/Estimate";
import TeamManagement from "./pages/TeamManagement";
import PlayerManagement from "./pages/PlayerManagement";
import PlaybookManagement from "./pages/PlaybookManagement";
import GameDetails from "./pages/GameDetails";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import Gallery from "./pages/Gallery";
import OwnerDashboard from "./pages/OwnerDashboard";
import CustomerPortal from "./pages/CustomerPortal";

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
            <Route path="/auth" element={<Auth />} />
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/me" element={<CustomerPortal />} />
            <Route path="/team" element={<TeamManagement />} />
            <Route path="/players" element={<PlayerManagement />} />
            <Route path="/playbook" element={<PlaybookManagement />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/game/:gameId" element={<GameDetails />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
