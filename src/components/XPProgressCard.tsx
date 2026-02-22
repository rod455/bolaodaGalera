import { Trophy, Star, Users, Gift, ChevronRight, Copy, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import NivelBadge from "@/components/NivelBadge";
import {
  getNivelColor, getNivelEmoji, getNivelInfo, getProximoNivel, getXPProgress,
  type UserXP,
} from "@/hooks/useGamification";

interface XPProgressCardProps {
  userXP: UserXP;
  referralCode: string | null;
  variant?: "full" | "compact";
}

const REFERRAL_REWARDS = [
  { convites: 5, reward: "Premium PRO por 1 mês", emoji: "🎁" },
  { convites: 10, reward: "Premium PRO por 3 meses", emoji: "🏆" },
  { convites: 20, reward: "Premium PRO por 1 ano", emoji: "👑" },
];

const XPProgressCard = ({ userXP, referralCode, variant = "full" }: XPProgressCardProps) => {
  const color = getNivelColor(userXP.nivel);
  const emoji = getNivelEmoji(userXP.nivel);
  const info = getNivelInfo(userXP.nivel);
  const proximo = getProximoNivel(userXP.nivel);
  const progress = getXPProgress(userXP.xp_total, userXP.nivel);

  const handleCopyReferral = () => {
    if (!referralCode) return;
    const url = `${window.location.origin}/auth?modo=cadastro&ref=${referralCode}`;
    const text = `🏆 Vem jogar no Bolão na Copa comigo!\n\nUse meu código: ${referralCode}\n\nCadastre aqui: ${url}`;

    if (navigator.share) {
      navigator.share({ title: "Bolão na Copa", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Link de convite copiado!");
    }
  };

  if (variant === "compact") {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-3 py-2"
        style={{ background: `${color}08`, border: `1px solid ${color}20` }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
          style={{ background: `${color}15` }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color }}>{info.titulo}</span>
            <span className="text-[10px] text-muted-foreground">Lv.{userXP.nivel}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%`, background: color }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground whitespace-nowrap">
              {userXP.xp_total} XP
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden">
      {/* Header com nível */}
      <div
        className="px-5 pt-5 pb-4"
        style={{
          background: `linear-gradient(135deg, ${color}12 0%, ${color}05 100%)`,
          borderBottom: `1px solid ${color}15`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${color}15`, border: `2px solid ${color}30` }}
            >
              {emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color }}>{info.titulo}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Lv.{userXP.nivel}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {userXP.xp_total} XP total
              </p>
            </div>
          </div>
          <Star className="w-5 h-5" style={{ color }} />
        </div>

        {/* Progress bar */}
        {proximo && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{progress.current} / {progress.needed} XP</span>
              <span>Próximo: {proximo.titulo}</span>
            </div>
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress.percentage}%`, background: color }}
              />
            </div>
          </div>
        )}
        {!proximo && (
          <p className="text-xs mt-2 font-semibold" style={{ color }}>
            🫅 Nível máximo atingido!
          </p>
        )}
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Como ganhar XP */}
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Como ganhar XP</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "🎯", label: "Fazer palpite", xp: "+5 XP" },
              { icon: "📢", label: "Convidar amigo", xp: "+30 XP" },
              { icon: "🏟️", label: "Criar bolão", xp: "+20 XP" },
              { icon: "📤", label: "Compartilhar", xp: "+10 XP" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-2">
                <span className="text-sm">{item.icon}</span>
                <div>
                  <p className="text-[11px] font-medium leading-tight">{item.label}</p>
                  <p className="text-[10px] text-copa-green-600 font-bold">{item.xp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sistema de convites */}
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
            <Gift className="w-3 h-3 inline mr-1" />
            Convide amigos e ganhe Premium
          </h4>

          <div className="space-y-2">
            {REFERRAL_REWARDS.map((reward) => {
              const achieved = userXP.convites_aceitos >= reward.convites;
              return (
                <div
                  key={reward.convites}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                    achieved
                      ? "bg-copa-green-50 border border-copa-green-200"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{reward.emoji}</span>
                    <span className={achieved ? "font-bold text-copa-green-700" : "text-muted-foreground"}>
                      {reward.convites} amigos
                    </span>
                  </div>
                  <span className={achieved ? "font-bold text-copa-green-600" : "text-muted-foreground"}>
                    {achieved ? "✅ Desbloqueado!" : reward.reward}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground mt-2">
            <Users className="w-3 h-3 inline mr-0.5" />
            {userXP.convites_aceitos} amigo{userXP.convites_aceitos !== 1 ? "s" : ""} convidado{userXP.convites_aceitos !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Código de referral */}
        {referralCode && (
          <div className="bg-copa-gold-50 border border-copa-gold-300 rounded-xl p-3">
            <p className="text-[10px] text-copa-gold-600 font-semibold mb-2">Seu código de convite:</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white rounded-lg px-3 py-2 text-center font-mono text-lg font-black text-copa-green-700 tracking-widest border border-copa-gold-300">
                {referralCode}
              </div>
              <Button
                size="sm"
                onClick={handleCopyReferral}
                className="bg-copa-green-500 hover:bg-copa-green-600 text-white rounded-lg h-10 px-3"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default XPProgressCard;
