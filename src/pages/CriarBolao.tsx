import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Lock, Info, Check, X, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Campeonato {
  id: string;
  nome: string;
  nome_popular: string;
  logo_url: string;
  temporada: number;
  tipo: string;
}

interface ModoInfo {
  titulo: string;
  descricao: string;
  regras: { texto: string; pontos: string; acerto: boolean }[];
}

const modosPontuacao = [
  { id: "casual", nome: "Casual", subtitulo: "Iniciantes", plano: "free" },
  { id: "placar_correto", nome: "Placar Correto", subtitulo: "Tudo ou Nada simplificado", plano: "free" },
  { id: "amador", nome: "Amador", subtitulo: "Intermediário", plano: "premium" },
  { id: "vencedor_ou_nada", nome: "Vencedor ou Nada", subtitulo: "Acerte o vencedor", plano: "premium" },
  { id: "profissional", nome: "Profissional", subtitulo: "Avançado", plano: "premium_pro" },
  { id: "fanatico", nome: "Torcedor Fanático", subtitulo: "Só jogos do seu time", plano: "premium_pro" },
  { id: "tudo_ou_nada", nome: "Tudo ou Nada", subtitulo: "Placar exato ou zero", plano: "premium_pro" },
];

const modosDetalhes: Record<string, ModoInfo> = {
  casual: {
    titulo: "Iniciantes / Casual",
    descricao: "Modo simples para quem está começando.",
    regras: [
      { texto: "Placar exato", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "3 pontos", acerto: true },
      { texto: "Apostar no empate e errar número de gols", pontos: "5 pontos", acerto: true },
    ],
  },
  placar_correto: {
    titulo: "Placar Correto",
    descricao: "Simples: acertou o placar exato, pontuou. Errou, zero.",
    regras: [
      { texto: "Placar exato", pontos: "10 pontos", acerto: true },
      { texto: "Errou o placar", pontos: "0 pontos", acerto: false },
    ],
  },
  amador: {
    titulo: "Intermediário / Amadores",
    descricao: "Mais detalhado, com pontos extras por diferença de gols.",
    regras: [
      { texto: "Placar exato", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "3 pontos", acerto: true },
      { texto: "Apostar no empate e errar número de gols", pontos: "5 pontos", acerto: true },
      { texto: "Diferença de gols correta", pontos: "3 pontos", acerto: true },
      { texto: "Número de gols do vencedor", pontos: "2 pontos", acerto: true },
      { texto: "Número de gols do perdedor", pontos: "2 pontos", acerto: true },
    ],
  },
  vencedor_ou_nada: {
    titulo: "Vencedor ou Nada",
    descricao: "Pontua por acertar o vencedor ou o empate.",
    regras: [
      { texto: "Vencedor", pontos: "5 pontos", acerto: true },
      { texto: "Empate", pontos: "5 pontos", acerto: true },
      { texto: "Errou", pontos: "0 pontos", acerto: false },
    ],
  },
  profissional: {
    titulo: "Avançado / Profissional",
    descricao: "Modo completo com pontuações altas e bonificações detalhadas.",
    regras: [
      { texto: "Placar exato", pontos: "20 pontos", acerto: true },
      { texto: "Vencedor + gols do vencedor", pontos: "12 pontos", acerto: true },
      { texto: "Vencedor + gols do perdedor", pontos: "8 pontos", acerto: true },
      { texto: "Vencedor + Diferença de gols", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "5 pontos", acerto: true },
      { texto: "Empate e errar número de gols", pontos: "8 pontos", acerto: true },
      { texto: "Número de gols do vencedor", pontos: "2 pontos", acerto: true },
      { texto: "Número de gols do perdedor", pontos: "2 pontos", acerto: true },
    ],
  },
  fanatico: {
    titulo: "Torcedor Fanático",
    descricao: "Escolha seu time de coração e só vale apostas nos jogos do seu time.",
    regras: [
      { texto: "Placar exato", pontos: "20 pontos", acerto: true },
      { texto: "Vencedor + gols do vencedor", pontos: "12 pontos", acerto: true },
      { texto: "Vencedor + gols do perdedor", pontos: "8 pontos", acerto: true },
      { texto: "Vencedor + Diferença de gols", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "5 pontos", acerto: true },
      { texto: "Empate e errar número de gols", pontos: "8 pontos", acerto: true },
      { texto: "Número de gols do vencedor", pontos: "2 pontos", acerto: true },
      { texto: "Número de gols do perdedor", pontos: "2 pontos", acerto: true },
    ],
  },
  tudo_ou_nada: {
    titulo: "Tudo ou Nada",
    descricao: "Só pontua se acertar o placar exato. Para os corajosos!",
    regras: [
      { texto: "Placar exato", pontos: "10 pontos", acerto: true },
      { texto: "Errou o placar", pontos: "0 pontos", acerto: false },
    ],
  },
};

