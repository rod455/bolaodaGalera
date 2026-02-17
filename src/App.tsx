import { useState, useCallback } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import CriarBolao from "./pages/CriarBolao";
import EntrarBolao from "./pages/EntrarBolao";
import AoVivo from "./pages/AoVivo";
import Perfil from "./pages/Perfil";
import BolaoPage from "./pages/BolaoPage";
import Palpites from "./pages/Palpites";
import Planos from "./pages/Planos";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import SplashScreen from "./components/SplashScreen";
import NotificationToast from "./components/NotificationToast";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/home" element={<AppLayout />}>
                <Route index element={<Home />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/criar" element={<CriarBolao />} />
                <Route path="/entrar" element={<EntrarBolao />} />
                <Route path="/ao-vivo" element={<AoVivo />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/bolao/:id" element={<BolaoPage />} />
                <Route path="/bolao/:id/palpites" element={<Palpites />} />
                <Route path="/planos" element={<Planos />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <NotificationToast />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
