import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import CriarBolao from "./pages/CriarBolao";
import EntrarBolao from "./pages/EntrarBolao";
import AoVivo from "./pages/AoVivo";
import Perfil from "./pages/Perfil";
import BolaoPage from "./pages/BolaoPage";
import Palpites from "./pages/Palpites";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/criar" element={<CriarBolao />} />
            <Route path="/entrar" element={<EntrarBolao />} />
            <Route path="/ao-vivo" element={<AoVivo />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/bolao/:id" element={<BolaoPage />} />
            <Route path="/bolao/:id/palpites" element={<Palpites />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
