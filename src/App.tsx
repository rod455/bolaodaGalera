import { useState, useCallback, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
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
import { initGoogleAuth } from "@/lib/googleAuth";

/** Redireciona / para /home preservando o hash (necessário para tokens do Supabase auth) */
const RootRedirect = () => {
  const hash = window.location.hash;
  if (hash && (hash.includes("access_token") || hash.includes("type=signup") || hash.includes("type=recovery"))) {
    window.location.replace("/home" + hash);
    return null;
  }
  return <Navigate to="/home" replace />;
};

// ── Rotas raiz onde o app deve fechar ao pressionar voltar ──
const ROOT_ROUTES = ["/home", "/auth"];

/**
 * Componente interno que intercepta o botão voltar do Android/iOS.
 * Precisa estar DENTRO do BrowserRouter para ter acesso ao useNavigate/useLocation.
 */
const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let AppPlugin: any = null;

    const setupBackButton = async () => {
      try {
        // Import dinâmico para não quebrar build web
        const { App } = await import("@capacitor/app");
        AppPlugin = App;

        App.addListener("backButton", ({ canGoBack }) => {
          const currentPath = location.pathname;

          // Se estiver em rota raiz ou não puder voltar → fechar app
          const isRootRoute = ROOT_ROUTES.some(
            (r) => currentPath === r || currentPath === r + "/"
          );

          if (isRootRoute || !canGoBack) {
            App.exitApp();
            return;
          }

          // Caso contrário, volta uma página no histórico
          navigate(-1);
        });
      } catch (err) {
        console.log("[BackButton] Plugin não disponível:", err);
      }
    };

    setupBackButton();

    return () => {
      // Remover listener ao desmontar
      AppPlugin?.removeAllListeners?.();
    };
  }, [navigate, location.pathname]);

  return null;
};

const App = () => {
  const isNative = Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(isNative);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  // Inicializar Google Auth nativo
  useEffect(() => {
    initGoogleAuth();
  }, []);

  // ── Deep Link: capturar OAuth callback no app nativo ──
  useEffect(() => {
    if (!isNative) return;

    const checkDeepLink = () => {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }).then(({ error }) => {
            if (!error) {
              window.location.replace("/home");
            }
          });
        }
      }
    };

    checkDeepLink();

    window.addEventListener("hashchange", checkDeepLink);
    document.addEventListener("resume", checkDeepLink);

    return () => {
      window.removeEventListener("hashchange", checkDeepLink);
      document.removeEventListener("resume", checkDeepLink);
    };
  }, [isNative]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        <AuthProvider>
          <BrowserRouter>
            {/* Interceptor do botão voltar nativo — deve estar dentro do BrowserRouter */}
            <BackButtonHandler />
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