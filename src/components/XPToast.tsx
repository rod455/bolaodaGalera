import { useState, useEffect } from "react";

interface XPToastProps {
  xp: number;
  message: string;
  onDone: () => void;
}

const XPToast = ({ xp, message, onDone }: XPToastProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
      style={{ top: "max(5rem, calc(env(safe-area-inset-top, 0px) + 3.5rem))" }}
    >
      <div className="bg-copa-green-600 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <span className="text-sm font-bold">+{xp} XP</span>
        <span className="text-xs text-white/80">{message}</span>
      </div>
    </div>
  );
};

export default XPToast;
