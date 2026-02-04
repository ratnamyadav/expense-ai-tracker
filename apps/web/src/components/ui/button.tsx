import { cn } from "./utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition",
        variant === "primary" && "bg-white text-slate-900",
        variant === "secondary" &&
          "border border-white/20 text-white hover:bg-white/10",
        variant === "ghost" && "text-white/70 hover:text-white",
        className
      )}
      {...props}
    />
  );
}
