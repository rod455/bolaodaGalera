import { Capacitor } from "@capacitor/core";
import { Trophy, Star, Users, Gift, ChevronRight, Copy, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getReferralUrl, PLAY_STORE_URL } from "@/lib/constants";
import { shareViaWhatsApp } from "@/lib/utils";
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
  { convites: 10, reward: "Premium PRO por 1 mês", emoji: "🎁" },
  { convites: 20, reward: "Premium PRO por 3 meses", emoji: "🏆" },
  { convites: 30, reward: "Premium PRO por 1 ano", emoji: "👑" },
];

const XPProgressCard = ({ userXP, referralCode, variant = "full" }: XPProgressCardProps) => {
  const color = getNivelColor(userXP.nivel);
  const emoji = getNivelEmoji(userXP.nivel);
  const info = getNivelInfo(userXP.nivel);
  const proximo = getProximoNivel(userXP.nivel);
  const progress = getXPProgress(userXP.xp_total, userXP.nivel);

  const getReferralText = () => {
    const url = Capacitor.isNativePlatform() ? PLAY_STORE_URL : getReferralUrl(referralCode ?? "", "whatsapp");
    return Capacitor.isNativePlatform() ? `🏆 Vem jogar no Bolão na Copa comigo!\n\nQuero ver quem sabe mais do que eu!\n\nBaixe o app: ${url}` : `🏆 Vem jogar no Bolão na Copa comigo!\n\nUse meu código: ${referralCode}\n\nCadastre aqui: ${url}`;
  };

  const handleWhatsAppReferral = () => {
    if (!referralCode) return;
    shareViaWhatsApp(getReferralText());
  };

  const handleCopyReferral = () => {
    if (!referralCode) return;
    if (navigator.share) {
      navigator.share({ title: "Bolão na Copa", text: getReferralText() }).catch(() => {});
    } else {
      navigator.clipboard.writeText(getReferralText());
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
                onClick={handleWhatsAppReferral}
                className="bg-[#25D366] hover:bg-[#1da851] text-white rounded-lg h-10 px-3"
                title="Enviar pelo WhatsApp"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </Button>
              <Button
                size="sm"
                onClick={handleCopyReferral}
                className="bg-copa-green-500 hover:bg-copa-green-600 text-white rounded-lg h-10 px-3"
                title="Compartilhar"
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
