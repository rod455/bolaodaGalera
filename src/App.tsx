import { useState, useCallback, useEffect, useRef } from "react";
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
import Unsubscribe from "./pages/Unsubscribe";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import SplashScreen from "./components/SplashScreen";
import NotificationToast from "./components/NotificationToast";
import { Analytics } from "@vercel/analytics/react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { SplashScreen as NativeSplash } from "@capacitor/splash-screen";
import { supabase } from "@/integrations/supabase/client";
import { initGoogleAuth } from "@/lib/googleAuth";
import { initUTMTracker } from "@/lib/utm-tracker";
import { useSwipeBack } from "@/hooks/useSwipeBack";

const queryClient = new QueryClient();

/** Redireciona / para /home preservando o hash */
const RootRedirect = () => {
  const hash = window.location.hash;
  if (hash && (hash.includes("access_token") || hash.includes("type=signup") || hash.includes("type=recovery"))) {
    window.location.replace("/home" + hash);
    return null;
  }
  return <Navigate to="/home" replace />;
};

// Rotas onde o botao voltar deve fechar o app
const EXIT_ROUTES = ["/home", "/auth"];

const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useSwipeBack();

  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener("backButton", () => {
      const currentPath = pathnameRef.current;
      const shouldExit = EXIT_ROUTES.some(
        (r) => currentPath === r || currentPath === r + "/"
      );

      if (shouldExit) {
        CapApp.exitApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      listener.then((l) => l.remove()).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

const App = () => {
  const isNative = Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(isNative);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  // Esconder splash nativa do Capacitor assim que o React montar
  useEffect(() => {
    if (isNative) {
      NativeSplash.hide().catch(() => {});
    }
  }, [isNative]);

  useEffect(() => {
    initGoogleAuth();
    initUTMTracker();
  }, []);

  // Deep Link: capturar OAuth callback no app nativo
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
            <BackButtonHandler />
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/auth" element={<Auth />} />
              {/* Rota pública de descadastro — sem autenticação */}
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              {/* Planos — acessível sem login */}
              <Route path="/planos" element={<AppLayout />}>
                <Route index element={<Planos />} />
              </Route>
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
