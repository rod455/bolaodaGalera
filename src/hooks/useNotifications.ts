// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Notificacao, NotificacaoPreferencias } from "@/lib/notification-types";

interface UseNotificationsReturn {
  notificacoes: Notificacao[];
  naoLidas: number;
  loading: boolean;
  preferencias: NotificacaoPreferencias | null;
  marcarComoLida: (id: string) => Promise<void>;
  marcarTodasComoLidas: () => Promise<void>;
  deletarNotificacao: (id: string) => Promise<void>;
  deletarTodas: () => Promise<void>;
  atualizarPreferencias: (prefs: Partial<NotificacaoPreferencias>) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [preferencias, setPreferencias] = useState<NotificacaoPreferencias | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);
  const pushRegistered = useRef(false);

  // ── Registrar token FCM (nativo) ──
  const registerPushToken = useCallback(async () => {
    if (!user || !Capacitor.isNativePlatform() || pushRegistered.current) return;
    pushRegistered.current = true;

    try {
      // Import estático — funciona corretamente no Capacitor
      const { PushNotifications } = await import("@capacitor/push-notifications");

      // 1. Verificar permissão atual
      let permStatus = await PushNotifications.checkPermissions();

      // 2. Pedir permissão se ainda não foi decidido
      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== "granted") {
        console.log("[Push] Permissão negada pelo usuário");
        pushRegistered.current = false;
        return;
      }

      // 3. Listener: token recebido → salva no Supabase
      await PushNotifications.addListener("registration", async (token) => {
        console.log("[Push] Token FCM:", token.value);

        const { error } = await supabase.from("push_tokens").upsert(
          {
            user_id: user.id,
            token: token.value,
            platform: Capacitor.getPlatform(), // "android" ou "ios"
            ativo: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,token" }
        );

        if (error) {
          console.error("[Push] Erro ao salvar token:", error);
        } else {
          console.log("[Push] ✅ Token salvo com sucesso!");
        }
      });

      // 4. Listener: erro de registro
      await PushNotifications.addListener("registrationError", (err) => {
        console.error("[Push] Erro de registro FCM:", JSON.stringify(err));
        pushRegistered.current = false;
      });

      // 5. Listener: notificação recebida com app aberto (foreground)
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[Push] Recebida (foreground):", notification);
        fetchNotificacoes();
      });

      // 6. Listener: usuário tocou na notificação (background/fechado)
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("[Push] Toque na notificação:", action);
        const rota = action.notification?.data?.rota;
        if (rota) {
          window.dispatchEvent(
            new CustomEvent("push-navigate", { detail: { rota } })
          );
        }
      });

      // 7. Registrar no FCM (dispara o evento "registration" acima)
      await PushNotifications.register();

    } catch (err) {
      console.error("[Push] Erro inesperado:", err);
      pushRegistered.current = false;
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
      if (!error && data) setNotificacoes(data as Notificacao[]);
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
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);

    const channel = supabase
      .channel(`notificacoes:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const novaNotificacao = payload.new as Notificacao;
          setNotificacoes((prev) => [novaNotificacao, ...prev]);
          window.dispatchEvent(new CustomEvent("nova-notificacao", { detail: novaNotificacao }));
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }, [user]);

  // ── Marcar como lida ──
  const marcarComoLida = useCallback(async (id: string) => {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  }, []);

  // ── Marcar todas como lidas ──
  const marcarTodasComoLidas = useCallback(async () => {
    if (!user) return;
    await supabase.from("notificacoes").update({ lida: true }).eq("user_id", user.id).eq("lida", false);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  }, [user]);

  // ── Deletar uma notificação ──
  const deletarNotificacao = useCallback(async (id: string) => {
    await supabase.from("notificacoes").delete().eq("id", id);
    setNotificacoes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Deletar todas ──
  const deletarTodas = useCallback(async () => {
    if (!user) return;
    await supabase.from("notificacoes").delete().eq("user_id", user.id);
    setNotificacoes([]);
  }, [user]);

  // ── Atualizar preferências ──
  const atualizarPreferencias = useCallback(
    async (prefs: Partial<NotificacaoPreferencias>) => {
      if (!user) return;
      const updated = { ...prefs, updated_at: new Date().toISOString() };
      await supabase
        .from("notificacao_preferencias")
        .upsert({ user_id: user.id, ...updated }, { onConflict: "user_id" });
      setPreferencias((prev) => (prev ? { ...prev, ...updated } : null));
    },
    [user]
  );

  // ── Init ──
  useEffect(() => {
    if (!user) {
      setNotificacoes([]);
      setPreferencias(null);
      setLoading(false);
      pushRegistered.current = false;
      return;
    }

    const init = async () => {
      setLoading(true);
      await Promise.all([fetchNotificacoes(), fetchPreferencias()]);
      setLoading(false);
      subscribeRealtime();
      registerPushToken(); // não await — roda em paralelo
    };

    init();

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (Capacitor.isNativePlatform()) {
        import("@capacitor/push-notifications").then(({ PushNotifications }) => {
          PushNotifications.removeAllListeners();
        }).catch(() => {});
        pushRegistered.current = false;
      }
    };
  }, [user]);

  return {
    notificacoes,
    naoLidas: notificacoes.filter((n) => !n.lida).length,
    loading,
    preferencias,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
    deletarTodas,
    atualizarPreferencias,
    refetch: fetchNotificacoes,
  };
};
