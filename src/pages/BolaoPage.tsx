import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trophy, Users, ChevronRight, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const proximosJogos = [
  {
    id: "j1",
    timeA: "Brasil",
    timeB: "Estados Unidos",
    bandeiraA: "🇧🇷",
    bandeiraB: "🇺🇸",
    data: "15 de Dezembro - Terça - 19:30",
    status: "aberto",
  },
  {
    id: "j2",
    timeA: "França",
    timeB: "Brasil",
    bandeiraA: "🇫🇷",
    bandeiraB: "🇧🇷",
    data: "15 de Dezembro - Terça - 19:30",
    status: "aberto",
  },
];

const ranking = [
  { pos: 1, nome: "Carlos Silva", pontos: 42, avatar: "CS" },
  { pos: 2, nome: "Maria Santos", pontos: 38, avatar: "MS" },
  { pos: 3, nome: "João Pedro", pontos: 35, avatar: "JP" },
];

const BolaoPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/home")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Copa do Mundo 2026</h2>
          <p className="text-sm text-muted-foreground">24 participantes</p>
        </div>
      </div>

      {/* Cover Image */}
      <div className="relative h-48 rounded-2xl overflow-hidden shadow-md">
        <img
          src="https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=400&fit=crop"
          alt="Copa do Mundo"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Próximos Jogos */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-copa-green-500 rounded-full animate-pulse" />
            Próximos jogos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {proximosJogos.map((jogo) => (
            <div key={jogo.id} className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{jogo.bandeiraA}</span>
                <div className="text-center">
                  <p className="text-sm font-bold">
                    {jogo.timeA} <span className="text-muted-foreground mx-1">VS</span> {jogo.timeB}
                  </p>
                  <p className="text-xs text-muted-foreground">{jogo.data}</p>
                </div>
                <span className="text-2xl">{jogo.bandeiraB}</span>
              </div>
              <Badge className="bg-copa-green-100 text-copa-green-600 border-0 text-xs font-medium">
                Palpites Abertos
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Fazer Palpites CTA */}
      <Card className="rounded-2xl shadow-sm border-copa-gold-200 bg-copa-gold-50">
        <CardContent className="p-5">
          <h3 className="text-lg font-bold text-copa-green-700 mb-1">Faça seus palpites</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Veja e edite seus palpites futuros ou confira os já realizados
          </p>
          <Button
            onClick={() => navigate(`/bolao/${id}/palpites`)}
            className="w-full h-11 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold rounded-xl"
          >
            Ir para palpites
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-copa-gold-400" />
              Ranking
            </CardTitle>
            <button className="text-sm text-copa-green-500 font-medium hover:underline">
              Ver ranking completo
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {ranking.map((player) => (
            <div
              key={player.pos}
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                player.pos === 1 ? "bg-copa-gold-50 border border-copa-gold-200" : "bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-copa-green-600 w-6 text-center">
                  {player.pos === 1 ? (
                    <Medal className="w-5 h-5 text-copa-gold-400 inline" />
                  ) : (
                    player.pos
                  )}
                </span>
                <div className="w-8 h-8 bg-copa-green-100 rounded-full flex items-center justify-center text-xs font-bold text-copa-green-600">
                  {player.avatar}
                </div>
                <span className="text-sm font-medium">{player.nome}</span>
              </div>
              <span className="text-sm font-bold text-copa-green-600">{player.pontos} pts</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BolaoPage;
