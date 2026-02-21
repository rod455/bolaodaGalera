import { useState, useCallback, useEffect } from "react";
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
import { Analytics } from "@vercel/analytics/react";

const queryClient = new QueryClient();

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/** Redireciona / para /home preservando o hash (necessário para tokens do Supabase auth) */
const RootRedirect = () => {
  const hash = window.location.hash;
  if (hash && (hash.includes("access_token") || hash.includes("type=signup") || hash.includes("type=recovery"))) {
    // Supabase auth token no hash — redirecionar preservando o hash
    window.location.replace("/home" + hash);
    return null;
  }
  return <Navigate to="/home" replace />;
};

const App = () => {
  const isNative = Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(isNative);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  // ── Deep Link: capturar OAuth callback no app nativo ──
  useEffect(() => {
    if (!isNative) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const pkg = "@capacitor/" + "app";
      const { App: CapApp } = await import(/* @vite-ignore */ pkg);

      const handleDeepLink = async (event: { url: string }) => {
        const url = event.url;

        // bolaonacopa://auth/callback#access_token=...&refresh_token=...
        if (url.includes("auth/callback")) {
          const hashPart = url.split("#")[1];
          if (hashPart) {
            const params = new URLSearchParams(hashPart);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (!error) {
                window.location.replace("/home");
              } else {
                console.error("Erro ao restaurar sessão:", error);
              }
            }
          }
        }
      };

      await CapApp.addListener("appUrlOpen", handleDeepLink);
      cleanup = () => { CapApp.removeAllListeners(); };
    })();

    return () => { cleanup?.(); };
  }, [isNative]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
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
        <Analytics />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
