import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Plus, Trash2, Lock, Info, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Jogo {
  id: string;
  timeA: string;
  timeB: string;
  data: string;
  horario: string;
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
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modoSelecionado, setModoSelecionado] = useState("");
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [novoTimeA, setNovoTimeA] = useState("");
  const [novoTimeB, setNovoTimeB] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [infoModal, setInfoModal] = useState<ModoInfo | null>(null);

  // TODO: get from user profile in Supabase
  const userPlano = "free";

  const isLocked = (plano: string) => {
    if (userPlano === "premium_pro") return false;
    if (userPlano === "premium" && plano === "premium_pro") return true;
    if (userPlano === "free" && (plano === "premium" || plano === "premium_pro")) return true;
    return false;
  };

  const addJogo = () => {
    if (!novoTimeA || !novoTimeB || !novaData || !novoHorario) {
      toast.error("Preencha todos os campos do jogo");
      return;
    }
    setJogos([
      ...jogos,
      { id: Date.now().toString(), timeA: novoTimeA, timeB: novoTimeB, data: novaData, horario: novoHorario },
    ]);
    setNovoTimeA("");
    setNovoTimeB("");
    setNovaData("");
    setNovoHorario("");
  };

  const removeJogo = (id: string) => setJogos(jogos.filter((j) => j.id !== id));

  const handleCriar = () => {
    if (!nome) { toast.error("Informe o nome do bolão"); return; }
    if (!modoSelecionado) { toast.error("Selecione o modo de pontuação"); return; }
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    toast.success(`Bolão criado! Código: ${codigo}`);
    navigate("/home");
  };

  const getPlanoBadge = (plano: string) => {
    if (plano === "premium") return "Premium";
    if (plano === "premium_pro") return "PRO";
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold">Criar Bolão</h2>
      </div>

      {/* Upload Cover */}
      <Card className="border-dashed border-2 border-copa-green-200 rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-copa-green-50/50 transition-colors">
          <div className="w-14 h-14 bg-copa-green-100 rounded-full flex items-center justify-center mb-3">
            <Upload className="w-6 h-6 text-copa-green-500" />
          </div>
          <p className="text-sm text-muted-foreground">Adicionar imagem de capa</p>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nome do Bolão</Label>
            <Input placeholder="Ex: Copa do Mundo 2026" value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 rounded-xl bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descrição</Label>
            <Input placeholder="Descreva seu bolão" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="h-11 rounded-xl bg-muted/50" />
          </div>
        </CardContent>
      </Card>

      {/* Modo de Pontuação */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Modo de Pontuação</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Selecione como os pontos serão calculados</p>
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
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border-2 ${
                  selected ? "border-copa-green-500 bg-copa-green-50"
                    : locked ? "border-transparent bg-muted/30 opacity-60"
                    : "border-transparent bg-muted/50 hover:bg-muted/80"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selected ? "border-copa-green-500 bg-copa-green-500" : "border-gray-300"
                  }`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{modo.nome}</span>
                      {badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-copa-gold-100 text-copa-gold-600">{badge}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{modo.subtitulo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setInfoModal(modosDetalhes[modo.id]); }}
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

      {/* Games */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Jogos do Bolão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Time A" value={novoTimeA} onChange={(e) => setNovoTimeA(e.target.value)} className="h-10 rounded-xl bg-muted/50" />
            <Input placeholder="Time B" value={novoTimeB} onChange={(e) => setNovoTimeB(e.target.value)} className="h-10 rounded-xl bg-muted/50" />
            <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="h-10 rounded-xl bg-muted/50" />
            <Input type="time" value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} className="h-10 rounded-xl bg-muted/50" />
          </div>
          <Button variant="outline" onClick={addJogo} className="w-full h-10 rounded-xl border-copa-green-200 text-copa-green-600">
            <Plus className="w-4 h-4 mr-2" /> Adicionar jogo
          </Button>
          {jogos.length > 0 && (
            <div className="space-y-2 mt-3">
              {jogos.map((jogo) => (
                <div key={jogo.id} className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
                  <span className="text-sm font-medium">{jogo.timeA} vs {jogo.timeB}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{jogo.data} {jogo.horario}</span>
                    <button onClick={() => removeJogo(jogo.id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleCriar} className="w-full h-13 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-base rounded-xl shadow-md">
        Criar Bolão
      </Button>

      {/* Info Modal */}
      <Dialog open={!!infoModal} onOpenChange={() => setInfoModal(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-copa-green-700">{infoModal?.titulo}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{infoModal?.descricao}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {infoModal?.regras.map((regra, i) => (
              <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-lg ${regra.acerto ? "bg-copa-green-50" : "bg-red-50"}`}>
                <div className="flex items-center gap-2">
                  {regra.acerto ? <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" /> : <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  <span className="text-sm">{regra.texto}</span>
                </div>
                <span className={`text-sm font-bold whitespace-nowrap ml-2 ${regra.acerto ? "text-copa-green-600" : "text-red-500"}`}>{regra.pontos}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CriarBolao;
