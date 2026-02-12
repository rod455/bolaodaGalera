import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Jogo {
  id: string;
  timeA: string;
  timeB: string;
  data: string;
  horario: string;
}

const CriarBolao = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modoPontuacao, setModoPontuacao] = useState("");
  const [pontosVencedor, setPontosVencedor] = useState("3");
  const [pontosExato, setPontosExato] = useState("10");
  const [pontosEmpate, setPontosEmpate] = useState("5");
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [novoTimeA, setNovoTimeA] = useState("");
  const [novoTimeB, setNovoTimeB] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");

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

  const removeJogo = (id: string) => {
    setJogos(jogos.filter((j) => j.id !== id));
  };

  const handleCriar = () => {
    if (!nome) {
      toast.error("Informe o nome do bolão");
      return;
    }
    // TODO: save to Supabase
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    toast.success(`Bolão criado! Código: ${codigo}`);
    navigate("/home");
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
            <Input
              placeholder="Ex: Copa do Mundo 2026"
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
              className="h-11 rounded-xl bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Modo de Pontuação</Label>
            <Select value={modoPontuacao} onValueChange={setModoPontuacao}>
              <SelectTrigger className="h-11 rounded-xl bg-muted/50">
                <SelectValue placeholder="Selecione o modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exata">Pontuação Exata</SelectItem>
                <SelectItem value="personalizada">Pontuação Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Points Config */}
      {modoPontuacao === "personalizada" && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Configuração de Pontos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pontos por acertar vencedor</p>
                <p className="text-xs text-muted-foreground">Quando acerta apenas o vencedor</p>
              </div>
              <Input
                type="number"
                value={pontosVencedor}
                onChange={(e) => setPontosVencedor(e.target.value)}
                className="w-20 h-10 text-center rounded-xl bg-muted/50"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pontos por placar exato</p>
                <p className="text-xs text-muted-foreground">Quando acerta o placar completo</p>
              </div>
              <Input
                type="number"
                value={pontosExato}
                onChange={(e) => setPontosExato(e.target.value)}
                className="w-20 h-10 text-center rounded-xl bg-muted/50"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pontos por acertar empate</p>
                <p className="text-xs text-muted-foreground">Quando acerta o empate</p>
              </div>
              <Input
                type="number"
                value={pontosEmpate}
                onChange={(e) => setPontosEmpate(e.target.value)}
                className="w-20 h-10 text-center rounded-xl bg-muted/50"
              />
            </div>
          </CardContent>
        </Card>
      )}

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
                  <span className="text-sm font-medium">
                    {jogo.timeA} vs {jogo.timeB}
                  </span>
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

      {/* Submit */}
      <Button
        onClick={handleCriar}
        className="w-full h-13 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold text-base rounded-xl shadow-md"
      >
        Criar Bolão
      </Button>
    </div>
  );
};

export default CriarBolao;
