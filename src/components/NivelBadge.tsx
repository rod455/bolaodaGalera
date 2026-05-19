import { getNivelColor, getNivelEmoji, getNivelInfo } from "@/hooks/useGamification";

interface NivelBadgeProps {
  nivel: number;
  size?: "sm" | "md" | "lg";
  showTitulo?: boolean;
}

const NivelBadge = ({ nivel, size = "sm", showTitulo = false }: NivelBadgeProps) => {
  const color = getNivelColor(nivel);
  const emoji = getNivelEmoji(nivel);
  const info = getNivelInfo(nivel);

  const sizeClasses = {
    sm: "text-[9px] px-1.5 py-0.5 gap-0.5",
    md: "text-[10px] px-2 py-0.5 gap-1",
    lg: "text-xs px-2.5 py-1 gap-1",
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full whitespace-nowrap ${sizeClasses[size]}`}
      style={{
        background: `${color}15`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <span>{emoji}</span>
      <span>Lv.{nivel}</span>
      {showTitulo && <span className="font-semibold">· {info.titulo}</span>}
    </span>
  );
};

export default NivelBadge;


