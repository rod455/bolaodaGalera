import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Crown, Zap, Trophy, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ModoInfo {
  titulo: string;
  descricao: string;
  regras: { texto: string; pontos: string; acerto: boolean }[];
}

const modosInfo: Record<string, ModoInfo> = {
  casual: {
    titulo: "Iniciantes / Casual",
    descricao: "Modo simples para quem está começando. Pontua por placar exato, vencedor ou empate com gols errados.",
    regras: [
      { texto: "Placar exato", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "3 pontos", acerto: true },
      { texto: "Apostar no empate e errar número de gols", pontos: "5 pontos", acerto: true },
    ],
  },
  amador: {
    titulo: "Intermediário / Amadores",
    descricao: "Mais detalhado, com pontos extras por diferença de gols e acerto parcial do placar.",
    regras: [
      { texto: "Placar exato", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "3 pontos", acerto: true },
      { texto: "Apostar no empate e errar número de gols", pontos: "5 pontos", acerto: true },
      { texto: "Diferença de gols correta", pontos: "3 pontos", acerto: true },
      { texto: "Número de gols do vencedor", pontos: "2 pontos", acerto: true },
      { texto: "Número de gols do perdedor", pontos: "2 pontos", acerto: true },
    ],
  },
  profissional: {
    titulo: "Avançado / Profissional",
    descricao: "Modo completo com pontuações altas e bonificações por acertos parciais detalhados.",
    regras: [
      { texto: "Placar exato", pontos: "20 pontos", acerto: true },
      { texto: "Vencedor + número de gols do vencedor", pontos: "12 pontos", acerto: true },
      { texto: "Vencedor + número de gols do perdedor", pontos: "8 pontos", acerto: true },
      { texto: "Vencedor do confronto + Diferença de gols", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "5 pontos", acerto: true },
      { texto: "Apostar no empate e errar número de gols", pontos: "8 pontos", acerto: true },
      { texto: "Número de gols do vencedor", pontos: "2 pontos", acerto: true },
      { texto: "Número de gols do perdedor", pontos: "2 pontos", acerto: true },
    ],
  },
  fanatico: {
    titulo: "Torcedor Fanático",
    descricao: "Escolha o seu time de coração e só vale apostas nos jogos do seu time. Pontuação máxima!",
    regras: [
      { texto: "Placar exato", pontos: "20 pontos", acerto: true },
      { texto: "Vencedor + número de gols do vencedor", pontos: "12 pontos", acerto: true },
      { texto: "Vencedor + número de gols do perdedor", pontos: "8 pontos", acerto: true },
      { texto: "Vencedor do confronto + Diferença de gols", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "5 pontos", acerto: true },
      { texto: "Apostar no empate e errar número de gols", pontos: "8 pontos", acerto: true },
      { texto: "Número de gols do vencedor", pontos: "2 pontos", acerto: true },
      { texto: "Número de gols do perdedor", pontos: "2 pontos", acerto: true },
    ],
  },
  tudo_ou_nada: {
    titulo: "Tudo ou Nada",
    descricao: "Só pontua se acertar o placar exato. Errou? Zero pontos. Para os corajosos!",
    regras: [
      { texto: "Placar exato", pontos: "10 pontos", acerto: true },
      { texto: "Errou o placar", pontos: "0 pontos", acerto: false },
    ],
  },
  vencedor_ou_nada: {
    titulo: "Vencedor ou Nada",
    descricao: "Pontua por acertar o vencedor ou o empate. Simples e direto.",
    regras: [
      { texto: "Vencedor", pontos: "5 pontos", acerto: true },
      { texto: "Empate", pontos: "5 pontos", acerto: true },
      { texto: "Errou", pontos: "0 pontos", acerto: false },
    ],
  },
};

const Planos = () => {
  const navigate = useNavigate();
  const [infoModal, setInfoModal] = useState<ModoInfo | null>(null);

  const InfoButton = ({ modo }: { modo: string }) => (
    <button
      onClick={() => setInfoModal(modosInfo[modo])}
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-copa-green-100 hover:bg-copa-green-200 transition-colors ml-1.5"
      title="Ver detalhes"
    >
      <Info className="w-3 h-3 text-copa-green-600" />
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold">Tipos de Planos</h2>
      </div>

      {/* Plano Free */}
      <Card className="rounded-2xl shadow-sm border-copa-green-200">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-copa-green-500" />
            <CardTitle className="text-lg font-bold text-copa-green-700">Plano Free</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Criar até 1 bolão</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">
                Modo Casual e Placar Correto
                <InfoButton modo="casual" />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Participar de até 3 bolões</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plano Premium */}
      <Card className="rounded-2xl shadow-sm border-copa-gold-300 bg-copa-gold-50/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-copa-gold-500" />
              <CardTitle className="text-lg font-bold text-copa-gold-600">Plano Premium</CardTitle>
            </div>
          </div>
          <p className="text-sm font-semibold text-copa-green-600 mt-1">
            💰 R$ 9,90/mês ou R$ 79,90/ano
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Bolões ilimitados</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">
                Modos Free + Amador e Vencedor
                <InfoButton modo="amador" />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Participantes ilimitados no bolão</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Sem anúncios entre telas</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Filtros personalizados</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Badge "Premium" no perfil</span>
            </div>
          </div>
          <Button className="w-full h-11 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold rounded-xl shadow-md mt-2">
            <Crown className="w-4 h-4 mr-2" />
            Assinar Premium
          </Button>
        </CardContent>
      </Card>

      {/* Plano Premium Pro */}
      <Card className="rounded-2xl shadow-sm border-copa-green-400 bg-copa-green-50/30 relative overflow-hidden">
        <div className="absolute top-3 right-3">
          <Badge className="bg-copa-gold-400 text-copa-green-800 font-bold text-xs">
            Recomendado
          </Badge>
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-copa-gold-500" />
            <CardTitle className="text-lg font-bold text-copa-green-700">Plano Premium PRO</CardTitle>
          </div>
          <p className="text-sm font-semibold text-copa-green-600 mt-1">
            💰 R$ 14,90/mês ou R$ 99,90/ano
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Benefícios Premium</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">
                Modos Premium + Profissional e Torcedor Fanático
                <InfoButton modo="profissional" />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">
                Modo Tudo ou Nada
                <InfoButton modo="tudo_ou_nada" />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">
                Modo Vencedor ou Nada
                <InfoButton modo="vencedor_ou_nada" />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Sem anúncios entre telas</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Bolões privados com senha</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Suporte prioritário</span>
            </div>
          </div>
          <Button className="w-full h-11 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold rounded-xl shadow-md mt-2">
            <Zap className="w-4 h-4 mr-2" />
            Assinar Premium PRO
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Desbloqueie todas as funcionalidades do app
          </p>
        </CardContent>
      </Card>

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
                <span className={`text-sm font-bold ${regra.acerto ? "text-copa-green-600" : "text-red-500"}`}>
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

export default Planos;
