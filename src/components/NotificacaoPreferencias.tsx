import { useState } from "react";
import {
  Bell, BellOff, Clock, Trophy, TrendingUp, UserPlus, Flame, Moon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";

interface ToggleProps {
  icon: typeof Bell;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  color: string;
}

const NotifToggle = ({ icon: Icon, label, description, enabled, onChange, color }: ToggleProps) => (
  <div
    onClick={() => onChange(!enabled)}
    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
      enabled ? "border-copa-green-200 bg-white" : "border-gray-100 bg-gray-50/50 opacity-60"
    }`}
  >
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
      enabled ? color : "bg-gray-100"
    }`}>
      <Icon className={`w-4.5 h-4.5 ${enabled ? "text-white" : "text-gray-400"}`} />
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium block">{label}</span>
      <span className="text-[10px] text-muted-foreground">{description}</span>
    </div>
    <div className={`w-10 h-6 rounded-full transition-colors relative ${
      enabled ? "bg-copa-green-500" : "bg-gray-300"
    }`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
        enabled ? "translate-x-5" : "translate-x-1"
      }`} />
    </div>
  </div>
);

/**
 * Card de preferências de notificação.
 * Inserir dentro da página Perfil.tsx
 */
const NotificacaoPreferencias = () => {
  const { preferencias, atualizarPreferencias } = useNotifications();
  const [saving, setSaving] = useState(false);

  if (!preferencias) return null;

  const handleToggle = async (key: string, value: boolean) => {
    setSaving(true);
    try {
      await atualizarPreferencias({ [key]: value });
      toast.success(value ? "Notificação ativada" : "Notificação desativada");
    } catch {
      toast.error("Erro ao atualizar preferências");
    } finally {
      setSaving(false);
    }
  };

  const allDisabled = !preferencias.push_ativo;

  return (
    <Card className="rounded-2xl shadow-sm border-blue-200 overflow-hidden">
      <CardHeader className="pb-2 bg-blue-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base font-bold">Notificações</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {/* Master toggle */}
        <NotifToggle
          icon={preferencias.push_ativo ? Bell : BellOff}
          label="Push Notifications"
          description="Receber notificações no celular"
          enabled={preferencias.push_ativo}
          onChange={(v) => handleToggle("push_ativo", v)}
          color="bg-blue-500"
        />

        {/* Tipos individuais */}
        <div className={`space-y-2 ${allDisabled ? "opacity-40 pointer-events-none" : ""}`}>
          <p className="text-xs font-medium text-muted-foreground px-1 pt-2">
            Tipos de notificação
          </p>

          <NotifToggle
            icon={Clock}
            label="Palpites pendentes"
            description="Lembrete 1h antes dos jogos sem palpite"
            enabled={preferencias.palpite_pendente}
            onChange={(v) => handleToggle("palpite_pendente", v)}
            color="bg-amber-500"
          />

          <NotifToggle
            icon={Trophy}
            label="Jogos encerrados"
            description="Resultado e seus pontos ao final do jogo"
            enabled={preferencias.jogo_encerrado}
            onChange={(v) => handleToggle("jogo_encerrado", v)}
            color="bg-copa-green-500"
          />

          <NotifToggle
            icon={TrendingUp}
            label="Ranking atualizado"
            description="Quando sua posição muda no ranking"
            enabled={preferencias.ranking_update}
            onChange={(v) => handleToggle("ranking_update", v)}
            color="bg-blue-500"
          />

          <NotifToggle
            icon={UserPlus}
            label="Novos participantes"
            description="Quando alguém entra no seu grupo"
            enabled={preferencias.novo_participante}
            onChange={(v) => handleToggle("novo_participante", v)}
            color="bg-purple-500"
          />

          <NotifToggle
            icon={Flame}
            label="Eventos especiais"
            description="Novos eventos criados nos seus grupos"
            enabled={preferencias.evento_especial}
            onChange={(v) => handleToggle("evento_especial", v)}
            color="bg-orange-500"
          />
        </div>

        {/* Horário de silêncio */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-muted/30">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-100">
            <Moon className="w-4.5 h-4.5 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block">Horário de silêncio</span>
            <span className="text-[10px] text-muted-foreground">
              {preferencias.horario_silencio_inicio && preferencias.horario_silencio_fim
                ? `${preferencias.horario_silencio_inicio} às ${preferencias.horario_silencio_fim}`
                : "Desativado"}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            Em breve
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificacaoPreferencias;

