import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Keyboard, Users, MapPin, ChevronRight, GripVertical, Trophy, Globe, LogIn, AlertTriangle, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Bolao {
  id: string;
  nome: string;
  descricao: string;
  data: string;
  participantes: number;
  posicao: number | null;
  imagem: string;
}

const mockPrivados: Bolao[] = [
  // Empty for now — user has no private bolões yet
  // Uncomment below to test with data:
  // {
  //   id: "1",
  //   nome: "Bolão do Escritório",
  //   descricao: "Copa do Mundo",
  //   data: "15 de Junho",
  //   participantes: 8,
  //   posicao: 2,
  //   imagem: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&h=300&fit=crop",
  // },
];

const mockNacionais: Bolao[] = [
  {
    id: "n1",
    nome: "Mata-mata Campeonato Paulista",
    descricao: "Quartas de Final",
    data: "22 de Março",
    participantes: 1842,
    posicao: null,
    imagem: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=300&fit=crop",
  },
  {
    id: "n2",
    nome: "Copa do Mundo 2026",
    descricao: "EUA, México e Canadá",
    data: "11 de Junho",
    participantes: 12530,
    posicao: null,
    imagem: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&h=300&fit=crop",
  },
  {
    id: "n3",
    nome: "Mata-mata Champions League",
    descricao: "Oitavas de Final",
    data: "18 de Fevereiro",
    participantes: 5621,
    posicao: null,
    imagem: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=300&fit=crop",
  },
];

// Mock: jogos com menos de 12h e sem palpite
const mockPendingAlerts = [
  {
    id: "alert1",
    bolaoNome: "Copa do Mundo 2026",
    bolaoId: "n2",
    jogo: "Brasil vs Argentina",
    horasRestantes: 3,
  },
  {
    id: "alert2",
    bolaoNome: "Mata-mata Champions League",
    bolaoId: "n3",
    jogo: "Real Madrid vs Man City",
    horasRestantes: 8,
  },
];

