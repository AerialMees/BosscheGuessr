import type { ButtonHTMLAttributes, ReactNode } from "react";

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: "primary" | "secondary" | "danger";
}

export function RetroButton({ children, tone = "primary", className = "", ...props }: RetroButtonProps) {
  return (
    <button className={`retro-button retro-button-${tone} ${className}`} {...props}>
      {children}
    </button>
  );
}
