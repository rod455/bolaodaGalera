import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, Mail, Settings } from "lucide-react";
import PromotionCard from "./PromotionCard";
import DestinationConfig from "./DestinationConfig";
import AlertPreview from "./AlertPreview";
import heroImage from "@/assets/hero-aviation.jpg";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("promotions");

  const samplePromotions = [
    {
      destination: "Paris, França",
      airline: "Air France",
      program: "Flying Blue",
      totalCostBrl: 2850,
      validUntil: "15/12/2024",
      promotionUrl: "#",
      isNew: true
    },
    {
      destination: "Tokyo, Japão",
      airline: "JAL",
      program: "JMB",
      totalCostBrl: 4200,
      validUntil: "20/12/2024",
      promotionUrl: "#",
      isNew: true
    },
    {
      destination: "New York, EUA",
      airline: "American Airlines",
      program: "AAdvantage",
      totalCostBrl: 3100,
      validUntil: "25/12/2024",
      promotionUrl: "#"
    }
  ];

  const stats = [
    { label: "Promoções Ativas", value: "12", icon: TrendingUp, color: "text-success" },
    { label: "Destinos Monitorados", value: "4", icon: MapPin, color: "text-primary" },
    { label: "Alertas Enviados", value: "28", icon: Mail, color: "text-warning" }
  ];

  return (
    <div className="min-h-screen bg-gradient-cloud">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-sky overflow-hidden">
        <img 
          src={heroImage} 
          alt="Aviation Hero" 
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-sky/70" />
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="text-center w-full">
            <h1 className="text-4xl font-bold text-primary-foreground mb-4">
              Sistema de Alertas de Milhas
            </h1>
            <p className="text-xl text-primary-foreground/90 mb-6">
              Monitore promoções dos seus destinos favoritos automaticamente
            </p>
            <Button variant="flight" size="xl" className="animate-float">
              Configurar Novos Alertas
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="shadow-card bg-background border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-background shadow-card">
            <TabsTrigger value="promotions" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Promoções
            </TabsTrigger>
            <TabsTrigger value="destinations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Destinos
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Alertas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="promotions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Promoções Encontradas</h2>
              <Badge variant="secondary">
                {samplePromotions.length} promoções ativas
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {samplePromotions.map((promotion, index) => (
                <PromotionCard key={index} {...promotion} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="destinations">
            <DestinationConfig />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertPreview />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;