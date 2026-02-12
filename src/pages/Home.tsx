import { useNavigate } from "react-router-dom";
import { PlusCircle, Keyboard, Users, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const mockBoloes = [
  {
    id: "1",
    nome: "Copa do Mundo 2026",
    descricao: "Brasil vs Argentina",
    data: "15 de Dezembro",
    participantes: 24,
    posicao: 3,
    imagem: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&h=300&fit=crop",
  },
  {
    id: "2",
    nome: "Brasileirão Série A",
    descricao: "Rodada 38",
    data: "20 de Dezembro",
    participantes: 12,
    posicao: 1,
    imagem: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=300&fit=crop",
  },
  {
    id: "3",
    nome: "Champions League",
    descricao: "Fase de Grupos",
    data: "10 de Janeiro",
    participantes: 8,
    posicao: 5,
    imagem: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=300&fit=crop",
  },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
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

      {/* Bolões List */}
      <div className="space-y-4">
        {mockBoloes.map((bolao, index) => (
          <Card
            key={bolao.id}
            className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer rounded-2xl"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => navigate(`/bolao/${bolao.id}`)}
          >
            <div className="relative h-40 overflow-hidden">
              <img
                src={bolao.imagem}
                alt={bolao.nome}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="text-white font-bold text-lg">{bolao.nome}</h3>
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
                      <Users className="w-3 h-3" /> {bolao.participantes} participantes
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-copa-green-50 text-copa-green-600 border-0 text-xs font-semibold"
                    >
                      <MapPin className="w-3 h-3 mr-1" />
                      {bolao.posicao}º lugar
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-semibold rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/bolao/${bolao.id}`);
                  }}
                >
                  Acessar
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Home;
