import { Trophy, Info } from "lucide-react";

interface PromoBolaoHeaderProps {
  regulamentoUrl?: string;
}

const PromoBolaoHeader = ({ regulamentoUrl = "/regulamento-paulistao" }: PromoBolaoHeaderProps) => {
  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      style={{
        background: "linear-gradient(135deg, #92400E 0%, #B45309 30%, #D97706 60%, #EAB308 100%)",
        border: "1px solid rgba(250, 204, 21, 0.3)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm leading-snug">
            🏆 Valendo <span style={{ color: "#FEF9C3" }}>R$ 200</span> em vale-presente Amazon para o 1º lugar!
          </p>
          <p className="text-white/60 text-[11px] mt-0.5">
            Inscrições até sábado, 22/02, às 18h
          </p>
        </div>
        <a
          href={regulamentoUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
          title="Ver regulamento"
        >
          <Info className="w-4 h-4 text-white/80" />
        </a>
      </div>
    </div>
  );
};

export default PromoBolaoHeader;

