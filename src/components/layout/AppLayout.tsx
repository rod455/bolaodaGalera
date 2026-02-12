import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, PlusCircle, Radio, User, LogOut, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { label: "Home", icon: Home, path: "/home" },
  { label: "Novo Bolão", icon: PlusCircle, path: "/criar" },
  { label: "Ao Vivo", icon: Radio, path: "/ao-vivo" },
  { label: "Perfil", icon: User, path: "/perfil" },
];

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-copa-green-50/30 to-white">
      {/* Header */}
      <header className="bg-copa-green-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/home")}>
            <div className="w-9 h-9 bg-copa-gold-400 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-copa-green-700" />
            </div>
            <span className="font-bold text-lg">Bolão na Copa</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
        {/* Navigation */}
        <nav className="max-w-3xl mx-auto px-2">
          <div className="flex">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? "text-copa-gold-300 border-copa-gold-400"
                      : "text-white/70 border-transparent hover:text-white/90"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