const BolaoCard = ({
  bolao,
  onAccess,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
}: {
  bolao: Bolao;
  onAccess: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}) => (
  <Card
    className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-all cursor-pointer rounded-2xl ${
      isDragging ? "opacity-40 scale-95" : ""
    }`}
    draggable={draggable}
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onDragEnd={onDragEnd}
    onClick={onAccess}
  >
    <div className="relative h-36 overflow-hidden">
      <img src={bolao.imagem} alt={bolao.nome} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
        <h3 className="text-white font-bold text-lg leading-tight">{bolao.nome}</h3>
        {draggable && (
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </div>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {bolao.descricao} • {bolao.data}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {bolao.participantes.toLocaleString("pt-BR")} participantes
            </span>
            {bolao.posicao && (
              <Badge
                variant="secondary"
                className="bg-copa-green-50 text-copa-green-600 border-0 text-xs font-semibold"
              >
                <MapPin className="w-3 h-3 mr-1" />
                {bolao.posicao}º lugar
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="sm"
          className={`font-semibold rounded-lg ${
            bolao.posicao
              ? "bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800"
              : "bg-copa-green-500 hover:bg-copa-green-600 text-white"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onAccess();
          }}
        >
          {bolao.posicao ? "Acessar" : "Participar"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

const Home = () => {
  const navigate = useNavigate();
  const [privados, setPrivados] = useState<Bolao[]>(mockPrivados);
  const [nacionais, setNacionais] = useState<Bolao[]>(mockNacionais);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragSection, setDragSection] = useState<"privados" | "nacionais" | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [dismissCount, setDismissCount] = useState(0);

  const visibleAlerts = dismissCount >= 2
    ? []
    : mockPendingAlerts.filter((a) => !dismissedAlerts.has(a.id));

  const dismissAlert = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
    setDismissCount((c) => c + 1);
  };

  const handleDragStart = (section: "privados" | "nacionais", index: number) => {
    setDragIndex(index);
    setDragSection(section);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (section: "privados" | "nacionais", targetIndex: number) => {
    if (dragIndex === null || dragSection !== section) return;

    const list = section === "privados" ? [...privados] : [...nacionais];
    const [moved] = list.splice(dragIndex, 1);
    list.splice(targetIndex, 0, moved);

    if (section === "privados") setPrivados(list);
    else setNacionais(list);

    setDragIndex(null);
    setDragSection(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragSection(null);
  };

  const hasPrivados = privados.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── URGENT ALERTS ── */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => navigate(`/bolao/${alert.bolaoId}/palpites`)}
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 truncate">
                  {alert.jogo}
                </p>
                <p className="text-xs text-amber-600">
                  {alert.bolaoNome}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-amber-200/60 rounded-lg px-2 py-1 flex-shrink-0">
                <Clock className="w-3 h-3 text-amber-700" />
                <span className="text-xs font-bold text-amber-700">{alert.horasRestantes}h</span>
              </div>
              <button
                onClick={(e) => dismissAlert(e, alert.id)}
                className="w-6 h-6 rounded-full hover:bg-amber-200 flex items-center justify-center flex-shrink-0 transition-colors"
                title="Fechar aviso"
              >
                <X className="w-3.5 h-3.5 text-amber-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Meus Bolões</h2>
        <p className="text-sm text-muted-foreground mt-1">Gerencie e acompanhe seus bolões</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => navigate("/criar")}
          className="h-12 border-copa-green-200 text-copa-green-600 hover:bg-copa-green-50 font-semibold rounded-xl"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Criar novo bolão
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/entrar")}
          className="h-12 border-copa-green-200 text-copa-green-600 hover:bg-copa-green-50 font-semibold rounded-xl"
        >
          <Keyboard className="w-4 h-4 mr-2" />
          Entrar por código
        </Button>
      </div>

      {/* ── PRIVADOS ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-copa-gold-500" />
          <h3 className="text-base font-bold">Bolões Privados</h3>
        </div>

        {hasPrivados ? (
          <div className="space-y-4">
            {privados.map((bolao, index) => (
              <BolaoCard
                key={bolao.id}
                bolao={bolao}
                onAccess={() => navigate(`/bolao/${bolao.id}`)}
                draggable
                onDragStart={() => handleDragStart("privados", index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop("privados", index)}
                onDragEnd={handleDragEnd}
                isDragging={dragSection === "privados" && dragIndex === index}
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border-dashed border-2 border-copa-green-200 bg-copa-green-50/30">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 bg-copa-green-100 rounded-full flex items-center justify-center mb-3">
                <LogIn className="w-6 h-6 text-copa-green-500" />
              </div>
              <h4 className="font-bold text-foreground mb-1">Nenhum bolão privado</h4>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                Crie seu próprio bolão ou entre em um com código de convite
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate("/criar")}
                  className="bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-semibold rounded-lg"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Criar bolão
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/entrar")}
                  className="border-copa-green-300 text-copa-green-600 font-semibold rounded-lg"
                >
                  <Keyboard className="w-4 h-4 mr-1" />
                  Entrar por código
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── SEPARATOR ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium px-2">BOLÕES NACIONAIS</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── NACIONAIS ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-copa-green-500" />
          <h3 className="text-base font-bold">Bolões Nacionais</h3>
          <span className="text-xs text-muted-foreground">• Abertos para todos</span>
        </div>

        <div className="space-y-4">
          {nacionais.map((bolao, index) => (
            <BolaoCard
              key={bolao.id}
              bolao={bolao}
              onAccess={() => navigate(`/bolao/${bolao.id}`)}
              draggable
              onDragStart={() => handleDragStart("nacionais", index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop("nacionais", index)}
              onDragEnd={handleDragEnd}
              isDragging={dragSection === "nacionais" && dragIndex === index}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
