import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Trash2, Crown, Check, Pencil, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Perfil = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* User header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-copa-green-100 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-copa-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Olá, Jogador</h2>
          <p className="text-sm text-muted-foreground">jogador@email.com</p>
        </div>
      </div>

      {/* Plan Card */}
      <Card className="rounded-2xl shadow-sm border-copa-gold-200 overflow-hidden">
        <CardHeader className="pb-2 bg-copa-gold-50">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-copa-gold-500" />
            <CardTitle className="text-base font-bold">Seu plano atual</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Badge className="bg-copa-green-500 text-white font-bold px-4 py-1 text-sm rounded-full">
            FREE
          </Badge>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-copa-green-600" />
              </div>
              <span className="text-sm">Criar até 2 bolões</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-copa-green-600" />
              </div>
              <span className="text-sm">Participar do bolão nacional</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-copa-green-600" />
              </div>
              <span className="text-sm">Propagandas habilitadas</span>
            </div>
          </div>

          <Button className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold rounded-xl shadow-md">
            <Crown className="w-4 h-4 mr-2" />
            UPGRADE PARA PREMIUM
          </Button>
          <p className="text-center text-xs text-muted-foreground">Mais vantagens exclusivas</p>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Detalhes da conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="flex items-center justify-between py-3.5 border-b">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="text-sm font-medium">Jogador</p>
              </div>
            </div>
            <button className="text-copa-green-500 hover:text-copa-green-600">
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3.5 border-b">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="text-sm font-medium">jogador@email.com</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-3.5 border-b">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Senha</p>
                <p className="text-sm font-medium">••••••••</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-copa-gold-600 border-copa-gold-300 hover:bg-copa-gold-50 rounded-lg text-xs"
            >
              Trocar senha
            </Button>
          </div>

          <button
            className="flex items-center gap-2 py-3.5 text-destructive hover:text-destructive/80 text-sm"
            onClick={() => toast.error("Funcionalidade em breve")}
          >
            <Trash2 className="w-4 h-4" />
            Excluir conta
          </button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        onClick={() => {
          toast.success("Logout realizado");
          navigate("/auth");
        }}
        className="w-full h-11 border-destructive text-destructive hover:bg-destructive/5 font-semibold rounded-xl"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da conta
      </Button>
    </div>
  );
};

export default Perfil;
