import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Trophy, Eye, EyeOff, Mail, Lock, UserPlus, ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { signInWithGoogle } from "@/lib/googleAuth";
import { signInWithApple } from "@/lib/appleAuth";
import { trackEvent, trackConversion } from "@/lib/analytics";
import SEOHead from "@/components/SEOHead";

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

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
  const [searchParams] = useSearchParams();
  const { session, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(searchParams.get("modo") !== "cadastro");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
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

  // Scroll automático para o campo focado quando teclado abre
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    };
    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);

  const timesFiltrados = timeBusca.length > 0
    ? TIMES_BRASIL.filter((t) => t.toLowerCase().includes(timeBusca.toLowerCase()))
    : [];

  // Detectar fluxo de recuperação de senha
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsResettingPassword(true);
      }
      // Processar referral pendente após OAuth redirect (Google/Apple)
      if (event === "SIGNED_IN" && session?.user) {
        const pendingRef = localStorage.getItem("pending_referral");
        if (pendingRef) {
          localStorage.removeItem("pending_referral");
          try {
            await supabase.rpc("processar_referral", {
              p_referred_id: session.user.id,
              p_referral_code: pendingRef,
            });
          } catch {}
        }
      }
    });
    if (searchParams.get("modo") === "reset") {
      setIsResettingPassword(true);
    }
    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error("A senha deve ter pelo menos 1 letra maiúscula e 1 número");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setIsResettingPassword(false);
      navigate("/home");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsSubmitting(false);
    }
  };

  const bolaoRedirect = searchParams.get("bolao");
  const refCode = searchParams.get("ref");

  // Salvar refCode no localStorage para não perder durante OAuth redirect
  useEffect(() => {
    if (refCode) {
      localStorage.setItem("pending_referral", refCode);
    }
  }, [refCode]);

  // If already logged in AND not resetting password, redirect
  if (!loading && session && !isResettingPassword) {
    if (bolaoRedirect) {
      return <Navigate to={`/bolao/${bolaoRedirect}`} replace />;
    }
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
        navigate(bolaoRedirect ? `/bolao/${bolaoRedirect}` : "/home");
      } else {
        // Register
        if (password.length < 8) {
          toast.error("A senha deve ter pelo menos 8 caracteres");
          setIsSubmitting(false);
          return;
        }
        if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
          toast.error("A senha deve ter pelo menos 1 letra maiúscula e 1 número");
          setIsSubmitting(false);
          return;
        }
        const { error, data: signUpData } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome: name,
              origem: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
              ...((() => { try { const u = JSON.parse(localStorage.getItem('bolao_utm_params') || '{}'); return u.utm_source ? { utm_source: u.utm_source, utm_medium: u.utm_medium, utm_campaign: u.utm_campaign } : {}; } catch { return {}; } })()),
            },
          },
        });
        if (error) throw error;

        // Processar referral se veio com código de convite
        if (refCode && signUpData?.user?.id) {
          try {
            await supabase.rpc("processar_referral", {
              p_referred_id: signUpData.user.id,
              p_referral_code: refCode,
            });
          } catch (_e) { /* referral falhou silenciosamente */ }
        }

        // Dispara eventos Google Ads
        trackEvent('Criar_Conta', { metodo: 'email' });
        trackConversion('AW-16846659267/9D4iCMqM7fkbEMO9juE-');

        toast.success("Conta criada! Verifique seu email (olhe também a pasta Spam/Lixo eletrônico).", { duration: 8000 });
        setIsLogin(true);
      }
    } catch (error: any) {
      const msg = error.message;
      if (msg.includes("Invalid login") || msg.includes("already registered")) {
        toast.error("Credenciais inválidas. Verifique seu email e senha.");
      } else {
        toast.error(msg || "Erro ao processar. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIOS = Capacitor.getPlatform() === "ios";

  const handleAppleLogin = async () => {
    try {
      trackEvent('Criar_Conta', { metodo: 'apple' });
      const redirectPath = bolaoRedirect ? `/bolao/${bolaoRedirect}` : "/home";
      const result = await signInWithApple(redirectPath);

      if (result.success && refCode) {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            await supabase.rpc("processar_referral", {
              p_referred_id: currentUser.id,
              p_referral_code: refCode,
            });
          }
        } catch {}
      }

      if (result.success && Capacitor.isNativePlatform()) {
        const origem = Capacitor.getPlatform();
        supabase.auth.updateUser({ data: { origem } }).catch(() => {});
        toast.success("Login realizado com sucesso!");
        navigate(redirectPath);
      } else if (!result.success && result.error) {
        if (result.error !== "Login cancelado") {
          toast.error(result.error);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login com Apple");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      trackEvent('Criar_Conta', { metodo: 'google' });
      const redirectPath = bolaoRedirect ? `/bolao/${bolaoRedirect}` : "/home";
      const result = await signInWithGoogle(redirectPath);

      // Processar referral se veio com código de convite (Google login)
      if (result.success && refCode) {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            await supabase.rpc("processar_referral", {
              p_referred_id: currentUser.id,
              p_referral_code: refCode,
            });
          }
        } catch {}
      }

      if (result.success && Capacitor.isNativePlatform()) {
        // Salvar origem do cadastro
        const origem = Capacitor.getPlatform();
        supabase.auth.updateUser({ data: { origem } }).catch(() => {});
        // No app nativo, o login já foi feito — navegar
        toast.success("Login realizado com sucesso!");
        navigate(redirectPath);
      } else if (!result.success && result.error) {
        if (result.error !== "Login cancelado") {
          toast.error(result.error);
        }
      }
      // Na web, o redirect acontece automaticamente
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login com Google");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu email");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://www.bolaonacopa.com.br/auth?modo=reset",
      });
      if (error) throw error;
      setResetEmailSent(true);
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada e spam.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Detectar WebView do Instagram/Facebook/TikTok (Google OAuth não funciona nesses browsers)
  const isWebView = /FBAN|FBAV|Instagram|Line|TikTok|Snapchat/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-copa-green-500 flex flex-col items-center justify-start p-6 overflow-y-auto pt-8 pb-[40vh]">
      <SEOHead
        title="Criar Conta Grátis ou Entrar"
        description="Crie sua conta grátis no Bolão na Copa e comece a palpitar nos jogos do Brasileirão, Copa do Mundo 2026, Champions League e mais. Cadastro com Google em 10 segundos."
        path="/auth"
        keywords="criar conta bolão, bolão na copa cadastro, bolão grátis, login bolão da copa"
      />
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-copa-green-400 to-copa-green-700 opacity-80" />

      <div className="relative z-10 w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img src="https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png"
            alt="Bolão na Copa" className="w-44 h-44 object-contain drop-shadow-lg" />
          <p className="text-copa-green-100 text-sm">
            {isResettingPassword ? "Defina sua nova senha" : isForgotPassword ? "Recupere sua senha" : isLogin ? "Seu palpite, sua torcida, sua galera." : "Crie sua conta grátis em segundos"}
          </p>
          {!isResettingPassword && !isForgotPassword && !isLogin && (
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mt-2">
              <span className="text-xs font-semibold text-white/90">
                {bolaoRedirect ? "🏆 Crie sua conta para entrar no bolão" : "⚽ Junte-se a centenas de torcedores"}
              </span>
            </div>
          )}
        </div>

        {/* ═══ TELA: Redefinir senha (após clicar no link do email) ═══ */}
        {isResettingPassword ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold text-copa-green-700">Nova senha</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Digite sua nova senha abaixo.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium text-copa-green-700">
                  Nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-muted/50 border-copa-green-100 focus:border-copa-green-500"
                    required
                    autoFocus
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
              <div className="space-y-2">
                <Label htmlFor="new-password-confirm" className="text-sm font-medium text-copa-green-700">
                  Confirmar nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-copa-green-100 focus:border-copa-green-500"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-base rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmitting ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          </div>
        ) : (
        <>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-5">

          {/* ═══ TELA: Esqueci minha senha ═══ */}
          {isForgotPassword ? (
            <>
              {resetEmailSent ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-copa-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-copa-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-copa-green-700">Email enviado!</h3>
                  <p className="text-sm text-muted-foreground">
                    Enviamos um link de recuperação para <strong>{email}</strong>. 
                    Verifique sua caixa de entrada e também a pasta de spam.
                  </p>
                  <Button
                    type="button"
                    onClick={() => { setIsForgotPassword(false); setResetEmailSent(false); }}
                    className="w-full h-11 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="text-center mb-2">
                    <h3 className="text-lg font-bold text-copa-green-700">Esqueceu sua senha?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Informe seu email e enviaremos um link para redefinir sua senha.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-medium text-copa-green-700">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 bg-muted/50 border-copa-green-100 focus:border-copa-green-500"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-base rounded-xl shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full text-sm text-copa-green-500 hover:underline text-center flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
                  </button>
                </form>
              )}
            </>
          ) : (
          /* ═══ TELA: Login / Cadastro ═══ */
          <>
          {/* Google Login — esconder em WebViews onde não funciona */}
          {!isWebView && (
            <>
            <div className="space-y-3">
              <button
                onClick={handleGoogleLogin}
                className="w-full h-12 flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-copa-green-400 hover:shadow-md rounded-xl font-semibold text-sm text-gray-700 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLogin ? "Entrar com Google" : "Cadastrar com Google"}
              </button>

              {/* Sign in with Apple — exibir no iOS nativo e na web */}
              {(isIOS || !Capacitor.isNativePlatform()) && (
                <button
                  onClick={handleAppleLogin}
                  className="w-full h-12 flex items-center justify-center gap-3 bg-black hover:bg-gray-900 rounded-xl font-semibold text-sm text-white transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  {isLogin ? "Entrar com Apple" : "Cadastrar com Apple"}
                </button>
              )}

              <p className="text-[10px] text-center text-muted-foreground">Rápido e sem precisar de senha</p>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-muted-foreground">ou {isLogin ? "entre" : "cadastre-se"} com email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-copa-green-700">
                  Nome <span className="text-muted-foreground font-normal">(como aparece no ranking)</span>
                </Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome ou apelido"
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
                Senha {!isLogin && <span className="text-muted-foreground font-normal">(mínimo 8 caracteres, 1 maiúscula e 1 número)</span>}
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

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-base rounded-xl shadow-md disabled:opacity-50"
            >
              {isSubmitting ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>

            {!isLogin && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Após criar sua conta, verifique seu email. <b>Olhe também a pasta Spam/Lixo eletrônico.</b>
                </p>
              </div>
            )}
          </form>

          {isLogin && (
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="text-sm text-copa-green-500 hover:underline w-full text-center"
            >
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
          </>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default Auth;
