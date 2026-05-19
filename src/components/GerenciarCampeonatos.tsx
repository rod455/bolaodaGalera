import { useState, useEffect } from "react";
import { Plus, X, Loader2, Trophy, ChevronDown, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Campeonato {
  id: string;
  nome: string;
  nome_popular: string;
  logo_url: string;
  temporada: number;
  tipo: string;
}

interface GerenciarCampeonatosProps {
  bolaoId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

/* ─── Categorias de campeonatos ─── */
interface CategoriaConfig {
  id: string;
  label: string;
  emoji: string;
  keywords: string[];
}

const CATEGORIAS: CategoriaConfig[] = [
  { id: "estaduais", label: "Estaduais", emoji: "🏟️", keywords: ["Mineiro", "Paulistão", "Gaúcho", "Carioca", "Baiano", "Catarinense", "Paranaense", "Pernambucano"] },
  { id: "nacionais", label: "Nacionais", emoji: "🇧🇷", keywords: ["Brasileirão", "Copa do Brasil", "Serie A", "Serie B"] },
  { id: "internacionais", label: "Internacionais", emoji: "🌍", keywords: ["Champions", "Libertadores", "Europa League", "Mundial"] },
];

function categorizeCampeonato(camp: Campeonato): string {
  const text = `${camp.nome} ${camp.nome_popular} ${camp.tipo || ""}`.toLowerCase();
  for (const cat of CATEGORIAS) {
    if (cat.keywords.some((kw) => text.includes(kw.toLowerCase()))) return cat.id;
    if (cat.id === "estaduais" && (camp.tipo === "estadual")) return cat.id;
    if (cat.id === "nacionais" && (camp.tipo === "nacional")) return cat.id;
    if (cat.id === "internacionais" && (camp.tipo === "internacional" || camp.tipo === "continental" || camp.tipo === "mundial")) return cat.id;
  }
  return "outros";
}

const GerenciarCampeonatos = ({ bolaoId, isOpen, onClose, onUpdated }: GerenciarCampeonatosProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allCampeonatos, setAllCampeonatos] = useState<Campeonato[]>([]);
  const [vinculados, setVinculados] = useState<Set<string>>(new Set());
  const [vinculadosOriginal, setVinculadosOriginal] = useState<Set<string>>(new Set());
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, bolaoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar todos os campeonatos disponíveis
      const { data: camps } = await supabase
        .from("campeonatos")
        .select("id, nome, nome_popular, logo_url, temporada, tipo")
        .order("nome_popular", { ascending: true });

      setAllCampeonatos((camps || []) as Campeonato[]);

      // Buscar campeonatos já vinculados ao grupo
      const { data: bcData } = await supabase
        .from("bolao_campeonatos")
        .select("campeonato_id")
        .eq("bolao_id", bolaoId);

      // Também verificar o campeonato_id legado do grupo
      const { data: bolaoData } = await supabase
        .from("boloes")
        .select("campeonato_id")
        .eq("id", bolaoId)
        .single();

      const ids = new Set<string>();
      (bcData || []).forEach((bc: any) => ids.add(bc.campeonato_id));
      if (bolaoData?.campeonato_id) ids.add(bolaoData.campeonato_id);

      setVinculados(new Set(ids));
      setVinculadosOriginal(new Set(ids));
    } catch (err) {
      toast.error("Erro ao carregar campeonatos");
    } finally {
      setLoading(false);
    }
  };

  const toggleCampeonato = (campId: string) => {
    setVinculados((prev) => {
      const next = new Set(prev);
      if (next.has(campId)) {
        // Não permitir remover o último
        if (next.size <= 1) {
          toast.error("O bolão precisa ter pelo menos 1 campeonato");
          return prev;
        }
        next.delete(campId);
      } else {
        next.add(campId);
      }
      return next;
    });
  };

  const hasChanges = () => {
    if (vinculados.size !== vinculadosOriginal.size) return true;
    for (const id of vinculados) {
      if (!vinculadosOriginal.has(id)) return true;
    }
    return false;
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      // Identificar adições e remoções
      const toAdd = [...vinculados].filter((id) => !vinculadosOriginal.has(id));
      const toRemove = [...vinculadosOriginal].filter((id) => !vinculados.has(id));

      // Remover campeonatos desvinculados
      if (toRemove.length > 0) {
        const { error: delErr } = await supabase
          .from("bolao_campeonatos")
          .delete()
          .eq("bolao_id", bolaoId)
          .in("campeonato_id", toRemove);
        if (delErr) throw delErr;
      }

      // Adicionar novos campeonatos
      if (toAdd.length > 0) {
        const inserts = toAdd.map((campId) => ({
          bolao_id: bolaoId,
          campeonato_id: campId,
        }));
        const { error: insErr } = await supabase
          .from("bolao_campeonatos")
          .insert(inserts);
        if (insErr) throw insErr;
      }

      // Atualizar o campeonato_id legado para o primeiro vinculado
      const firstCampId = [...vinculados][0];
      if (firstCampId) {
        await supabase
          .from("boloes")
          .update({ campeonato_id: firstCampId })
          .eq("id", bolaoId);
      }

      const addedCount = toAdd.length;
      const removedCount = toRemove.length;
      if (addedCount > 0 && removedCount > 0) {
        toast.success(`${addedCount} campeonato(s) adicionado(s), ${removedCount} removido(s)`);
      } else if (addedCount > 0) {
        toast.success(`${addedCount} campeonato(s) adicionado(s) ao grupo!`);
      } else if (removedCount > 0) {
        toast.success(`${removedCount} campeonato(s) removido(s) do grupo`);
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar campeonatos");
    } finally {
      setSaving(false);
    }
  };

  // Filtrar por busca
  const campsFiltrados = busca.trim()
    ? allCampeonatos.filter((c) =>
        `${c.nome} ${c.nome_popular}`.toLowerCase().includes(busca.toLowerCase())
      )
    : allCampeonatos;

  // Agrupar por categoria
  const campeonatosPorCategoria = CATEGORIAS.map((cat) => ({
    ...cat,
    campeonatos: campsFiltrados.filter((c) => categorizeCampeonato(c) === cat.id),
  })).filter((cat) => cat.campeonatos.length > 0);

  // Campeonatos que não encaixam em nenhuma categoria
  const campsCategorizados = new Set(campeonatosPorCategoria.flatMap((cat) => cat.campeonatos.map((c) => c.id)));
  const campsOutros = campsFiltrados.filter((c) => !campsCategorizados.has(c.id));
  if (campsOutros.length > 0) {
    campeonatosPorCategoria.push({
      id: "outros",
      label: "Outros",
      emoji: "📋",
      keywords: [],
      campeonatos: campsOutros,
    });
  }

  // Campeonatos vinculados para mostrar no topo
  const campsVinculados = allCampeonatos.filter((c) => vinculados.has(c.id));

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-copa-green-500" />
            Gerenciar Campeonatos
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Adicione ou remova campeonatos deste bolão. Os jogos de todos os campeonatos selecionados ficarão disponíveis para palpites.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-copa-green-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 -mx-6 px-6">
            {/* Campeonatos atualmente vinculados */}
            {campsVinculados.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                  Campeonatos neste bolão ({campsVinculados.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {campsVinculados.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleCampeonato(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-copa-green-100 text-copa-green-700 text-xs font-semibold border border-copa-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all group"
                    >
                      {c.logo_url && (
                        <img src={c.logo_url} alt="" className="w-4 h-4 object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                      {c.nome_popular || c.nome}
                      <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar campeonato..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-copa-green-500 outline-none transition-colors"
              />
            </div>

            {/* Lista por categorias */}
            <div className="space-y-2">
              {campeonatosPorCategoria.map((cat) => (
                <div key={cat.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setCategoriaAberta(categoriaAberta === cat.id ? null : cat.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>{cat.emoji}</span>
                      <span className="text-sm font-semibold">{cat.label}</span>
                      <span className="text-[10px] text-muted-foreground bg-gray-100 rounded-full px-1.5">
                        {cat.campeonatos.length}
                      </span>
                      {/* Indicador de quantos estão selecionados */}
                      {cat.campeonatos.some((c) => vinculados.has(c.id)) && (
                        <span className="text-[10px] font-bold text-copa-green-600 bg-copa-green-50 rounded-full px-1.5">
                          {cat.campeonatos.filter((c) => vinculados.has(c.id)).length} ativo(s)
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
                      categoriaAberta === cat.id ? "rotate-180" : ""
                    }`} />
                  </button>

                  {categoriaAberta === cat.id && (
                    <div className="border-t border-gray-100 p-2 space-y-1">
                      {cat.campeonatos.map((c) => {
                        const isVinculado = vinculados.has(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleCampeonato(c.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                              isVinculado
                                ? "bg-copa-green-50 border border-copa-green-200"
                                : "hover:bg-gray-50 border border-transparent"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isVinculado
                                ? "bg-copa-green-500 border-copa-green-500"
                                : "border-gray-300"
                            }`}>
                              {isVinculado && <Check className="w-3 h-3 text-white" />}
                            </div>

                            {c.logo_url && (
                              <img src={c.logo_url} alt="" className="w-6 h-6 object-contain flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {c.nome_popular || c.nome}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Temporada {c.temporada}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer com botão de salvar */}
        {!loading && (
          <div className="flex items-center justify-between pt-4 border-t mt-2">
            <p className="text-xs text-muted-foreground">
              {vinculados.size} campeonato(s) selecionado(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !hasChanges()}
                className="bg-copa-green-500 hover:bg-copa-green-600 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GerenciarCampeonatos;


