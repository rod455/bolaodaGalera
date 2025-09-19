import { Bell, Settings, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="bg-gradient-sky shadow-flight sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Plane className="h-8 w-8 text-primary-foreground animate-float" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">
                Miles Monitor
              </h1>
              <p className="text-sm text-primary-foreground/80">
                Alertas de Promoções Aéreas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;