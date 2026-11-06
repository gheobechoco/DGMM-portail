import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Vrai si l'utilisateur a demandé à réduire les animations. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Compteur vivant : monte de 0 à la valeur au premier affichage, puis roule
 * doucement vers chaque nouvelle valeur (filtres, mises à jour). 800 ms, easing out.
 */
export function CountUp({
  value,
  duration = 800,
  format = (n) => Math.round(n).toLocaleString("fr-FR"),
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = a + (value - a) * easeOutCubic(t);
      setShown(v);
      from.current = v;
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return (
    <span className="tabular-nums" aria-label={format(value)}>
      <span aria-hidden>{format(shown)}</span>
    </span>
  );
}

/** Renvoie vrai pendant `ms` après chaque changement de `value` (hors premier rendu). */
export function useChanged<T>(value: T, ms = 1200): boolean {
  const prev = useRef(value);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return on;
}

/**
 * Jauge circulaire d'aptitude (« radar de flotte ») : l'arc se remplit
 * avec un dégradé vert maritime → or DGMM.
 */
export function CircularGauge({
  value,
  size = 120,
  stroke = 11,
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
}) {
  const uid = useId().replace(/:/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(prefersReducedMotion() ? value : 0);
  useEffect(() => {
    const t = window.requestAnimationFrame(() => setShown(value));
    return () => window.cancelAnimationFrame(t);
  }, [value]);
  const pct = Math.max(0, Math.min(100, shown));
  return (
    <div
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--success)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#g-${uid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children ?? (
          <div>
            <div className="font-display text-2xl font-bold text-primary">
              <CountUp value={value} duration={1100} />
              <span className="text-base"> %</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Bouton d'export / impression : la flèche glisse vers le bas, un anneau de chargement tourne,
 * puis une coche verte confirme avant l'ouverture de l'impression (PDF).
 */
export function ExportButton({
  onExport,
  children,
  doneLabel = "Prêt",
  ...props
}: Omit<ButtonProps, "onClick"> & { onExport: () => void; doneLabel?: string }) {
  const [etat, setEtat] = useState<"idle" | "loading" | "done">("idle");
  useEffect(() => {
    if (etat === "loading") {
      const t = window.setTimeout(() => setEtat("done"), prefersReducedMotion() ? 0 : 650);
      return () => window.clearTimeout(t);
    }
    if (etat === "done") {
      const t1 = window.setTimeout(onExport, 120);
      const t2 = window.setTimeout(() => setEtat("idle"), 1800);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    return undefined;
  }, [etat, onExport]);
  return (
    <Button
      {...props}
      onClick={() => etat === "idle" && setEtat("loading")}
      aria-busy={etat === "loading"}
      data-export-state={etat}
    >
      {etat === "idle" && <Download />}
      {etat === "loading" && (
        <span className="relative grid size-4 place-items-center">
          <Loader2 className="absolute animate-spin opacity-70" />
          <Download className="arrow-drop size-3" />
        </span>
      )}
      {etat === "done" && (
        <Check
          className={cn("pop-in text-success", props.variant === "gold" && "text-gold-foreground")}
        />
      )}
      {etat === "done" ? doneLabel : children}
    </Button>
  );
}
