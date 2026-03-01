import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Lock, Info, Check, Trophy, Loader2, X, ChevronDown, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import AdRewardModal from "@/components/AdRewardModal";
import RegrasModal from "@/components/RegrasModal";
import type { RegraInfo } from "@/lib/types";
import { MODO_REGRAS, MODOS_PONTUACAO } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import { useGamification } from "@/hooks/useGamification";
import XPToast from "@/components/XPToast";
import { trackEvent } from "@/lib/analytics";

interface Campeonato {
  id: string;
  nome: string;
  nome_popular: string;
  logo_url: string;
  temporada: number;
  tipo: string;
}

interface TimeOption {
  nome: string;
  logo: string | null;
}

/* ─── Categorias de campeonatos ─── */
interface CategoriaConfig {
  id: string;
  label: string;
  emoji: string;
  tipos: string[];
  keywords: string[];
}

const CATEGORIAS: CategoriaConfig[] = [
  { id: "estaduais", label: "Campeonatos Estaduais", emoji: "🏟️", tipos: ["estadual"], keywords: ["Mineiro", "Paulistão", "Gaúcho", "Carioca", "Baiano", "Catarinense", "Paranaense", "Pernambucano"] },
  { id: "nacionais", label: "Campeonatos Nacionais", emoji: "🇧🇷", tipos: ["nacional"], keywords: ["Brasileirão", "Copa do Brasil", "Serie A", "Serie B"] },
  { id: "copa_mundo", label: "Copa do Mundo", emoji: "🌍", tipos: ["mundial"], keywords: ["Copa do Mundo", "World Cup"] },
  { id: "europeus", label: "Campeonatos Europeus", emoji: "⭐", tipos: ["continental"], keywords: ["Champions League", "Europa League", "Conference League", "Premier League", "La Liga", "Bundesliga", "Serie A IT", "Ligue 1"] },
];

const categorizeCampeonato = (camp: Campeonato): string => {
  for (const cat of CATEGORIAS) {
    if (camp.tipo && cat.tipos.includes(camp.tipo)) return cat.id;
  }
  const nome = (camp.nome_popular || camp.nome || "").toLowerCase();
  for (const cat of CATEGORIAS) {
    for (const kw of cat.keywords) {
      if (nome.includes(kw.toLowerCase())) return cat.id;
    }
  }
  return "nacionais";
};

