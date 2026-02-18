import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Trash2, Crown, Check, Pencil, LogOut, Camera, Loader2, Zap, ExternalLink, Share2, UserPlus, Copy, Gift, MessageCircle, AlertTriangle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "@/hooks/useUserPlan";
import NotificacaoPreferencias from "@/components/NotificacaoPreferencias";

const Perfil = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { plano: userPlano, loading: loadingPlano } = useUserPlan();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackTipo, setFeedbackTipo] = useState<"duvida" | "sugestao" | "bug">("duvida");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [estado, setEstado] = useState<string>("");
  const [savingEstado, setSavingEstado] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      // Try to get profile from Supabase
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("nome, avatar_url, estado")
      .eq("id", user.id)
      .single();

    if (data) {
      setNome(data.nome || "");
      setAvatarUrl(data.avatar_url || null);
      setEstado((data as any).estado || "");
    } else {
      setNome(user.user_metadata?.nome || user.email?.split("@")[0] || "Jogador");
    }
  };

  const handleSaveEstado = async (novoEstado: string) => {
    if (!user) return;
    setSavingEstado(true);
    try {
      await supabase.from("profiles").update({ estado: novoEstado }).eq("id", user.id);
      setEstado(novoEstado);
      toast.success("Estado atualizado!");
    } catch { toast.error("Erro ao salvar estado"); }
    finally { setSavingEstado(false); }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + "?t=" + Date.now();

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Foto atualizada!");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao enviar foto. Verifique se o bucket 'avatars' existe no Supabase Storage.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nome: editName.trim() })
        .eq("id", user.id);

      if (error) throw error;

      setNome(editName.trim());
      setIsEditingName(false);
      toast.success("Nome atualizado!");
    } catch (error: any) {
      toast.error("Erro ao atualizar nome");
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logout realizado");
    navigate("/auth");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "EXCLUIR") return;
    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Erro ao excluir conta");

      await signOut();
      toast.success("Conta excluída com sucesso. Sentiremos sua falta!");
      navigate("/auth");
    } catch (err: any) {
      console.error("Erro ao excluir conta:", err);
      toast.error("Erro ao excluir conta. Tente novamente ou entre em contato pelo email.");
    } finally {
      setDeletingAccount(false);
      setShowDeleteDialog(false);
    }
  };

  const initials = nome
    ? nome
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* User header with avatar */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={handleAvatarClick}
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-copa-green-100 border-2 border-copa-green-200 hover:border-copa-green-400 transition-colors relative"
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-copa-green-500 animate-spin" />
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-copa-green-600">{initials}</span>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Olá, {nome || "Jogador"}</h2>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      {/* Plan Card */}
      <Card className="rounded-2xl shadow-sm border-copa-gold-200 overflow-hidden">
        <CardHeader className="pb-2 bg-copa-gold-50">
          <div className="flex items-center gap-2">
            {userPlano === "premium_pro" ? (
              <Zap className="w-5 h-5 text-copa-gold-500" />
            ) : (
              <Crown className="w-5 h-5 text-copa-gold-500" />
            )}
            <CardTitle className="text-base font-bold">Seu plano atual</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Badge className={`font-bold px-4 py-1 text-sm rounded-full ${
            userPlano === "premium_pro"
              ? "bg-copa-green-500 text-white"
              : userPlano === "premium"
              ? "bg-copa-gold-400 text-copa-green-800"
              : "bg-copa-green-500 text-white"
          }`}>
            {userPlano === "premium_pro" ? "PREMIUM PRO" : userPlano === "premium" ? "PREMIUM" : "FREE"}
          </Badge>

          {userPlano === "free" ? (
            <>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Criar até 1 bolão</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Participar de até 3 bolões</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Modo Casual</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Propagandas habilitadas</span>
                </div>
              </div>

              <Button
                onClick={() => navigate("/planos")}
                className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold rounded-xl shadow-md"
              >
                <Crown className="w-4 h-4 mr-2" />
                UPGRADE PARA PREMIUM
              </Button>
              <p className="text-center text-xs text-muted-foreground">Mais vantagens exclusivas</p>
            </>
          ) : userPlano === "premium" ? (
            <>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Bolões ilimitados</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Modos Casual + Amador e Vencedor ou Nada</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Participantes ilimitados no bolão</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Sem anúncios entre telas</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Filtros personalizados</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Badge "Premium" no perfil</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/planos")}
                  variant="outline"
                  className="flex-1 h-11 border-copa-gold-400 text-copa-gold-600 hover:bg-copa-gold-50 font-semibold rounded-xl"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Ver planos
                </Button>
                <Button
                  onClick={async () => {
                    setLoadingPortal(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("create-checkout", {
                        body: { priceId: "price_1T1TzjC1YtBHMBc2CGkzhsUe" },
                      });
                      if (error) throw error;
                      if (data?.url) window.location.href = data.url;
                    } catch {
                      toast.error("Erro ao iniciar pagamento.");
                    } finally {
                      setLoadingPortal(false);
                    }
                  }}
                  disabled={loadingPortal}
                  className="h-11 bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-xl px-4"
                >
                  {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
                  Upgrade PRO
                </Button>
              </div>

              <Button
                onClick={async () => {
                  setLoadingPortal(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("create-portal");
                    if (error) throw error;
                    if (data?.url) window.location.href = data.url;
                  } catch {
                    toast.error("Erro ao abrir cancelamento.");
                  } finally {
                    setLoadingPortal(false);
                  }
                }}
                disabled={loadingPortal}
                variant="ghost"
                className="w-full h-9 text-xs text-muted-foreground hover:text-destructive"
              >
                {loadingPortal ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Cancelar assinatura
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Todos os benefícios Premium</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Modos Profissional e Torcedor Fanático</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Modo Tudo ou Nada</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Modo Vencedor ou Nada</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Sem anúncios entre telas</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Bolões privados com senha</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-copa-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-copa-green-600" />
                  </div>
                  <span className="text-sm">Suporte prioritário</span>
                </div>
              </div>

              <Button
                onClick={() => navigate("/planos")}
                variant="outline"
                className="w-full h-11 border-copa-gold-400 text-copa-gold-600 hover:bg-copa-gold-50 font-semibold rounded-xl"
              >
                <Crown className="w-4 h-4 mr-2" />
                Ver planos
              </Button>

              <Button
                onClick={async () => {
                  setLoadingPortal(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("create-portal");
                    if (error) throw error;
                    if (data?.url) window.location.href = data.url;
                  } catch {
                    toast.error("Erro ao abrir cancelamento.");
                  } finally {
                    setLoadingPortal(false);
                  }
                }}
                disabled={loadingPortal}
                variant="ghost"
                className="w-full h-9 text-xs text-muted-foreground hover:text-destructive"
              >
                {loadingPortal ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Cancelar assinatura
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Detalhes da conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* Nome */}
          <div className="flex items-center justify-between py-3.5 border-b">
            <div className="flex items-center gap-3 flex-1">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Nome</p>
                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="h-8 bg-copa-green-500 hover:bg-copa-green-600 text-white text-xs px-3"
                    >
                      {savingName ? "..." : "Salvar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingName(false)}
                      className="h-8 text-xs px-2"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm font-medium">{nome || "—"}</p>
                )}
              </div>
            </div>
            {!isEditingName && (
              <button
                className="text-copa-green-500 hover:text-copa-green-600"
                onClick={() => {
                  setEditName(nome);
                  setIsEditingName(true);
                }}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Email */}
          <div className="flex items-center justify-between py-3.5 border-b">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="text-sm font-medium">{email}</p>
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center justify-between py-3.5 border-b">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Seu estado</p>
                <p className="text-sm font-medium">{estado || "Não informado"}</p>
              </div>
            </div>
            <select
              value={estado}
              onChange={(e) => handleSaveEstado(e.target.value)}
              disabled={savingEstado}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:border-copa-green-500 focus:outline-none"
            >
              <option value="">Selecione</option>
              <option value="AC">AC</option><option value="AL">AL</option>
              <option value="AP">AP</option><option value="AM">AM</option>
              <option value="BA">BA</option><option value="CE">CE</option>
              <option value="DF">DF</option><option value="ES">ES</option>
              <option value="GO">GO</option><option value="MA">MA</option>
              <option value="MT">MT</option><option value="MS">MS</option>
              <option value="MG">MG</option><option value="PA">PA</option>
              <option value="PB">PB</option><option value="PR">PR</option>
              <option value="PE">PE</option><option value="PI">PI</option>
              <option value="RJ">RJ</option><option value="RN">RN</option>
              <option value="RS">RS</option><option value="RO">RO</option>
              <option value="RR">RR</option><option value="SC">SC</option>
              <option value="SP">SP</option><option value="SE">SE</option>
              <option value="TO">TO</option>
            </select>
          </div>

          {/* Senha */}
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
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4" />
            Excluir conta
          </button>
        </CardContent>
      </Card>

      {/* Convidar Amigos */}
      <Card className="rounded-2xl shadow-sm border-copa-green-200 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-copa-green-100 flex items-center justify-center">
              <Gift className="w-5 h-5 text-copa-green-600" />
            </div>
            <div>
              <h3 className="text-base font-bold">Convidar Amigos</h3>
              <p className="text-xs text-muted-foreground">Traga seus amigos para competir nos bolões</p>
            </div>
          </div>

          <div className="bg-copa-green-50 rounded-xl p-3 mb-3">
            <p className="text-sm text-copa-green-700 text-center">
              Compartilhe o link e seus amigos poderão se cadastrar diretamente!
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                const url = `${window.location.origin}/auth`;
                navigator.clipboard.writeText(url);
                toast.success("Link copiado!");
              }}
              variant="outline"
              className="flex-1 h-11 border-copa-green-300 text-copa-green-600 hover:bg-copa-green-50 font-semibold rounded-xl"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar link
            </Button>
            <Button
              onClick={() => {
                const url = `${window.location.origin}/auth`;
                const text = `🏆 Vem jogar no Bolão na Copa! Faça seus palpites e dispute com seus amigos. Cadastre-se aqui: ${url}`;
                if (navigator.share) {
                  navigator.share({ title: "Bolão na Copa", text, url }).catch(() => {});
                } else {
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                  window.open(whatsappUrl, "_blank");
                }
              }}
              className="flex-1 h-11 bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-xl"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Preferências de Notificação ═══ */}
      <NotificacaoPreferencias />

      {/* Dúvidas e Sugestões */}
      <Card className="rounded-2xl shadow-sm border-blue-200 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold">Dúvidas ou Sugestões?</h3>
              <p className="text-xs text-muted-foreground">Fale diretamente conosco</p>
            </div>
          </div>

          {feedbackSent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-700">Mensagem enviada!</p>
              <p className="text-xs text-green-600 mt-1">Responderemos em breve no seu email.</p>
              <button
                onClick={() => { setFeedbackSent(false); setFeedbackMsg(""); }}
                className="text-xs text-blue-500 hover:underline mt-2"
              >
                Enviar outra mensagem
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["duvida", "sugestao", "bug"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFeedbackTipo(t)}
                    className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-all ${
                      feedbackTipo === t
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {t === "duvida" ? "❓ Dúvida" : t === "sugestao" ? "💡 Sugestão" : "🐛 Bug"}
                  </button>
                ))}
              </div>
              <textarea
                value={feedbackMsg}
                onChange={(e) => setFeedbackMsg(e.target.value)}
                placeholder="Escreva sua mensagem aqui..."
                className="w-full h-24 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-400 transition-colors"
                maxLength={1000}
              />
              <Button
                onClick={async () => {
                  if (!feedbackMsg.trim()) {
                    toast.error("Escreva sua mensagem");
                    return;
                  }
                  setSendingFeedback(true);
                  try {
                    const { error } = await supabase.functions.invoke("send-feedback", {
                      body: {
                        nome,
                        email,
                        mensagem: feedbackMsg.trim(),
                        tipo: feedbackTipo,
                      },
                    });
                    if (error) throw error;
                    setFeedbackSent(true);
                    toast.success("Mensagem enviada com sucesso!");
                  } catch {
                    toast.error("Erro ao enviar. Tente novamente.");
                  } finally {
                    setSendingFeedback(false);
                  }
                }}
                disabled={sendingFeedback || !feedbackMsg.trim()}
                className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {sendingFeedback ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {sendingFeedback ? "Enviando..." : "Enviar mensagem"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        onClick={handleLogout}
        className="w-full h-11 border-destructive text-destructive hover:bg-destructive/5 font-semibold rounded-xl"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da conta
      </Button>

      {/* Dialog de exclusão de conta */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Excluir conta
            </DialogTitle>
            <DialogDescription>
              Esta ação é permanente e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 space-y-1">
              <p className="font-semibold">Ao excluir sua conta, serão removidos:</p>
              <p>• Seus dados pessoais (nome, email, foto)</p>
              <p>• Todos os seus palpites e histórico</p>
              <p>• Participação em todos os bolões</p>
              <p>• Assinatura Premium (se houver)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Digite <strong className="text-destructive font-mono">EXCLUIR</strong> para confirmar:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="border-red-200 focus:border-red-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(""); }}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "EXCLUIR" || deletingAccount}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-xl"
              >
                {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {deletingAccount ? "Excluindo..." : "Excluir conta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Perfil;
