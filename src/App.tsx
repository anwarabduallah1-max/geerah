import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Onboarding } from "@/components/Onboarding";
import { useState, useEffect, memo } from "react";
import MapPage from "./pages/MapPage";
import NeighborsPage from "./pages/NeighborsPage";
import ChatsPage from "./pages/ChatsPage";
import ProfilePage from "./pages/ProfilePage";
import SubscriptionPage from "./pages/SubscriptionPage";
import BusinessHubPage from "./pages/BusinessHubPage";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const TAB_PATHS = ["/", "/neighbors", "/chats", "/profile"] as const;
type TabPath = (typeof TAB_PATHS)[number];

// Each tab page is memoized and mounted ONCE — switching tabs only toggles
// visibility, so the map, profile data, and lists stay warm in memory.
const MemoMap = memo(MapPage);
const MemoNeighbors = memo(NeighborsPage);
const MemoChats = memo(ChatsPage);
const MemoProfile = memo(ProfilePage);

const TabPane = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
  <div
    aria-hidden={!active}
    className="absolute inset-0 transition-opacity duration-200 ease-out"
    style={{
      opacity: active ? 1 : 0,
      visibility: active ? "visible" : "hidden",
      pointerEvents: active ? "auto" : "none",
      contain: active ? "none" : "strict",
    }}
  >
    {children}
  </div>
);

const AppShell = () => {
  const { pathname } = useLocation();
  const currentTab = (TAB_PATHS as readonly string[]).includes(pathname)
    ? (pathname as TabPath)
    : null;

  return (
    <div className="h-svh flex flex-col overflow-hidden w-full pb-16">
      <main className="flex-1 relative overflow-hidden">
        {/* Persistent tab panes — mounted once, toggled via CSS for instant switching */}
        <TabPane active={currentTab === "/"}><MemoMap /></TabPane>
        <TabPane active={currentTab === "/neighbors"}><MemoNeighbors /></TabPane>
        <TabPane active={currentTab === "/chats"}><MemoChats /></TabPane>
        <TabPane active={currentTab === "/profile"}><MemoProfile /></TabPane>

        {/* Non-tab routes render on top */}
        {!currentTab && (
          <div className="absolute inset-0 overflow-auto">
            <Routes>
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/business" element={<BusinessHubPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

const App = () => {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("jeerah_onboarded");
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem("jeerah_onboarded", "true");
    setShowOnboarding(false);
  };

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
            <AppShell />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
