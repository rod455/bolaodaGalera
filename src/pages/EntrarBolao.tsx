import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle, Keyboard, Search, Users, ChevronRight, Loader2, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Bolao {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  is_publico: boolean;
  is_nacional: boolean;
  codigo_convite: string | null;
  campeonato_id: string | null;
  campeonatos?: { logo_url: string; nome_popular: string } | null;
}

const fallbackImages = [
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=300&fit=crop",
  "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&h=300&fit=crop",
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=300&fit=crop",
];

const EntrarBolao = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [publicos, setPublicos] = useState<Bolao[]>([]);
  const [participantesCount, setParticipantesCount] = useState<Record<string, number>>({});
  const [userBolaoIds, setUserBolaoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Fetch public bolões (non-nacional ones that are public)
      const { data: boloesPublicos } = await supabase
        .from("boloes")
        .select("*, campeonatos(logo_url, nome_popular)")
        .eq("is_publico", true)
        .eq("is_nacional", false)
        .order("created_at", { ascending: false });

      setPublicos((boloesPublicos as any[]) || []);

      // Fetch user's current participations
      const { data: participacoes } = await supabase
        .from("bolao_participantes")
        .select("bolao_id")
        .eq("user_id", user!.id);

      const ids = new Set((participacoes || []).map((p: any) => p.bolao_id));
      setUserBolaoIds(ids);

      // Count participants for each public bolão
      const counts: Record<string, number> = {};
      for (const b of (boloesPublicos as any[]) || []) {
        const { count } = await supabase
          .from("bolao_participantes")
          .select("*", { count: "exact", head: true })
          .eq("bolao_id", b.id);
        counts[b.id] = count || 0;
      }
      setParticipantesCount(counts);
    } catch (err) {
      console.error("Erro ao carregar bolões públicos:", err);
    } finally {
      setLoading(false);
    }
  };

  const ensureProfile = async () => {
    if (!user) return false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();
    if (!profile) {
      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        nome: user.user_metadata?.nome || user.email?.split("@")[0] || "Usuário",
        email: user.email || "",
      });
      if (error && error.code !== "23505") {
        console.error("Erro ao criar perfil:", error);
        return false;
      }
    }
    return true;
  };

  const handleEntrarCodigo = async () => {
    if (!codigo.trim()) {
      toast.error("Informe o código do bolão");
      return;
    }
    if (!user) return;
    setBuscando(true);

    try {
      // Find bolão by codigo_convite
      const { data: bolao, error: fetchError } = await supabase
        .from("boloes")
        .select("id, nome")
        .eq("codigo_convite", codigo.trim().toUpperCase())
        .single();

      if (fetchError || !bolao) {
        toast.error("Bolão não encontrado. Verifique o código.");
        setBuscando(false);
        return;
      }

      await ensureProfile();

      // Try to join
      const { error } = await supabase
        .from("bolao_participantes")
        .insert({ bolao_id: bolao.id, user_id: user.id });

      if (error) {
        if (error.code === "23505") {
          toast.info("Você já está neste bolão!");
        } else {
          throw error;
        }
      } else {
        toast.success(`Você entrou no ${bolao.nome}!`);
      }

      navigate(`/bolao/${bolao.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar no bolão");
    } finally {
      setBuscando(false);
    }
  };

  const handleParticipar = async (bolaoId: string) => {
    if (!user) return;
    setJoining(bolaoId);

    try {
      await ensureProfile();

      const { error } = await supabase
        .from("bolao_participantes")
        .insert({ bolao_id: bolaoId, user_id: user.id });

      if (error) {
        if (error.code === "23505") {
          toast.info("Você já está participando!");
          setUserBolaoIds((prev) => new Set(prev).add(bolaoId));
        } else {
          throw error;
        }
      } else {
        toast.success("Você entrou no bolão!");
        setUserBolaoIds((prev) => new Set(prev).add(bolaoId));
        setParticipantesCount((prev) => ({
          ...prev,
          [bolaoId]: (prev[bolaoId] || 0) + 1,
        }));
      }

      navigate(`/bolao/${bolaoId}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar no bolão");
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Entrar no Bolão</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Use um código ou encontre bolões públicos
        </p>
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
              onKeyDown={(e) => e.key === "Enter" && handleEntrarCodigo()}
              className="h-11 rounded-xl bg-white flex-1 font-mono text-center tracking-widest text-lg"
              maxLength={6}
            />
            <Button
              onClick={handleEntrarCodigo}
              disabled={buscando}
              className="h-11 px-6 bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-xl"
            >
              {buscando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-1" />
                  Entrar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Public Bolões */}
      <div>
        <h3 className="text-lg font-bold mb-3">Bolões Públicos</h3>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-copa-green-500 animate-spin" />
          </div>
        ) : publicos.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-2 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum bolão público disponível no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {publicos.map((bolao, i) => {
              const isParticipando = userBolaoIds.has(bolao.id);
              return (
                <Card
                  key={bolao.id}
                  className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer rounded-2xl"
                  onClick={() => {
                    if (isParticipando) navigate(`/bolao/${bolao.id}`);
                  }}
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={bolao.imagem_url || fallbackImages[i % fallbackImages.length]}
                      alt={bolao.nome}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          fallbackImages[i % fallbackImages.length];
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {(bolao.campeonatos as any)?.logo_url && (
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg p-1.5">
                        <img
                          src={(bolao.campeonatos as any).logo_url}
                          alt=""
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="absolute bottom-3 left-4">
                      <h3 className="text-white font-bold text-lg">{bolao.nome}</h3>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        {bolao.descricao && (
                          <p className="text-sm text-muted-foreground">{bolao.descricao}</p>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3" />
                          {(participantesCount[bolao.id] || 0).toLocaleString("pt-BR")}{" "}
                          participantes
                        </span>
                      </div>
                      {isParticipando ? (
                        <Button
                          size="sm"
                          className="bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-semibold rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/bolao/${bolao.id}`);
                          }}
                        >
                          Acessar <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={joining === bolao.id}
                          className="bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-lg disabled:opacity-60"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleParticipar(bolao.id);
                          }}
                        >
                          {joining === bolao.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              Participar <ChevronRight className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EntrarBolao;
