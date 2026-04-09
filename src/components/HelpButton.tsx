import { useNavigate } from "react-router-dom";
import { HelpCircle } from "lucide-react";

const HelpButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/perfil?feedback=true")}
      className="fixed bottom-24 right-4 z-40 md:bottom-6 w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      style={{ background: "#16a34a" }}
      title="Ajuda e sugestões"
    >
      <HelpCircle className="w-5 h-5 text-white" />
    </button>
  );
};

export default HelpButton;
