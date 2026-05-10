import { Loader2 } from "lucide-react";

/**
 * Overlay fullscreen exibido enquanto o ad está sendo carregado.
 * Uso: {adLoading && <AdLoadingOverlay />}
 */
const AdLoadingOverlay = () => (
  <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-fade-in">
    <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 max-w-xs mx-4">
      <Loader2 className="w-8 h-8 animate-spin text-copa-green-500" />
      <p className="text-sm font-semibold text-gray-700 text-center">
        Carregando anúncio...
      </p>
      <p className="text-xs text-muted-foreground text-center">
        Aguarde um momento para salvar seu palpite
      </p>
    </div>
  </div>
);

export default AdLoadingOverlay;

