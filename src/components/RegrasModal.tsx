// ═══ Modal de Regras de Pontuação (compartilhado) ═══

import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { RegraInfo } from "@/lib/types";

interface RegrasModalProps {
  regras: RegraInfo | null;
  open: boolean;
  onClose: () => void;
}

const RegrasModal = ({ regras, open, onClose }: RegrasModalProps) => {
  if (!regras) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-copa-green-700">
            {regras.titulo}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {regras.descricao}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {regras.regras.map((regra, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                regra.acerto ? "bg-copa-green-50" : "bg-red-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {regra.acerto ? (
                  <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <span className="text-sm">{regra.texto}</span>
              </div>
              <span
                className={`text-sm font-bold flex-shrink-0 ml-2 ${
                  regra.acerto ? "text-copa-green-600" : "text-red-500"
                }`}
              >
                {regra.pontos}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegrasModal;


