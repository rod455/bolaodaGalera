import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Notificacao, NotificacaoPreferencias } from "@/lib/notification-types";

// ── Tipo global Capacitor PushNotifications ──
declare global {
  interface Window {
    Capacitor?: { isNativePlatform?: () => boolean };
  }
}

const isNative = () => {
  try { return !!window.Capacitor?.isNativePlatform?.(); }
  catch { return false; }
};

interface UseNotificationsReturn {
  notificacoes: Notificacao[];
  naoLidas: number;
  loading: boolean;
  preferencias: NotificacaoPreferencias | null;
  marcarComoLida: (id: string) => Promise<void>;
  marcarTodasComoLidas: () => Promise<void>;
  atualizarPreferencias: (prefs: Partial<NotificacaoPreferencias>) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [preferencias, setPreferencias] = useState<NotificacaoPreferencias | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  // ── Registrar token FCM (nativo) ──
  const registerPushToken = useCallback(async () => {
    if (!user || !isNative()) return;

    try {
      // Import dinâmico só no nativo
      const mod = await (Function(
        'return import("@capacitor/push-notifications")'
      )() as Promise<any>);
      const PushNotifications = mod.PushNotifications;

      // Pedir permissão
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") {
        console.log("Push notifications: permissão negada");
        return;
      }

      // Registrar
      await PushNotifications.register();

      // Escutar token
      PushNotifications.addListener("registration", async (token: { value: string }) => {
        console.log("FCM Token:", token.value);
        // Salvar token no Supabase (upsert)
        await supabase.from("push_tokens").upsert(
          {
            user_id: user.id,
            token: token.value,
            platform: "android", // TODO: detectar iOS
            ativo: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,token" }
        );
      });

      // Escutar erro
      PushNotifications.addListener("registrationError", (err: any) => {
        console.error("Push registration error:", err);
      });

      // Escutar notificação recebida (app em foreground)
      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: any) => {
          console.log("Push received (foreground):", notification);
          // Refetch notificações para atualizar o badge
          fetchNotificacoes();
        }
      );

      // Escutar tap na notificação (app em background/fechado)
      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action: any) => {
          console.log("Push action:", action);
          const data = action.notification?.data;
          if (data?.rota) {
            // Navegar para a rota (será tratado pelo componente que usa o hook)
            window.dispatchEvent(
              new CustomEvent("push-navigate", { detail: { rota: data.rota } })
            );
          }
        }
      );
    } catch (err) {
      console.log("Push notifications não disponível:", err);
    }
  }, [user]);

  // ── Buscar notificações ──
  const fetchNotificacoes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotificacoes(data as Notificacao[]);
      }
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
    }
  }, [user]);

  // ── Buscar preferências ──
  const fetchPreferencias = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("notificacao_preferencias")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setPreferencias(data as NotificacaoPreferencias);
    } else {
      // Criar preferências padrão
      const defaultPrefs: Partial<NotificacaoPreferencias> = {
        user_id: user.id,
        push_ativo: true,
        palpite_pendente: true,
        jogo_encerrado: true,
        ranking_update: true,
        novo_participante: true,
        evento_especial: true,
      };
      await supabase.from("notificacao_preferencias").insert(defaultPrefs);
      setPreferencias(defaultPrefs as NotificacaoPreferencias);
    }
  }, [user]);

  // ── Subscrever em real-time ──
  const subscribeRealtime = useCallback(() => {
    if (!user) return;

    // Limpar subscription anterior
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase
      .channel(`notificacoes:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const novaNotificacao = payload.new as Notificacao;
          setNotificacoes((prev) => [novaNotificacao, ...prev]);

          // Disparar evento customizado para o toast
          window.dispatchEvent(
            new CustomEvent("nova-notificacao", { detail: novaNotificacao })
          );
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }, [user]);

  // ── Marcar como lida ──
  const marcarComoLida = useCallback(async (id: string) => {
    await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("id", id);

    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
  }, []);

  // ── Marcar todas como lidas ──
  const marcarTodasComoLidas = useCallback(async () => {
    if (!user) return;

    await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", user.id)
      .eq("lida", false);

    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  }, [user]);

  // ── Atualizar preferências ──
  const atualizarPreferencias = useCallback(
    async (prefs: Partial<NotificacaoPreferencias>) => {
      if (!user) return;

      const updated = {
        ...prefs,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from("notificacao_preferencias")
        .upsert({ user_id: user.id, ...updated }, { onConflict: "user_id" });

      setPreferencias((prev) =>
        prev ? { ...prev, ...updated } : null
      );
    },
    [user]
  );

  // ── Init ──
  useEffect(() => {
    if (!user) {
      setNotificacoes([]);
      setPreferencias(null);
      setLoading(false);
      return;
    }

    const init = async () => {
      setLoading(true);
      await Promise.all([fetchNotificacoes(), fetchPreferencias()]);
      setLoading(false);

      registerPushToken();
      subscribeRealtime();
    };

    init();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user]);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return {
    notificacoes,
    naoLidas,
    loading,
    preferencias,
    marcarComoLida,
    marcarTodasComoLidas,
    atualizarPreferencias,
    refetch: fetchNotificacoes,
  };
};
