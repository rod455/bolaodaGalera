import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, PlusCircle, Radio, User, LogOut, LogIn, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import NotificationCenter from "@/components/NotificationCenter";
import InstallAppBanner from "@/components/InstallAppBanner";

const LOGO_URL = "https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png";

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isLoggedIn = !!user;

  const navItems = isLoggedIn
    ? [
        { path: "/home", label: "Home", icon: Home },
        { path: "/criar", label: "Novo Bolão", icon: PlusCircle },
        { path: "/ao-vivo", label: "Ao Vivo", icon: Radio },
        { path: "/perfil", label: "Perfil", icon: User },
      ]
    : [
        { path: "/home", label: "Home", icon: Home },
        { path: "/como-funciona.html", label: "Como Funciona", icon: HelpCircle },
        { path: "/auth?modo=cadastro", label: "Criar Conta", icon: LogIn },
      ];

  const isActive = (path: string) => {
    const basePath = path.split("?")[0];
    return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  };

  const handleNavClick = (path: string) => {
    if (path.endsWith(".html")) {
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
      <header className="bg-copa-green-500 text-white sticky top-0 z-50 shadow-md hidden md:block">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Bolão na Copa" className="w-10 h-10 object-contain" />
            <h1 className="text-lg font-bold tracking-tight">Bolão na Copa</h1>
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
                <button onClick={() => { window.location.href = "/como-funciona.html"; }}
                  className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                  Como Funciona
                </button>
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
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Bolão na Copa" className="w-9 h-9 object-contain" />
            <h1 className="text-lg font-bold tracking-tight">Bolão na Copa</h1>
          </div>
          {isLoggedIn ? (
            <NotificationCenter />
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => { window.location.href = "/como-funciona.html"; }}
                className="text-white/80 hover:text-white transition-colors text-xs font-medium">
                <HelpCircle className="w-5 h-5" />
              </button>
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

      {/* Footer - desktop only */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t hidden md:block">
        Bolão na Copa &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default AppLayout;
