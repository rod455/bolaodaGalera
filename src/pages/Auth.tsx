import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Trophy, Eye, EyeOff, Mail, Lock, UserPlus, ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TIMES_BRASIL = [
  "América-MG", "Athletico-PR", "Atlético-MG", "Bahia", "Botafogo", "Bragantino",
  "Ceará", "Chapecoense", "Corinthians", "Coritiba", "Criciúma", "Cruzeiro",
  "Cuiabá", "Flamengo", "Fluminense", "Fortaleza", "Goiás", "Grêmio",
  "Internacional", "Juventude", "Mirassol", "Náutico", "Novorizontino",
  "Operário-PR", "Palmeiras", "Paysandu", "Ponte Preta", "Santos",
  "São Paulo", "Sport", "Vasco", "Vitória",
  "Seleção Brasileira", "Não tenho",
];

const Auth = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeCoracao, setTimeCoracao] = useState("");
  const [timeBusca, setTimeBusca] = useState("");
  const [showTimeSuggestions, setShowTimeSuggestions] = useState(false);
  const timeInputRef = useRef<HTMLDivElement>(null);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timeInputRef.current && !timeInputRef.current.contains(e.target as Node)) {
        setShowTimeSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const timesFiltrados = timeBusca.length > 0
    ? TIMES_BRASIL.filter((t) => t.toLowerCase().includes(timeBusca.toLowerCase()))
    : [];

  // If already logged in, redirect to home
  if (!loading && session) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isLogin) {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
        navigate("/home");
      } else {
        // Register
        if (password !== confirmPassword) {
          toast.error("As senhas não coincidem");
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          toast.error("A senha deve ter pelo menos 6 caracteres");
          setIsSubmitting(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome: name,
              time_coracao: timeCoracao || null,
            },
          },
        });
        if (error) throw error;
        toast.success("Conta criada com sucesso! Verifique seu email.");
        setIsLogin(true);
      }
    } catch (error: any) {
      const msg = error.message;
      if (msg.includes("Invalid login")) {
        toast.error("Email ou senha incorretos");
      } else if (msg.includes("already registered")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error(msg || "Erro ao processar. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-copa-green-500 flex flex-col items-center justify-center p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-copa-green-400 to-copa-green-700 opacity-80" />

      <div className="relative z-10 w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img src="https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png"
            alt="Bolão na Copa" className="w-44 h-44 object-contain drop-shadow-lg" />
          <p className="text-copa-green-100 text-sm">
            {isLogin ? "Seu palpite, sua torcida, sua galera." : "Crie sua conta"}
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
                    required={!isLogin}
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
                  required
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
                  required
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
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2" ref={timeInputRef}>
                <Label className="text-sm font-medium text-copa-green-700">
                  Time do coração
                </Label>
                <div className="relative">
                  <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite para buscar..."
                    value={timeCoracao || timeBusca}
                    onChange={(e) => {
                      setTimeCoracao("");
                      setTimeBusca(e.target.value);
                      setShowTimeSuggestions(true);
                    }}
                    onFocus={() => { if (timeBusca.length > 0) setShowTimeSuggestions(true); }}
                    className={`pl-10 h-12 bg-muted/50 border-copa-green-100 focus:border-copa-green-500 ${
                      timeCoracao ? "text-copa-green-700 font-medium" : ""
                    }`}
                  />
                  {timeCoracao && (
                    <button type="button"
                      onClick={() => { setTimeCoracao(""); setTimeBusca(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">
                      ✕
                    </button>
                  )}
                  {showTimeSuggestions && timesFiltrados.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-copa-green-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {timesFiltrados.map((time) => (
                        <button key={time} type="button"
                          onClick={() => {
                            setTimeCoracao(time);
                            setTimeBusca("");
                            setShowTimeSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-copa-green-50 transition-colors flex items-center gap-2">
                          {time === "Não tenho" ? (
                            <span className="text-muted-foreground">{time}</span>
                          ) : (
                            <>
                              <Heart className="w-3.5 h-3.5 text-red-400" />
                              <span>{time}</span>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-base rounded-xl shadow-md disabled:opacity-50"
            >
              {isSubmitting ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
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
