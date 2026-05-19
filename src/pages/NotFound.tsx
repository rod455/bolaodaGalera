import { useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-copa-green-500 text-white p-6">
      <SEOHead title="Página não encontrada" noindex />
      <Trophy className="w-16 h-16 text-copa-gold-400 mb-4" />
      <h1 className="text-5xl font-black mb-2">404</h1>
      <p className="text-copa-green-100 mb-6">Página não encontrada</p>
      <Button
        onClick={() => navigate("/home")}
        className="bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold rounded-xl"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar ao início
      </Button>
    </div>
  );
};

export default NotFound;


