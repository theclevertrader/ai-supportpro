import robot from "../assets/robot.jpg";
import { cn } from "../utils/cn";

/** Robot mascot rendered on a glowing disc. The source art has a navy backdrop, blended away with `lighten`. */
export function Mascot({ size = 48, className, glow = true }: { size?: number; className?: string; glow?: boolean }) {
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full", className)} style={{ width: size, height: size, boxShadow: glow ? "0 0 22px rgba(0,217,255,0.45)" : undefined }}>
      <img src={robot} alt="" aria-hidden="true" className="h-full w-full scale-[1.12] object-cover mix-blend-lighten" />
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Mascot size={52} />
      {!compact && (
        <div className="hidden leading-tight sm:block">
          <p className="text-[26px] font-extrabold tracking-tight text-ink">AI SupportPro</p>
          <p className="-mt-0.5 text-[13px] text-primary">Smart Support. Happier Customers.</p>
        </div>
      )}
    </div>
  );
}
