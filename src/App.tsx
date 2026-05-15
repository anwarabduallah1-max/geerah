import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Onboarding } from "@/components/Onboarding";
import { useState, useEffect } from "react";
import MapPage from "./pages/MapPage";
import NeighborsPage from "./pages/NeighborsPage";
import ChatsPage from "./pages/ChatsPage";
import ProfilePage from "./pages/ProfilePage";
import SubscriptionPage from "./pages/SubscriptionPage";
import BusinessHubPage from "./pages/BusinessHubPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("jeerah_onboarded");
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem("jeerah_onboarded", "true");
    setShowOnboarding(false);
  };

  // Light "Jark" community palette by default; respect dark mode if user/system requests
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
            <div className="h-svh flex flex-col overflow-hidden w-full pb-16">
              <main className="flex-1 overflow-hidden">
                <Routes>
                  <Route path="/" element={<MapPage />} />
                  <Route path="/add-item" element={<Navigate to="/" replace />} />
                  <Route path="/neighbors" element={<NeighborsPage />} />
                  <Route path="/chats" element={<ChatsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/subscription" element={<SubscriptionPage />} />
                  <Route path="/business" element={<BusinessHubPage />} />
                  <Route path="/jeera-box" element={<Navigate to="/neighbors" replace />} />
                  <Route path="/delivery" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <BottomNav />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
