import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  // accent-solid, not accent — see the note in globals.css on contrast.
  primary:
    "bg-accent-solid text-primary hover:brightness-110 disabled:opacity-50",
  secondary:
    "bg-surface-2 text-primary border border-hairline hover:bg-surface-3",
  ghost: "text-secondary hover:bg-surface-1 hover:text-primary",
  danger:
    "bg-danger-solid text-primary hover:brightness-110 disabled:opacity-50",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4",
        "text-sm font-medium tracking-tight",
        "transition-[background-color,filter,opacity] duration-fast ease-out-expo",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
