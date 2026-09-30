import { cn } from "@/ui/cn";

// pure css, no image to load
export function Pokeball({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block size-6 shrink-0 overflow-hidden rounded-full border-2 border-foreground bg-white",
        className,
      )}
    >
      <span className="absolute inset-x-0 top-0 h-1/2 bg-primary" />
      <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-foreground" />
      <span className="absolute left-1/2 top-1/2 size-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-white" />
    </span>
  );
}
