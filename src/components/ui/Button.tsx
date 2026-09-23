import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", isLoading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={[styles.btn, styles[variant], styles[size], className].filter(Boolean).join(" ")}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...rest}
      >
        {isLoading ? <span className={styles.spinner} aria-hidden /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
