import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, durationMs = 600) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    if (target === prev.current) {
      setDisplay(target);
      return;
    }
    const start = prev.current;
    const diff = target - start;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    }

    raf.current = requestAnimationFrame(tick);
    prev.current = target;

    return () => cancelAnimationFrame(raf.current);
  }, [target, durationMs]);

  return display;
}

export function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  const num = typeof value === "number" ? value : Number(value);
  const animated = useCountUp(Number.isNaN(num) ? 0 : num);

  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{typeof value === "number" || !Number.isNaN(Number(value)) ? animated : value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}