const CriarBolao = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modoSelecionado, setModoSelecionado] = useState("");
  const [campeonatoSelecionado, setCampeonatoSelecionado] = useState("");
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [loadingCampeonatos, setLoadingCampeonatos] = useState(true);
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [infoModal, setInfoModal] = useState<ModoInfo | null>(null);

  // TODO: get from user profile in Supabase
  const userPlano = "free";

  useEffect(() => {
    loadCampeonatos();
  }, []);

  const loadCampeonatos = async () => {
    try {
      const { data, error } = await supabase
        .from("campeonatos")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setCampeonatos((data as any[]) || []);
    } catch (err) {
      console.error("Erro ao carregar campeonatos:", err);
    } finally {
      setLoadingCampeonatos(false);
    }
  };

  const isLocked = (plano: string) => {
    if (userPlano === "premium_pro") return false;
    if (userPlano === "premium" && plano === "premium_pro") return true;
    if (userPlano === "free" && (plano === "premium" || plano === "premium_pro")) return true;
    return false;
  };

  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 2MB.");
      return;
    }
    setImagemFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagemPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCriar = async () => {
    if (!campeonatoSelecionado) {
      toast.error("Selecione um campeonato");
      return;
    }
    if (!nome) {
      toast.error("Informe o nome do bolão");
      return;
    }
    if (!modoSelecionado) {
      toast.error("Selecione o modo de pontuação");
      return;
    }
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setCriando(true);

    try {
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

      let imagemUrl: string | null = null;

      // Upload da imagem se houver
      if (imagemFile) {
        const ext = imagemFile.name.split(".").pop();
        const path = `boloes/${codigo}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, imagemFile);

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(path);
          imagemUrl = urlData.publicUrl;
        }
      }

      const { data: newBolao, error } = await supabase.from("boloes").insert({
        nome,
        descricao: descricao || null,
        imagem_url: imagemUrl,
        codigo_convite: codigo,
        criador_id: user.id,
        campeonato_id: campeonatoSelecionado,
        modo_pontuacao: modoSelecionado,
        regras_ativas: [],
        is_publico: false,
        is_nacional: false,
      }).select("id").single();

      if (error) throw error;

      // Garantir que o perfil existe
      await supabase.from("profiles").upsert(
        { id: user.id, nome: user.user_metadata?.nome || user.email?.split("@")[0] || "Usuário" },
        { onConflict: "id" }
      );

      // Adicionar criador como participante
      await supabase.from("bolao_participantes").insert({
        bolao_id: newBolao.id,
        user_id: user.id,
      });

      toast.success(`Bolão criado! Código: ${codigo}`);
      navigate(`/bolao/${newBolao.id}`);
    } catch (err: any) {
      console.error("Erro ao criar bolão:", err);
      toast.error(err.message || "Erro ao criar bolão");
    } finally {
      setCriando(false);
    }
  };

  const getPlanoBadge = (plano: string) => {
    if (plano === "premium") return "Premium";
    if (plano === "premium_pro") return "PRO";
    return null;
  };

  const getTipoIcon = (tipo: string) => {
    if (tipo === "mundial") return "🌍";
    if (tipo === "continental") return "⭐";
    return "🏆";
  };

  // Auto-scroll to next section
  const scrollToSection = (sectionId: string) => {
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold">Criar Bolão</h2>
      </div>

      {/* 1. Basic Info */}
      <Card id="section-info" className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-copa-green-500 text-white text-xs font-bold flex items-center justify-center">1</span>
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nome do Bolão</Label>
            <Input
              placeholder="Ex: Bolão da Galera"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11 rounded-xl bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descrição</Label>
            <Input
              placeholder="Descreva seu bolão"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onBlur={() => { if (nome.trim()) scrollToSection("section-pontuacao"); }}
              className="h-11 rounded-xl bg-muted/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Modo de Pontuação */}
      <Card id="section-pontuacao" className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-copa-green-500 text-white text-xs font-bold flex items-center justify-center">2</span>
            Modo de Pontuação
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Selecione como os pontos serão calculados
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {modosPontuacao.map((modo) => {
            const locked = isLocked(modo.plano);
            const selected = modoSelecionado === modo.id;
            const badge = getPlanoBadge(modo.plano);

            return (
              <div
                key={modo.id}
                onClick={() => {
                  if (locked) {
                    toast.error("Faça upgrade para desbloquear este modo");
                    navigate("/planos");
                    return;
                  }
                  setModoSelecionado(modo.id);
                  scrollToSection("section-campeonato");
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border-2 ${
                  selected
                    ? "border-copa-green-500 bg-copa-green-50"
                    : locked
                    ? "border-transparent bg-muted/30 opacity-60"
                    : "border-transparent bg-muted/50 hover:bg-muted/80"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selected
                        ? "border-copa-green-500 bg-copa-green-500"
                        : "border-gray-300"
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{modo.nome}</span>
                      {badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-copa-gold-100 text-copa-gold-600">
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{modo.subtitulo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoModal(modosDetalhes[modo.id]);
                    }}
                    className="w-6 h-6 rounded-full bg-copa-green-100 hover:bg-copa-green-200 flex items-center justify-center transition-colors"
                    title="Ver regras"
                  >
                    <Info className="w-3.5 h-3.5 text-copa-green-600" />
                  </button>
                  {locked && <Lock className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 3. Campeonato Selector */}
      <Card id="section-campeonato" className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-copa-green-500 text-white text-xs font-bold flex items-center justify-center">3</span>
            <Trophy className="w-4 h-4 text-copa-gold-500" />
            Campeonato
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Selecione o campeonato que será usado no bolão
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingCampeonatos ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-copa-green-500 animate-spin" />
            </div>
          ) : (
            campeonatos.map((camp) => {
              const selected = campeonatoSelecionado === camp.id;
              return (
                <div
                  key={camp.id}
                  onClick={() => {
                    setCampeonatoSelecionado(camp.id);
                    scrollToSection("section-imagem");
                  }}
                  className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all border-2 ${
                    selected
                      ? "border-copa-green-500 bg-copa-green-50"
                      : "border-transparent bg-muted/50 hover:bg-muted/80"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selected
                        ? "border-copa-green-500 bg-copa-green-500"
                        : "border-gray-300"
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {camp.logo_url ? (
                    <img
                      src={camp.logo_url}
                      alt={camp.nome_popular}
                      className="w-8 h-8 object-contain flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-xl flex-shrink-0">{getTipoIcon(camp.tipo)}</span>
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold block truncate">
                      {camp.nome_popular || camp.nome}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Temporada {camp.temporada}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          {!loadingCampeonatos && campeonatos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum campeonato disponível. Execute a sincronização primeiro.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 4. Upload Cover */}
      <Card id="section-imagem" className="border-dashed border-2 border-copa-green-200 rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <label className="cursor-pointer flex flex-col items-center hover:opacity-80 transition-opacity">
            {imagemPreview ? (
              <div className="relative w-full max-w-xs">
                <img
                  src={imagemPreview}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-xl"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setImagemFile(null);
                    setImagemPreview(null);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-copa-green-100 rounded-full flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-copa-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Adicionar imagem de capa{" "}
                  <span className="text-xs text-muted-foreground/60">(opcional)</span>
                </p>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagemChange}
            />
          </label>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        onClick={handleCriar}
        disabled={criando}
        className="w-full h-13 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-base rounded-xl shadow-md disabled:opacity-60"
      >
        {criando ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Criando...
          </>
        ) : (
          "Criar Bolão"
        )}
      </Button>

      {/* Info Modal */}
      <Dialog open={!!infoModal} onOpenChange={() => setInfoModal(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-copa-green-700">
              {infoModal?.titulo}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {infoModal?.descricao}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {infoModal?.regras.map((regra, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                  regra.acerto ? "bg-copa-green-50" : "bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {regra.acerto ? (
                    <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="text-sm">{regra.texto}</span>
                </div>
                <span
                  className={`text-sm font-bold whitespace-nowrap ml-2 ${
                    regra.acerto ? "text-copa-green-600" : "text-red-500"
                  }`}
                >
                  {regra.pontos}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CriarBolao;
