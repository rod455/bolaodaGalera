import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Eye } from "lucide-react";
import alertIcon from "@/assets/icon-alert.png";

const AlertPreview = () => {
  const samplePromotion = {
    destination: "Paris",
    airline: "Air France",
    program: "Flying Blue",
    totalCostBrl: 2850,
    firstName: "João"
  };

  return (
    <Card className="shadow-card bg-gradient-cloud border-0">
      <CardHeader>
        <div className="flex items-center gap-3">
          <img src={alertIcon} alt="Alertas" className="h-8 w-8" />
          <div>
            <CardTitle className="text-foreground">Preview do E-mail</CardTitle>
            <p className="text-sm text-muted-foreground">
              Veja como ficará o alerta de promoção
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="border-l-4 border-primary pl-4 mb-4">
            <h3 className="font-bold text-lg text-foreground">
              ✈️ Alerta de Promoção: Passagens para {samplePromotion.destination} a partir de R$ {samplePromotion.totalCostBrl.toLocaleString()}!
            </h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <p className="text-foreground">
              Olá, <strong>{samplePromotion.firstName}</strong>! Encontramos uma ótima promoção para <strong>{samplePromotion.destination}</strong>, um dos seus destinos de interesse!
            </p>
            
            <div className="bg-accent/30 rounded-md p-3 space-y-2">
              <h4 className="font-semibold text-foreground">Detalhes da Promoção:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><strong>Companhia:</strong> {samplePromotion.airline}</li>
                <li><strong>Programa:</strong> {samplePromotion.program}</li>
                <li><strong>Preço Total:</strong> R$ {samplePromotion.totalCostBrl.toLocaleString()}</li>
              </ul>
            </div>
            
            <div className="text-center pt-2">
              <div className="inline-block bg-gradient-sky text-primary-foreground px-6 py-2 rounded-md font-semibold">
                Ver Detalhes e Comprar
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="h-4 w-4" />
            Visualizar Completo
          </Button>
          <Button variant="secondary" size="sm" className="flex-1">
            <Mail className="h-4 w-4" />
            Testar Envio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertPreview;