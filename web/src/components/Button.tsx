import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  loading?: boolean;
};

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  variant?: Variant;
};

function Spinner() {
  return (
    <svg className="btn-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <path d="M8 2a6 6 0 0 1 5.2 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Button({ children, variant = "secondary", className = "", loading, disabled, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      className={`btn btn-${variant} ${loading ? "btn-loading" : ""} ${className}`.trim()}
      type="button"
      disabled={isDisabled}
      {...props}
    >
      {loading && <Spinner />}
      <span className="btn-label">{children}</span>
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
