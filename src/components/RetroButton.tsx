import type { ButtonHTMLAttributes, ReactNode } from "react";
import { sound } from "../lib/sound";

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: "primary" | "secondary" | "danger";
}

export function RetroButton({ children, tone = "primary", className = "", ...props }: RetroButtonProps) {
  return (
    <button
      className={`retro-button retro-button-${tone} ${className}`}
      {...props}
      onClick={(event) => {
        if (!props.disabled) sound.playClick();
        props.onClick?.(event);
      }}
      onMouseEnter={(event) => {
        if (!props.disabled) sound.playHover();
        props.onMouseEnter?.(event);
      }}
    >
      {children}
    </button>
  );
}
