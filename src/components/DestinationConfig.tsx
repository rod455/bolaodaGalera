import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import destinationIcon from "@/assets/icon-destination.png";

const DestinationConfig = () => {
  const [destinations, setDestinations] = useState([
    "Paris", "Tokyo", "New York", "Londres"
  ]);
  const [newDestination, setNewDestination] = useState("");

  const addDestination = () => {
    if (newDestination.trim() && !destinations.includes(newDestination.trim())) {
      setDestinations([...destinations, newDestination.trim()]);
      setNewDestination("");
      toast.success(`Destino "${newDestination.trim()}" adicionado com sucesso!`);
    } else if (destinations.includes(newDestination.trim())) {
      toast.error("Este destino já está na sua lista!");
    }
  };

  const removeDestination = (destination: string) => {
    setDestinations(destinations.filter(d => d !== destination));
    toast.success(`Destino "${destination}" removido da lista.`);
  };

  return (
    <Card className="shadow-card bg-gradient-cloud border-0">
      <CardHeader>
        <div className="flex items-center gap-3">
          <img src={destinationIcon} alt="Destinos" className="h-8 w-8" />
          <div>
            <CardTitle className="text-foreground">Destinos de Interesse</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure os destinos para receber alertas
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Madrid, Barcelona, Roma..."
            value={newDestination}
            onChange={(e) => setNewDestination(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addDestination()}
            className="flex-1"
          />
          <Button onClick={addDestination} size="default" variant="flight">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {destinations.map((destination) => (
            <Badge
              key={destination}
              variant="secondary"
              className="flex items-center gap-2 py-2 px-3 text-sm hover:bg-secondary/80 transition-smooth"
            >
              <MapPin className="h-3 w-3" />
              {destination}
              <button
                onClick={() => removeDestination(destination)}
                className="hover:text-destructive transition-smooth"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        
        {destinations.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Nenhum destino configurado. Adicione alguns destinos para receber alertas!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DestinationConfig;