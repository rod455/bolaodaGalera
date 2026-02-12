import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, PlusCircle, LogIn, User, Trophy, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const navItems = [
  { path: "/home", label: "Home", icon: Home },
  { path: "/criar", label: "Criar", icon: PlusCircle },
  { path: "/entrar", label: "Entrar", icon: LogIn },
  { path: "/perfil", label: "Perfil", icon: User },
];

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await signOut();
    toast.success("Logout realizado!");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-copa-green-500 text-white sticky top-0 z-50 shadow-md">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-copa-gold-400 rounded-full flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-copa-green-700" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Bolão na Copa</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm"
            title="Sair da conta"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>

        {/* Top Tab Navigation */}
        <nav className="container max-w-4xl mx-auto px-2">
          <div className="flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all border-b-2 ${
                    active
                      ? "border-copa-gold-400 text-copa-gold-400"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/30"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Page Content */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t">
        Bolão na Copa &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default AppLayout;
