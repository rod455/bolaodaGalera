import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Trash2, Crown, Check, Pencil, LogOut, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Perfil = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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
      .select("nome, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) {
      setNome(data.nome || "");
      setAvatarUrl(data.avatar_url || null);
    } else {
      // Fallback to auth metadata
      setNome(user.user_metadata?.nome || user.email?.split("@")[0] || "Jogador");
    }
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
        onClick={handleLogout}
        className="w-full h-11 border-destructive text-destructive hover:bg-destructive/5 font-semibold rounded-xl"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da conta
      </Button>
    </div>
  );
};

export default Perfil;
