import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
};

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  variant?: Variant;
};

export function Button({ children, variant = "secondary", className = "", ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} type="button" {...props}>
      {children}
    </button>
  );
}

export function LinkButton({ children, variant = "secondary", className = "", ...props }: LinkButtonProps) {
  return (
    <a className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {children}
    </a>
  );
}
