import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Footer } from "@/components/booking/Footer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { useAuth } from "./hooks/useAuth";
import { AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings";
// Added Button import

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  if (!user?.isApproved && user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border bg-card shadow-sm">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Approval Pending</h2>
              <p className="text-muted-foreground text-sm">
                Your account has been created successfully, but it requires administrator approval before you can start booking boardrooms.
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <Button
                onClick={() => window.location.reload()}
                variant="default"
                className="w-full"
              >
                Check Status
              </Button>
              <Button
                onClick={logout}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                Log out
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requireAdmin>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<Auth />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
