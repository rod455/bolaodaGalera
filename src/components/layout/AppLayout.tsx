import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, User, Users, LogOut, Globe } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import NotificationCenter from "@/components/NotificationCenter";
import InstallAppBanner from "@/components/InstallAppBanner";
import HelpButton from "@/components/HelpButton";

import { getStoreUrl, isIOSPlatform, APP_STORE_URL, PLAY_STORE_URL } from "@/lib/constants";
const STORE_URL = getStoreUrl();
const IS_IOS = isIOSPlatform();

const LOGO_URL = "https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/BolaoDaGalera%20-%20sem%20fundo.png";

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isLoggedIn = !!user;

  const navItems = [
    { path: "/home", label: "Home", icon: Home },
    { path: "/entrar", label: "Grupos", icon: Users },
    { path: "/quiz", label: "Quiz", icon: Globe },
    { path: "/perfil", label: "Perfil", icon: User },
  ];

  const isActive = (path: string) => {
    const basePath = path.split("?")[0];
    return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  };

  const STATIC_PATHS = ["/como-funciona", "/influenciadores", "/sobre", "/comparativo", "/corporativo"];

  const handleNavClick = (path: string) => {
    window.scrollTo(0, 0);
    if (path.endsWith(".html") || STATIC_PATHS.includes(path)) {
      window.location.href = path;
    } else {
      navigate(path);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logout realizado!");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ═══ DESKTOP: Header ═══ */}
      <header className="bg-copa-green-500 text-white sticky top-0 z-50 shadow-md hidden md:block"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Bolão da Galera" className="w-10 h-10 object-contain" />
            <h1 className="text-lg font-bold tracking-tight">Bolão da Galera</h1>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <NotificationCenter />
                <button onClick={handleLogout}
                  className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm ml-1">
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {!Capacitor.isNativePlatform() && (
                  IS_IOS ? (
                    <a href={APP_STORE_URL} target="_blank" rel="noopener"
                      className="inline-flex items-center bg-black rounded-md px-2.5 py-1 gap-1.5 hover:bg-gray-800 transition-colors">
                      <svg className="w-4 h-4 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                      <span className="text-white text-[10px] leading-tight font-medium">Disponível na<br/><strong className="text-xs">App Store</strong></span>
                    </a>
                  ) : (
                    <a href={PLAY_STORE_URL} target="_blank" rel="noopener"
                      className="inline-flex items-center bg-black rounded-md px-2.5 py-1 gap-1.5 hover:bg-gray-800 transition-colors">
                      <svg className="w-4 h-4 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 0 1 0 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                      <span className="text-white text-[10px] leading-tight font-medium">Disponível no<br/><strong className="text-xs">Google Play</strong></span>
                    </a>
                  )
                )}
                <button onClick={() => navigate("/auth")}
                  className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                  Entrar
                </button>
                <button onClick={() => navigate("/auth?modo=cadastro")}
                  className="bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-sm px-4 py-2 rounded-xl transition-colors">
                  Criar Conta
                </button>
              </div>
            )}
          </div>
        </div>
        <nav className="container max-w-4xl mx-auto px-2">
          <div className="flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button key={item.path} onClick={() => handleNavClick(item.path)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all border-b-2 ${
                    active
                      ? "border-copa-gold-400 text-copa-gold-400"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/30"
                  }`}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ═══ MOBILE: Header ═══ */}
      <header className="bg-copa-green-500 text-white sticky top-0 z-50 shadow-md md:hidden"
        style={{ paddingTop: "max(2rem, env(safe-area-inset-top, 2rem))" }}>
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>
            <img src={LOGO_URL} alt="Bolão da Galera" className="w-9 h-9 object-contain" />
            <h1 className="text-lg font-bold tracking-tight">Bolão da Galera</h1>
          </div>
          {isLoggedIn ? (
            <NotificationCenter />
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={() => navigate("/auth")}
                className="text-white/80 hover:text-white transition-colors text-xs font-medium">
                Entrar
              </button>
              <button onClick={() => navigate("/auth?modo=cadastro")}
                className="bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors">
                Criar Conta
              </button>
            </div>
          )}
        </div>
        {/* Barra de navegação mobile (abaixo do logo) */}
        {!isLoggedIn && (
          <div className="container max-w-4xl mx-auto px-2 flex border-t border-white/10">
            <button onClick={() => navigate("/quiz")}
              className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${location.pathname === "/quiz" ? "text-copa-gold-400 border-b-2 border-copa-gold-400" : "text-white/60 hover:text-white"}`}>
              Quiz da Copa
            </button>
            <button onClick={() => { window.location.href = "/como-funciona"; }}
              className="flex-1 py-2 text-xs font-medium text-center text-white/60 hover:text-white transition-colors">
              Como Funciona
            </button>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* ═══ MOBILE: Bottom Navigation Bar (só logados — guests tem sticky CTA na Home) ═══ */}
      {isLoggedIn && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="container max-w-4xl mx-auto flex relative">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button key={item.path} onClick={() => handleNavClick(item.path)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 relative transition-all ${
                    active ? "text-copa-green-600" : "text-gray-400"
                  }`}>
                  {active && (
                    <div className="absolute top-0 w-12 h-[3px] bg-copa-green-500 rounded-b-full" />
                  )}
                  <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                  <span className={`text-[10px] leading-tight ${active ? "font-bold" : "font-medium"}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* ═══ Banner instalar app (só Android mobile, não no app nativo) ═══ */}
      <InstallAppBanner />

      {/* ═══ Botão flutuante de ajuda ═══ */}
      <HelpButton />

      {/* Footer - desktop only */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t hidden md:block space-y-1">
        <p>Bolão da Galera &copy; {new Date().getFullYear()}</p>
        <p className="text-[10px] opacity-60">Aplicativo independente, sem vínculo ou afiliação com FIFA, CBF, UEFA ou qualquer entidade esportiva oficial.</p>
      </footer>
    </div>
  );
};

export default AppLayout;
