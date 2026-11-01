import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPrefs } from "@/lib/dgmm/prefs";

/** Premier élément affiché (non masqué) portant l'attribut data-tour demandé. */
function cibleVisible(cible: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return (
    [...document.querySelectorAll<HTMLElement>(`[data-tour="${cible}"]`)].find(
      (e) => e.getClientRects().length > 0,
    ) ?? null
  );
}

export interface TourStep {
  cible: string;
  titre: string;
  texte: string;
}

/**
 * Visite guidée (« coach marks ») : met en lumière les zones clés une à une.
 * Les étapes dont la cible n'est pas affichée sont ignorées.
 */
export function Tour({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const visibles = steps.filter((s) => cibleVisible(s.cible));
  const step = visibles[i];

  const measure = useCallback(() => {
    if (!step) return;
    const el = cibleVisible(step.cible);
    if (!el) return setRect(null);
    setRect(el.getBoundingClientRect());
  }, [step]);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = cibleVisible(step.cible);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = window.setTimeout(measure, 250);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, measure]);

  const fermer = useCallback(() => {
    setPrefs({ tourVu: true });
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, visibles.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, fermer, visibles.length]);

  if (!open || !step || !rect) return null;
  const pad = 6;
  const W = Math.min(340, window.innerWidth - 24);
  const below = rect.bottom + 180 < window.innerHeight;
  const left = Math.max(
    12,
    Math.min(rect.left + rect.width / 2 - W / 2, window.innerWidth - W - 12),
  );
  const top = below ? rect.bottom + 14 : Math.max(12, rect.top - 14 - 170);
  const dernier = i === visibles.length - 1;

  return (
    <div
      className="no-print fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-titre"
      aria-describedby="tour-texte"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer le guide"
        onClick={fermer}
      />
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-gold transition-all duration-300"
        style={{
          left: rect.left - pad,
          top: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow:
            "0 0 0 9999px oklch(0.205 0.045 262 / 0.62), 0 0 24px 4px oklch(0.76 0.125 88 / 0.55)",
        }}
        aria-hidden
      />
      <div
        className="absolute rounded-xl border bg-card p-4 shadow-2xl transition-all duration-300"
        style={{ left, top, width: W }}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
            Guide rapide · {i + 1}/{visibles.length}
          </span>
          <button
            type="button"
            onClick={fermer}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Passer le guide"
          >
            <X className="size-4" />
          </button>
        </div>
        <h2 id="tour-titre" className="font-display text-base font-bold text-primary">
          {step.titre}
        </h2>
        <p id="tour-texte" className="mt-1 text-sm text-muted-foreground">
          {step.texte}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1" aria-hidden>
            {visibles.map((s, k) => (
              <span
                key={s.cible}
                className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-gold" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setI(i - 1)}>
                <ArrowLeft /> Précédent
              </Button>
            )}
            <Button
              size="sm"
              variant="gold"
              autoFocus
              onClick={() => (dernier ? fermer() : setI(i + 1))}
            >
              {dernier ? "Terminer" : "Suivant"} {!dernier && <ArrowRight />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
