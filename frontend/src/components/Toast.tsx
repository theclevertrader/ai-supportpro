import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;

  const toneIcons = {
    mint: <CheckCircle2 size={16} className="text-mint shrink-0" />,
    warn: <AlertTriangle size={16} className="text-warn shrink-0" />,
    danger: <AlertCircle size={16} className="text-danger shrink-0" />,
    ai: <Sparkles size={16} className="text-primary shrink-0" />,
  };

  const toneBorders = {
    mint: "border-mint/40 bg-card/95 text-mint shadow-[0_4px_24px_rgba(16,185,129,0.2)]",
    warn: "border-warn/40 bg-card/95 text-warn shadow-[0_4px_24px_rgba(245,158,11,0.2)]",
    danger: "border-danger/40 bg-card/95 text-danger shadow-[0_4px_24px_rgba(239,68,68,0.2)]",
    ai: "border-primary/40 bg-card/95 text-primary shadow-[0_4px_24px_rgba(0,217,255,0.25)]",
  };

  const tone = toast.tone || "mint";

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-up max-w-sm pointer-events-none">
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-md text-sm font-medium ${toneBorders[tone]}`}>
        {toneIcons[tone]}
        <span className="text-ink">{toast.message}</span>
      </div>
    </div>
  );
}
