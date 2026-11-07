import { useEffect, useState } from "react";
import { Hand, X } from "lucide-react";

const DUREE = 4200;

/** « Bonjour » le jour, « Bonsoir » à partir de 18 h. */
function formule(d = new Date()) {
  const h = d.getHours();
  return h >= 18 || h < 4 ? "Bonsoir" : "Bonjour";
}

/**
 * Message d'accueil animé à l'arrivée dans un espace (« Bonjour, Dr MOUGOULA Christian »).
 * Affiché une seule fois par session de navigation et par compte, en haut de l'écran,
 * puis il s'efface tout seul : il ne masque jamais durablement les données.
 */
export function Salutation({ cle, nom, sous }: { cle: string; nom: string; sous?: string | undefined }) {
  const [etat, setEtat] = useState<"cache" | "visible" | "sortie">("cache");

  useEffect(() => {
    const k = `dgmm-bonjour:${cle}`;
    try {
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {
      /* stockage indisponible : on salue quand même */
    }
    setEtat("visible");
    const t1 = window.setTimeout(() => setEtat("sortie"), DUREE);
    const t2 = window.setTimeout(() => setEtat("cache"), DUREE + 450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [cle]);

  if (etat === "cache") return null;
  let i = 0;
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3 sm:top-5">
      <div
        role="status"
        aria-live="polite"
        data-sortie={etat === "sortie"}
        className="bonjour pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-gold/40 bg-[#0a192f]/95 px-5 py-4 text-white shadow-2xl backdrop-blur"
      >
        <button
          type="button"
          onClick={() => setEtat("sortie")}
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Fermer le message d'accueil"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-center gap-3 pr-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
            <Hand className="bonjour-main size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{formule()},</div>
            <div className="font-display text-lg font-bold leading-tight sm:text-xl" aria-label={nom}>
              {nom.split(" ").map((mot, w) => (
                <span key={w} aria-hidden className="inline-block whitespace-nowrap">
                  {[...mot].map((c, j) => (
                    <span key={j} className="bonjour-lettre" style={{ animationDelay: `${180 + i++ * 32}ms` }}>
                      {c}
                    </span>
                  ))}
                  {w < nom.split(" ").length - 1 ? " " : ""}
                </span>
              ))}
            </div>
            {sous && <div className="mt-0.5 truncate text-xs text-white/70">{sous} · {formule() === "Bonsoir" ? "bonne soirée" : "bonne journée"}</div>}
          </div>
        </div>
        <span
          aria-hidden
          className="bonjour-barre absolute bottom-0 left-0 h-0.5 bg-gold"
          style={{ animationDuration: `${DUREE}ms` }}
        />
      </div>
    </div>
  );
}
