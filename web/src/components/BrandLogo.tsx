type BrandLogoProps = {
  variant?: "light" | "dark";
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ variant = "dark", compact = false, className = "" }: BrandLogoProps) {
  return (
    <span className={`brand-logo brand-logo-${variant} ${compact ? "brand-logo-compact" : ""} ${className}`.trim()} aria-label="DemoGo">
      <svg className="brand-logo-mark" viewBox="0 0 96 96" aria-hidden="true">
        <path d="M16 26 C16 20.8 19.8 18 25 18 H40.5 C46.2 18 50.8 20 54.6 23.6 L74.2 43.6 C77.2 46.6 77.2 49.4 74.2 52.4 L54.6 72.4 C50.8 76 46.2 78 40.5 78 H25 C19.8 78 16 75.2 16 70 Z" />
      </svg>
      {!compact ? (
        <span className="brand-logo-word">
          <span>Demo</span>
          <strong>Go</strong>
        </span>
      ) : null}
    </span>
  );
}
