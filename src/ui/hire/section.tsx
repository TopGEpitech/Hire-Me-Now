import { cn } from "@/ui/cn";

export function Section({
  id,
  kicker,
  title,
  intro,
  children,
  className,
}: {
  id: string;
  kicker: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:py-16", className)}>
      <p className="kicker">{kicker}</p>
      <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {intro && <p className="mt-3 max-w-2xl text-muted-foreground">{intro}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}