const CriarBolao = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modoSelecionado, setModoSelecionado] = useState("");
  const [campeonatosSelecionados, setCampeonatosSelecionados] = useState<string[]>([]);
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [loadingCampeonatos, setLoadingCampeonatos] = useState(true);
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [infoModal, setInfoModal] = useState<RegraInfo | null>(null);
  const [regrasAtivas, setRegrasAtivas] = useState<string[]>([]);
  const [regrasModalOpen, setRegrasModalOpen] = useState(false);
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);

  // Fanático - time do coração
  const [timeFavorito, setTimeFavorito] = useState("");
  const [timesDisponiveis, setTimesDisponiveis] = useState<TimeOption[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [buscaTime, setBuscaTime] = useState("");
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const { darXP } = useGamification();
  const [xpToast, setXPToast] = useState<{xp: number, msg: string} | null>(null);

  const { plano: userPlano } = useUserPlan();
  const { showAd, adLoading, resolveWebAd, needsAd } = useRewardedAd();
  const [showAdModal, setShowAdModal] = useState(false);
  const [adCallback, setAdCallback] = useState<(() => void) | null>(null);

  useEffect(() => { loadCampeonatos(); }, []);

  useEffect(() => {
    if (modoSelecionado && MODO_REGRAS[modoSelecionado]) {
      const todasRegras = MODO_REGRAS[modoSelecionado].regras
        .filter((r) => r.acerto)
        .map((r) => r.texto);
      setRegrasAtivas(todasRegras);
      setRegrasModalOpen(true);
    } else {
      setRegrasAtivas([]);
    }
  }, [modoSelecionado]);

  // Carregar times quando campeonatos mudam E modo é fanático
  useEffect(() => {
    if (campeonatosSelecionados.length > 0 && modoSelecionado === "fanatico") {
      loadTimes(campeonatosSelecionados[0]);
      setTimeModalOpen(true);
    } else {
      setTimesDisponiveis([]);
      setTimeFavorito("");
      setTimeModalOpen(false);
    }
  }, [campeonatosSelecionados, modoSelecionado]);

  const loadCampeonatos = async () => {
    try {
      const { data, error } = await supabase.from("campeonatos").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      setCampeonatos((data as any[]) || []);
    } catch (err) { console.error("Erro ao carregar campeonatos:", err); }
    finally { setLoadingCampeonatos(false); }
  };

  const loadTimes = async (campeonatoId: string) => {
    setLoadingTimes(true);
    try {
      const { data: jogos } = await supabase
        .from("jogos")
        .select("time_a, time_b, logo_time_a, logo_time_b")
        .eq("campeonato_id", campeonatoId);

      if (!jogos) { setTimesDisponiveis([]); return; }

      const timesMap = new Map<string, string | null>();
      jogos.forEach((j: any) => {
        if (j.time_a && !j.time_a.includes("Venc.") && !j.time_a.includes("TBD")) {
          if (!timesMap.has(j.time_a)) timesMap.set(j.time_a, j.logo_time_a);
        }
        if (j.time_b && !j.time_b.includes("Venc.") && !j.time_b.includes("TBD")) {
          if (!timesMap.has(j.time_b)) timesMap.set(j.time_b, j.logo_time_b);
        }
      });

      const sorted = Array.from(timesMap.entries())
        .map(([nome, logo]) => ({ nome, logo }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setTimesDisponiveis(sorted);
    } catch (err) { console.error("Erro ao carregar times:", err); }
    finally { setLoadingTimes(false); }
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
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande. Máximo 2MB."); return; }
    setImagemFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagemPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleRegra = (regraTexto: string) => {
    setRegrasAtivas((prev) =>
      prev.includes(regraTexto) ? prev.filter((r) => r !== regraTexto) : [...prev, regraTexto]
    );
  };

  const isFanatico = modoSelecionado === "fanatico";
  const isMataMata = modoSelecionado === "mata_mata";

  const handleCriar = async () => {
    if (campeonatosSelecionados.length === 0) { toast.error("Selecione pelo menos um campeonato"); return; }
    if (!nome) { toast.error("Informe o nome do bolão"); return; }
    if (!modoSelecionado) { toast.error("Selecione o modo de pontuação"); return; }
    if (!isMataMata && regrasAtivas.length === 0) { toast.error("Selecione pelo menos uma regra de pontuação"); return; }
    if (isMataMata && campeonatosSelecionados.length > 1) { toast.error("Mata a Mata permite apenas 1 campeonato"); return; }
    if (isFanatico && !timeFavorito) { toast.error("Escolha seu time do coração"); return; }
    if (!user) { toast.error("Você precisa estar logado"); return; }

    // Verificar limite de criação no plano Free (1 bolão)
    if (userPlano === "free" || !userPlano) {
      const { count } = await supabase
        .from("boloes")
        .select("*", { count: "exact", head: true })
        .eq("criador_id", user.id)
        .eq("is_nacional", false);
      if ((count || 0) >= 1) {
        toast.error("Você atingiu o limite de 1 bolão no plano Free. Faça upgrade para criar mais!");
        navigate("/planos");
        return;
      }
    }

    // Mostrar ad para usuários free
    if (needsAd) {
      const adResult = await showAd("criar");
      if (!adResult) return;
    }

    setCriando(true);
    try {
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      let imagemUrl: string | null = null;

      if (imagemFile) {
        const ext = imagemFile.name.split(".").pop();
        const path = `boloes/${codigo}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, imagemFile);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          imagemUrl = urlData.publicUrl;
        }
      }

      // Criar bolão com o primeiro campeonato como referência (legacy)
      const { data: newBolao, error } = await supabase.from("boloes").insert({
        nome, descricao: descricao || null, imagem_url: imagemUrl,
        codigo_convite: codigo, criador_id: user.id, campeonato_id: campeonatosSelecionados[0],
        modo_pontuacao: modoSelecionado, regras_ativas: isMataMata ? ["mata_mata"] : regrasAtivas,
        is_publico: false, is_nacional: false,
        ...(isFanatico ? { time_favorito: timeFavorito } : {}),
      }).select("id").single();

      if (error) throw error;

      // Inserir todos os campeonatos na tabela de relação N:N
      const campeonatoInserts = campeonatosSelecionados.map((cId) => ({
        bolao_id: newBolao.id,
        campeonato_id: cId,
      }));
      await supabase.from("bolao_campeonatos").insert(campeonatoInserts);

      await supabase.from("profiles").upsert(
        { id: user.id, nome: user.user_metadata?.nome || user.email?.split("@")[0] || "Usuário" },
        { onConflict: "id" }
      );

      await supabase.from("bolao_participantes").insert({
        bolao_id: newBolao.id,
        user_id: user.id,
      });

      // Analytics: Criar Bolão
      trackEvent('Criar_Bolao', {
        campeonato: campeonatosSelecionados[0] || '',
        modo: modoSelecionado || '',
        is_publico: false,
      });

      // Gamificação: +20 XP por criar bolão
      darXP("criar_bolao", 20, newBolao.id).then((ganhou) => {
        if (ganhou) setXPToast({ xp: 20, msg: "Bolão criado!" });
      });

      toast.success(`Bolão criado! Código: ${codigo}`);
      navigate(`/bolao/${newBolao.id}`);
    } catch (err: any) { console.error("Erro ao criar bolão:", err); toast.error(err.message || "Erro ao criar bolão"); }
    finally { setCriando(false); }
  };

  const getPlanoBadge = (plano: string) => {
    if (plano === "premium") return "Premium";
    if (plano === "premium_pro") return "PRO";
    return null;
  };

  const scrollToSection = (sectionId: string) => {
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const modoRegras = modoSelecionado ? MODO_REGRAS[modoSelecionado] : null;
  const totalRegrasPositivas = modoRegras ? modoRegras.regras.filter((r) => r.acerto).length : 0;

  const campeonatosPorCategoria = CATEGORIAS.map((cat) => ({
    ...cat,
    campeonatos: campeonatos.filter((c) => categorizeCampeonato(c) === cat.id),
  })).filter((cat) => cat.campeonatos.length > 0);

  const campsSelecionados = campeonatos.filter((c) => campeonatosSelecionados.includes(c.id));

  const toggleCampeonato = (campId: string) => {
    setCampeonatosSelecionados((prev) =>
      prev.includes(campId) ? prev.filter((id) => id !== campId) : [...prev, campId]
    );
  };

  const toggleCategoria = (catId: string) => {
    setCategoriaAberta((prev) => prev === catId ? null : catId);
  };

  const timesFiltrados = buscaTime
    ? timesDisponiveis.filter((t) => t.nome.toLowerCase().includes(buscaTime.toLowerCase()))
    : timesDisponiveis;

  return (
    <div className="space-y-6 animate-fade-in">
      <SEOHead title="Criar Novo Bolão" path="/criar" noindex />
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
            <Input placeholder="Ex: Bolão da Galera" value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 rounded-xl bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descrição</Label>
            <Input placeholder="Descreva seu bolão" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              onBlur={() => { if (nome.trim()) scrollToSection("section-pontuacao"); }}
              className="h-11 rounded-xl bg-muted/50" />
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
          <p className="text-xs text-muted-foreground mt-1">Selecione como os pontos serão calculados</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {MODOS_PONTUACAO.map((modo) => {
            const locked = isLocked(modo.plano);
            const selected = modoSelecionado === modo.id;
            const badge = getPlanoBadge(modo.plano);
            return (
              <div key={modo.id}
                onClick={() => {
                  if (locked) { toast.error("Faça upgrade para desbloquear este modo"); navigate("/planos"); return; }
                  setModoSelecionado(modo.id);
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border-2 ${
                  selected ? "border-copa-green-500 bg-copa-green-50" : locked ? "border-transparent bg-muted/30 opacity-60" : "border-transparent bg-muted/50 hover:bg-muted/80"
                }`}>
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-copa-green-500 bg-copa-green-500" : "border-gray-300"}`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{modo.nome}</span>
                      {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-copa-gold-100 text-copa-gold-600">{badge}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{modo.subtitulo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selected && modoSelecionado !== "mata_mata" && (
                    <button onClick={(e) => { e.stopPropagation(); setRegrasModalOpen(true); }}
                      className="text-[10px] font-bold text-copa-green-600 bg-copa-green-100 hover:bg-copa-green-200 rounded-full px-2 py-0.5 transition-colors">
                      {regrasAtivas.length}/{totalRegrasPositivas} regras
                    </button>
                  )}
                  {selected && modoSelecionado === "mata_mata" && (
                    <span className="text-[10px] font-bold text-copa-green-600 bg-copa-green-100 rounded-full px-2 py-0.5">
                      Regras fixas
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setInfoModal(MODO_REGRAS[modo.id]); }}
                    className="w-6 h-6 rounded-full bg-copa-green-100 hover:bg-copa-green-200 flex items-center justify-center transition-colors" title="Ver regras">
                    <Info className="w-3.5 h-3.5 text-copa-green-600" />
                  </button>
                  {locked && <Lock className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 3. Campeonato por Categoria */}
      <Card id="section-campeonato" className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-copa-green-500 text-white text-xs font-bold flex items-center justify-center">3</span>
            <Trophy className="w-4 h-4 text-copa-gold-500" />
            Campeonato
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Escolha um ou mais campeonatos para o bolão</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingCampeonatos ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 text-copa-green-500 animate-spin" /></div>
          ) : (
            campeonatosPorCategoria.map((cat) => {
              const isOpen = categoriaAberta === cat.id;
              const selectedCount = cat.campeonatos.filter((c) => campeonatosSelecionados.includes(c.id)).length;
              return (
                <div key={cat.id} className="rounded-xl overflow-hidden border border-gray-100">
                  <button onClick={() => toggleCategoria(cat.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                      isOpen ? "bg-copa-green-50" : selectedCount > 0 ? "bg-copa-green-50/50" : "bg-muted/40 hover:bg-muted/70"
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{cat.emoji}</span>
                      <div className="text-left">
                        <span className="text-sm font-semibold">{cat.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {cat.campeonatos.length} {cat.campeonatos.length === 1 ? "campeonato" : "campeonatos"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedCount > 0 && !isOpen && (
                        <span className="text-[10px] font-bold text-copa-green-600 bg-copa-green-100 rounded-full px-2 py-0.5">
                          {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-2 py-2 space-y-1 bg-white animate-fade-in">
                      {cat.campeonatos.map((camp) => {
                        const selected = campeonatosSelecionados.includes(camp.id);
                        return (
                          <div key={camp.id}
                            onClick={() => toggleCampeonato(camp.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              selected ? "bg-copa-green-50 border border-copa-green-300" : "hover:bg-muted/50"
                            }`}>
                            <div className={`w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 ${
                              selected ? "bg-copa-green-500" : "border-2 border-gray-300"
                            }`}>
                              {selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            {camp.logo_url ? (
                              <img src={camp.logo_url} alt={camp.nome_popular} className="w-7 h-7 object-contain flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                                <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block truncate">{camp.nome_popular || camp.nome}</span>
                              <span className="text-[10px] text-muted-foreground">Temporada {camp.temporada}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {!loadingCampeonatos && campeonatos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum campeonato disponível.</p>
          )}
          {campeonatosSelecionados.length > 0 && (
            <div className="bg-copa-green-50 border border-copa-green-200 rounded-xl p-3 mt-2">
              <p className="text-xs font-bold text-copa-green-700 mb-1">
                {campeonatosSelecionados.length} campeonato{campeonatosSelecionados.length > 1 ? "s" : ""} selecionado{campeonatosSelecionados.length > 1 ? "s" : ""}:
              </p>
              <div className="flex flex-wrap gap-1">
                {campsSelecionados.map((c) => (
                  <span key={c.id} className="text-[10px] bg-copa-green-100 text-copa-green-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                    {c.nome_popular || c.nome}
                    <button onClick={() => toggleCampeonato(c.id)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3.5 Time do Coração - badge indicador (só para modo Fanático) */}
      {isFanatico && campeonatosSelecionados.length > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span className="text-sm font-medium text-red-700">
              {timeFavorito ? <>Time: <strong>{timeFavorito}</strong></> : "Escolha seu time do coração"}
            </span>
          </div>
          <button onClick={() => setTimeModalOpen(true)}
            className="text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 rounded-full px-3 py-1 transition-colors">
            {timeFavorito ? "Alterar" : "Escolher"}
          </button>
        </div>
      )}

      {/* 4. Upload Cover */}
      <Card id="section-imagem" className="border-dashed border-2 border-copa-green-200 rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <label className="cursor-pointer flex flex-col items-center hover:opacity-80 transition-opacity">
            {imagemPreview ? (
              <div className="relative w-full max-w-xs">
                <img src={imagemPreview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                <button onClick={(e) => { e.preventDefault(); setImagemFile(null); setImagemPreview(null); }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-copa-green-100 rounded-full flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-copa-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Adicionar imagem de capa <span className="text-xs text-muted-foreground/60">(opcional)</span>
                </p>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImagemChange} />
          </label>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button onClick={handleCriar} disabled={criando}
        className="w-full h-13 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-base rounded-xl shadow-md disabled:opacity-60">
        {criando ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</>) : "Criar Bolão"}
      </Button>

      <RegrasModal regras={infoModal} open={!!infoModal} onClose={() => setInfoModal(null)} />

      {/* Ad Reward Modal */}
      <AdRewardModal open={showAdModal} onComplete={resolveWebAd} message="Assista para criar seu bolão" />

      {/* Modal: Configurar Regras */}
      {modoRegras && (
        <Dialog open={regrasModalOpen} onOpenChange={(v) => { if (!v) { setRegrasModalOpen(false); scrollToSection("section-campeonato"); } }}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-copa-green-700">{modoRegras.titulo}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {modoRegras.descricao} Escolha quais regras ativar neste bolão.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              {modoRegras.regras.map((regra, i) => {
                if (!regra.acerto) return null;
                const isActive = regrasAtivas.includes(regra.texto);
                return (
                  <div key={i} onClick={() => toggleRegra(regra.texto)}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer transition-all ${
                      isActive ? "bg-copa-green-50 border border-copa-green-200" : "bg-gray-50 border border-gray-200 opacity-50"
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive ? "bg-copa-green-500" : "bg-white border-2 border-gray-300"
                      }`}>
                        {isActive && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm ${isActive ? "font-medium" : "text-muted-foreground line-through"}`}>{regra.texto}</span>
                    </div>
                    <span className={`text-sm font-bold ${isActive ? "text-copa-green-600" : "text-muted-foreground"}`}>{regra.pontos}</span>
                  </div>
                );
              })}
            </div>
            {regrasAtivas.length === 0 && <p className="text-xs text-red-500 font-medium">Selecione pelo menos uma regra</p>}
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">{regrasAtivas.length} de {totalRegrasPositivas} regras ativas</span>
              <Button size="sm" onClick={() => { setRegrasModalOpen(false); scrollToSection("section-campeonato"); }}
                disabled={regrasAtivas.length === 0}
                className="bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-lg">
                Confirmar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Time do Coração (Fanático) */}
      {isFanatico && (
        <Dialog open={timeModalOpen} onOpenChange={(v) => { if (!v && timeFavorito) setTimeModalOpen(false); }}>
          <DialogContent className="max-w-md rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-red-700 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                Time do Coração
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Você só palpitará nos jogos deste time. Cada participante escolherá o seu ao entrar no bolão.
              </DialogDescription>
            </DialogHeader>
            {loadingTimes ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-red-400 animate-spin" /></div>
            ) : (
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                {timesDisponiveis.length > 8 && (
                  <div className="relative flex-shrink-0">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar time..." value={buscaTime} onChange={(e) => setBuscaTime(e.target.value)}
                      className="h-10 rounded-xl bg-muted/50 pl-9" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-60 pr-1">
                  {timesFiltrados.map((time) => {
                    const selected = timeFavorito === time.nome;
                    return (
                      <div key={time.nome}
                        onClick={() => setTimeFavorito(time.nome)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all border ${
                          selected ? "border-red-400 bg-red-50 shadow-sm" : "border-gray-100 hover:bg-muted/50"
                        }`}>
                        {time.logo ? (
                          <img src={time.logo} alt={time.nome} className="w-7 h-7 object-contain flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-7 h-7 bg-gray-200 rounded-full flex-shrink-0" />
                        )}
                        <span className={`text-xs font-medium truncate ${selected ? "text-red-700 font-bold" : ""}`}>{time.nome}</span>
                        {selected && <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 ml-auto flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
                {timesFiltrados.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum time encontrado</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {timeFavorito ? <span className="text-red-600 font-medium">{timeFavorito}</span> : "Nenhum time selecionado"}
                  </span>
                  <Button size="sm" onClick={() => setTimeModalOpen(false)}
                    disabled={!timeFavorito}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg">
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CriarBolao;
