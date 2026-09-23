import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...rest }, ref) => (
    <div>
      <input
        ref={ref}
        className={[styles.input, error && styles.hasError, className].filter(Boolean).join(" ")}
        aria-invalid={Boolean(error) || undefined}
        {...rest}
      />
      {error ? <div className={styles.error}>{error}</div> : null}
    </div>
  )
);
Input.displayName = "Input";

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className={styles.label}>{children}</div>;
}
