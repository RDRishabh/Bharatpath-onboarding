import React, { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "dark" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#5b4fcf] text-white hover:bg-[#4f43bf] active:bg-[#4539af] shadow-xs border border-transparent",
  secondary:
    "bg-white text-[#303747] border border-[#dfe2e8] hover:bg-[#f8f9fb] active:bg-[#f1f3f7] shadow-2xs",
  dark:
    "bg-[#151b2b] text-white hover:bg-[#20283d] active:bg-[#0c101a] border border-transparent shadow-xs",
  outline:
    "bg-transparent text-[#4f5666] border border-[#dfe2e8] hover:bg-[#f8f9fb] hover:text-[#151b2b]",
  ghost:
    "bg-transparent text-[#5d6673] hover:bg-[#f3f4f7] hover:text-[#151b2b] border border-transparent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-[32px] px-3 text-[12px] gap-1.5 rounded-[8px]",
  md: "h-[36px] px-3.5 text-[13px] gap-2 rounded-[10px]",
  lg: "h-[42px] px-4 text-[14px] gap-2.5 rounded-[10px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon,
      iconPosition = "left",
      className = "",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        style={{ fontFamily: "'General Sans', sans-serif" }}
        {...props}
      >
        {icon && iconPosition === "left" && (
          <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {icon && iconPosition === "right" && (
          <span className="shrink-0">{icon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
