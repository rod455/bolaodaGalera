import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, CreditCard } from "lucide-react";

interface PromotionCardProps {
  destination: string;
  airline: string;
  program: string;
  totalCostBrl: number;
  validUntil: string;
  promotionUrl: string;
  isNew?: boolean;
}

const PromotionCard = ({
  destination,
  airline,
  program,
  totalCostBrl,
  validUntil,
  promotionUrl,
  isNew = false
}: PromotionCardProps) => {
  return (
    <Card className="shadow-card hover:shadow-flight transition-flight transform hover:scale-[1.02] bg-gradient-cloud border-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg text-foreground">{destination}</CardTitle>
          </div>
          {isNew && (
            <Badge className="bg-gradient-sunset text-primary-foreground animate-pulse">
              Novo!
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Companhia</p>
            <p className="font-semibold text-foreground">{airline}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Programa</p>
            <p className="font-semibold text-foreground">{program}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-2xl font-bold text-primary">
              R$ {totalCostBrl.toLocaleString()}
            </span>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Válido até {validUntil}</span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="flight" 
          size="lg" 
          className="w-full"
          onClick={() => window.open(promotionUrl, '_blank')}
        >
          Ver Detalhes e Comprar
        </Button>
      </CardContent>
    </Card>
  );
};

export default PromotionCard;