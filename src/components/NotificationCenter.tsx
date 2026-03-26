import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Check, CheckCheck, Clock, Trophy, TrendingUp,
  UserPlus, Flame, Mail, Info, X, Settings, Trash2,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notificacao, NotificacaoTipo } from "@/lib/notification-types";

// Mapa de ícones por tipo
const ICON_MAP: Record<NotificacaoTipo, typeof Bell> = {
  palpite_pendente: Clock,
  jogo_encerrado: Trophy,
  ranking_update: TrendingUp,
  novo_participante: UserPlus,
  evento_especial: Flame,
  convite_bolao: Mail,
  sistema: Info,
};

const COR_MAP: Record<NotificacaoTipo, string> = {
  palpite_pendente: "text-amber-600 bg-amber-100",
  jogo_encerrado: "text-copa-green-600 bg-copa-green-100",
  ranking_update: "text-blue-600 bg-blue-100",
  novo_participante: "text-purple-600 bg-purple-100",
  evento_especial: "text-orange-600 bg-orange-100",
  convite_bolao: "text-copa-green-600 bg-copa-green-100",
  sistema: "text-gray-600 bg-gray-100",
};

const NotificationCenter = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notificacoes,
    naoLidas,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
    deletarTodas,
  } = useNotifications();

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Escutar navegação vinda de push notification tap
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.rota && e.detail.rota.startsWith("/")) {
        navigate(e.detail.rota);
      }
    };
    window.addEventListener("push-navigate", handler as EventListener);
    return () => window.removeEventListener("push-navigate", handler as EventListener);
  }, [navigate]);

  const handleClickNotificacao = async (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      await marcarComoLida(notificacao.id);
    }

    // Navegar se tiver rota
    const rota = notificacao.dados?.rota;
    if (rota && rota.startsWith("/")) {
      setOpen(false);
      navigate(rota);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Não navegar ao clicar no X
    await deletarNotificacao(id);
  };

  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Agora";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}sem`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do sino */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5 text-white" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-copa-green-500 px-1">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-[22rem] bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-bold text-foreground">Notificações</h3>
            <div className="flex items-center gap-1.5">
              {naoLidas > 0 && (
                <button
                  onClick={() => marcarTodasComoLidas()}
                  className="flex items-center gap-1 text-[10px] font-semibold text-copa-green-600 hover:text-copa-green-700 transition-colors px-1.5 py-1 rounded-md hover:bg-copa-green-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Ler todas
                </button>
              )}
              {notificacoes.length > 0 && (
                <button
                  onClick={() => deletarTodas()}
                  className="flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:text-red-600 transition-colors px-1.5 py-1 rounded-md hover:bg-red-50"
                  title="Limpar todas"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpar
                </button>
              )}
              <button
                onClick={() => { setOpen(false); navigate("/perfil"); }}
                className="p-1 rounded-full hover:bg-muted transition-colors"
                title="Configurar notificações"
              >
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.slice(0, 20).map((notificacao) => {
                const Icon = ICON_MAP[notificacao.tipo as NotificacaoTipo] || Info;
                const cores = COR_MAP[notificacao.tipo as NotificacaoTipo] || "text-gray-600 bg-gray-100";
                const [textCor, bgCor] = cores.split(" ");

                return (
                  <div
                    key={notificacao.id}
                    className={`group relative flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 border-b border-gray-50 last:border-b-0 cursor-pointer ${
                      !notificacao.lida ? "bg-blue-50/30" : ""
                    }`}
                    onClick={() => handleClickNotificacao(notificacao)}
                  >
                    {/* Ícone */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${bgCor}`}>
                      <Icon className={`w-4 h-4 ${textCor}`} />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!notificacao.lida ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                          {notificacao.titulo}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {formatTimeAgo(notificacao.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notificacao.mensagem}
                      </p>
                      {notificacao.dados?.bolao_nome && (
                        <span className="inline-block text-[10px] font-medium text-copa-green-600 bg-copa-green-50 rounded-full px-2 py-0.5 mt-1">
                          {notificacao.dados.bolao_nome}
                        </span>
                      )}
                    </div>

                    {/* Botão X (deletar) — aparece no hover */}
                    <button
                      onClick={(e) => handleDelete(e, notificacao.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
                      title="Remover notificação"
                    >
                      <X className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                    </button>

                    {/* Indicador não lida */}
                    {!notificacao.lida && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notificacoes.length > 0 && (
            <div className="border-t px-4 py-2.5">
              <button
                onClick={() => { setOpen(false); navigate("/perfil"); }}
                className="text-xs font-medium text-copa-green-600 hover:text-copa-green-700 transition-colors w-full text-center"
              >
                Configurar notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
