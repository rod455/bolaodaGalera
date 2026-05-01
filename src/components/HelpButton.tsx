import { useNavigate } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const EMAIL = "appfactory.rlm@gmail.com";

const HelpButton = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    if (user) {
      navigate("/perfil?feedback=true");
    } else {
      const subject = encodeURIComponent("Dúvida sobre o Bolão da Galera");
      const body = encodeURIComponent("Olá, tenho uma dúvida:\n\n");
      // Abre composição do Gmail (funciona em qualquer browser/app)
      window.open(`https://mail.google.com/mail/?view=cm&to=${EMAIL}&su=${subject}&body=${body}`, "_blank");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-4 z-40 md:bottom-6 w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      style={{ background: "#16a34a" }}
      title="Ajuda e sugestões"
    >
      <HelpCircle className="w-5 h-5 text-white" />
    </button>
  );
};

export default HelpButton;
