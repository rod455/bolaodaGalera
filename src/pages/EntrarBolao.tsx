import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Keyboard, Search, Users, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const boloesPublicos = [
  {
    id: "10",
    nome: "Copa do Mundo 2026",
    descricao: "Brasil vs Argentina • 15 de Dezembro",
    participantes: 24,
    posicao: null,
    imagem: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&h=300&fit=crop",
  },
  {
    id: "11",
    nome: "Liga dos Amigos",
    descricao: "Brasileirão • Rodada 38",
    participantes: 6,
    posicao: null,
    imagem: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=300&fit=crop",
  },
];

const EntrarBolao = () => {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");

  const handleEntrar = () => {
    if (!codigo.trim()) {
      toast.error("Informe o código do bolão");
      return;
    }
    toast.success("Você entrou no bolão!");
    navigate("/home");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Entrar no Bolão</h2>
        <p className="text-sm text-muted-foreground mt-1">Use um código ou encontre bolões públicos</p>
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
          className="h-12 border-copa-gold-400 text-copa-gold-600 bg-copa-gold-50 hover:bg-copa-gold-100 font-semibold rounded-xl"
        >
          <Keyboard className="w-4 h-4 mr-2" />
          Entrar por código
        </Button>
      </div>

      {/* Code Input */}
      <Card className="rounded-2xl shadow-sm border-copa-gold-300 bg-copa-gold-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Insira o código do bolão"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="h-11 rounded-xl bg-white flex-1 font-mono text-center tracking-widest text-lg"
              maxLength={6}
            />
            <Button
              onClick={handleEntrar}
              className="h-11 px-6 bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-xl"
            >
              <Search className="w-4 h-4 mr-1" />
              Entrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Public Bolões */}
      <div>
        <h3 className="text-lg font-bold mb-3">Bolões Públicos</h3>
        <div className="space-y-4">
          {boloesPublicos.map((bolao) => (
            <Card
              key={bolao.id}
              className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer rounded-2xl"
              onClick={() => {
                toast.success(`Você entrou no ${bolao.nome}!`);
                navigate("/home");
              }}
            >
              <div className="relative h-36 overflow-hidden">
                <img src={bolao.imagem} alt={bolao.nome} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <h3 className="text-white font-bold text-lg">{bolao.nome}</h3>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{bolao.descricao}</p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3" /> {bolao.participantes} participantes
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-lg"
                  >
                    Participar
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EntrarBolao;
