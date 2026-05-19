import { ReactNode } from "react";

const PromoCardBorder = ({ children }: { children: ReactNode }) => {
  return (
    <div
      className="relative rounded-2xl p-[3px]"
      style={{
        background: "linear-gradient(135deg, #EAB308, #F59E0B, #FBBF24, #F59E0B, #EAB308)",
        boxShadow: "0 0 20px rgba(234, 179, 8, 0.3), 0 0 40px rgba(234, 179, 8, 0.1)",
      }}
    >
      {/* Badge "Valendo R$200" */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs tracking-wide whitespace-nowrap"
        style={{
          background: "linear-gradient(135deg, #EAB308, #F59E0B)",
          color: "#78350F",
          boxShadow: "0 2px 10px rgba(234, 179, 8, 0.4)",
        }}
      >
        🏆 VALENDO R$ 200 PARA O VENCEDOR
      </div>
      <div className="rounded-[14px] overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
};

export default PromoCardBorder;


