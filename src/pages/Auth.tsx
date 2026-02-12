import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Eye, EyeOff, Mail, Lock, UserPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    // TODO: integrate Supabase auth
    toast.success(isLogin ? "Login realizado!" : "Conta criada com sucesso!");
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-copa-green-500 flex flex-col items-center justify-center p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-copa-green-400 to-copa-green-700 opacity-80" />

      <div className="relative z-10 w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 bg-copa-gold-400 rounded-2xl flex items-center justify-center shadow-lg">
            <Trophy className="w-10 h-10 text-copa-green-700" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Bolão na Copa</h1>
          <p className="text-copa-green-100 text-sm">
            {isLogin ? "Entre no seu bolão" : "Crie sua conta"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-copa-green-700">
                  Nome completo
                </Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-copa-green-100 focus:border-copa-green-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-copa-green-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-muted/50 border-copa-green-100 focus:border-copa-green-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-copa-green-700">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-muted/50 border-copa-green-100 focus:border-copa-green-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-copa-green-700">
                  Confirmar senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-copa-green-100 focus:border-copa-green-500"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-base rounded-xl shadow-md"
            >
              {isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          {isLogin && (
            <button className="text-sm text-copa-green-500 hover:underline w-full text-center">
              Esqueci minha senha
            </button>
          )}

          <div className="border-t pt-4">
            <p className="text-center text-sm text-muted-foreground mb-3">
              {isLogin ? "Ainda não tem conta?" : "Já tem uma conta?"}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full h-11 border-copa-green-500 text-copa-green-600 hover:bg-copa-green-50 font-semibold rounded-xl"
            >
              {isLogin ? (
                <>
                  <UserPlus className="w-4 h-4 mr-2" /> Criar conta
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao login
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
