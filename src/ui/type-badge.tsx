import { cn } from "@/ui/cn";
import { typeColor } from "@/ui/type-colors";

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider",
        typeColor(type),
        className,
      )}
    >
      {type}
    </span>
  );
}
