import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Clock, Trophy, TrendingUp, UserPlus, Flame, Mail, Info, X,
} from "lucide-react";
import type { Notificacao, NotificacaoTipo } from "@/lib/notification-types";

const ICON_MAP: Record<string, typeof Bell> = {
  palpite_pendente: Clock,
  jogo_encerrado: Trophy,
  ranking_update: TrendingUp,
  novo_participante: UserPlus,
  evento_especial: Flame,
  convite_bolao: Mail,
  sistema: Info,
};

const COR_MAP: Record<string, { text: string; bg: string; border: string }> = {
  palpite_pendente: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  jogo_encerrado: { text: "text-copa-green-700", bg: "bg-copa-green-50", border: "border-copa-green-200" },
  ranking_update: { text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  novo_participante: { text: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  evento_especial: { text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  convite_bolao: { text: "text-copa-green-700", bg: "bg-copa-green-50", border: "border-copa-green-200" },
  sistema: { text: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" },
};

interface ToastItem {
  id: string;
  notificacao: Notificacao;
  visible: boolean;
}

/**
 * Componente global que escuta novas notificações via CustomEvent
 * e mostra toasts flutuantes animados.
 * 
 * Colocar uma única vez no App.tsx (fora das rotas).
 */
const NotificationToast = () => {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
    );
    // Remover do DOM após animação
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const handleNovaNotificacao = useCallback(
    (e: CustomEvent<Notificacao>) => {
      const notificacao = e.detail;
      const id = notificacao.id || crypto.randomUUID();

      setToasts((prev) => [
        ...prev,
        { id, notificacao, visible: true },
      ]);

      // Auto-dismiss após 5 segundos
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast]
  );

  useEffect(() => {
    window.addEventListener(
      "nova-notificacao",
      handleNovaNotificacao as EventListener
    );
    return () => {
      window.removeEventListener(
        "nova-notificacao",
        handleNovaNotificacao as EventListener
      );
    };
  }, [handleNovaNotificacao]);

  const handleClick = (toast: ToastItem) => {
    const rota = toast.notificacao.dados?.rota;
    if (rota && rota.startsWith("/")) navigate(rota);
    removeToast(toast.id);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 left-4 sm:left-auto sm:w-96 z-[200] space-y-2 pointer-events-none" style={{ top: "max(1rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))" }}>
      {toasts.map((toast) => {
        const tipo = toast.notificacao.tipo as NotificacaoTipo;
        const Icon = ICON_MAP[tipo] || Bell;
        const cores = COR_MAP[tipo] || COR_MAP.sistema;

        return (
          <div
            key={toast.id}
            onClick={() => handleClick(toast)}
            className={`pointer-events-auto cursor-pointer flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-sm transition-all duration-300 ${
              cores.bg
            } ${cores.border} ${
              toast.visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2"
            }`}
          >
            {/* Ícone */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cores.bg}`}>
              <Icon className={`w-5 h-5 ${cores.text}`} />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${cores.text}`}>
                {toast.notificacao.titulo}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {toast.notificacao.mensagem}
              </p>
            </div>

            {/* Botão fechar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationToast;

