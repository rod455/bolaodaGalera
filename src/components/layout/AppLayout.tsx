import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, PlusCircle, Radio, User } from "lucide-react";

const navItems = [
  { path: "/home", label: "Home", icon: Home },
  { path: "/criar", label: "Novo Bolão", icon: PlusCircle },
  { path: "/ao-vivo", label: "Ao Vivo", icon: Radio },
  { path: "/perfil", label: "Perfil", icon: User },
];

const LOGO_URL = "https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png";

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header - Logo + Nome */}
      <header className="bg-copa-green-500 text-white sticky top-0 z-50 shadow-md pt-8"
        style={{ paddingTop: "max(2rem, env(safe-area-inset-top, 2rem))" }}>
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
          <img src={LOGO_URL} alt="Bolão na Copa" className="w-9 h-9 object-contain" />
          <h1 className="text-lg font-bold tracking-tight">Bolão na Copa</h1>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="container max-w-4xl mx-auto flex relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 relative transition-all ${
                  active ? "text-copa-green-600" : "text-gray-400"
                }`}
              >
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
    </div>
  );
};

export default AppLayout;
