type BrandLogoProps = {
  variant?: "light" | "dark";
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ variant = "dark", compact = false, className = "" }: BrandLogoProps) {
  return (
    <span
      className={`brand-logo brand-logo-${variant} ${compact ? "brand-logo-compact" : ""} ${className}`.trim()}
      aria-label="DemoGo"
    >
      <svg className="brand-logo-mark" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <circle cx="34" cy="40" r="22" stroke="currentColor" strokeWidth="5" opacity="0.85" />
        <circle cx="62" cy="56" r="22" stroke="currentColor" strokeWidth="5" opacity="0.85" />
        <path d="M28 36 L36 44 L28 52" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M56 52 L64 44 L56 36" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="44" y1="47" x2="56" y2="41" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
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
