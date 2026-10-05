import { cn } from "./utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur", className)}
      {...props}
    />
  );
}
