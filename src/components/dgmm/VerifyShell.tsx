import { useEffect, type ReactNode } from "react";
import { Sun } from "lucide-react";
import { appliquerPrefs, setPrefs, usePrefs } from "@/lib/dgmm/prefs";
import { DgmmLogo, SceauFiligrane } from "@/components/dgmm/Logo";
import { Tricolor } from "@/components/dgmm/Brand";
import { cn } from "@/lib/utils";

export type Lang = "fr" | "en";

/** Cadre des pages publiques de contrôle (PSC), bilingue FR / EN. */
export function VerifyShell({
  lang,
  onLang,
  sousTitre,
  children,
}: {
  lang: Lang;
  onLang: (l: Lang) => void;
  sousTitre: string;
  children: ReactNode;
}) {
  const prefs = usePrefs();
  useEffect(() => appliquerPrefs(prefs), [prefs]);
  const eleve = prefs.contraste === "eleve";
  return (
    <div
      className="relative isolate flex min-h-screen flex-col overflow-hidden bg-background"
      lang={lang}
    >
      <SceauFiligrane
        className="fixed left-1/2 top-1/2 -z-10 w-[min(90vw,40rem)] -translate-x-1/2 -translate-y-1/2"
        opacite={0.06}
      />
      <Tricolor />
      <header className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground sm:px-5">
        <a
          href="/verifier"
          className="flex min-w-0 items-center gap-3"
          aria-label="Nouvelle vérification"
        >
          <DgmmLogo className="size-9 shrink-0" />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-sm font-semibold">
              {lang === "fr"
                ? "République Gabonaise · DGMM"
                : "Gabonese Republic · Maritime Administration"}
            </div>
            <div className="truncate text-[11px] text-primary-foreground/70">{sousTitre}</div>
          </div>
        </a>
        <button
          type="button"
          onClick={() => setPrefs({ contraste: eleve ? "normal" : "eleve" })}
          aria-pressed={eleve}
          aria-label={
            lang === "fr" ? "Contraste élevé (plein soleil)" : "High contrast (bright sunlight)"
          }
          title={lang === "fr" ? "Contraste élevé" : "High contrast"}
          className="ml-auto grid size-8 shrink-0 place-items-center rounded-md border border-primary-foreground/30 aria-pressed:bg-gold aria-pressed:text-gold-foreground"
        >
          <Sun className="size-4" />
        </button>
        <div
          className="flex shrink-0 overflow-hidden rounded-md border border-primary-foreground/30"
          role="group"
          aria-label="Langue / Language"
        >
          {(["fr", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLang(l)}
              aria-pressed={lang === l}
              className={cn(
                "px-2.5 py-1 text-xs font-bold uppercase",
                lang === l
                  ? "bg-gold text-gold-foreground"
                  : "text-primary-foreground/80 hover:bg-primary-foreground/10",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8">{children}</main>
      <footer className="px-4 pb-6 text-center text-[11px] text-muted-foreground">
        {lang === "fr"
          ? "Service de vérification officiel — Direction Générale de la Marine Marchande, Libreville (Gabon)"
          : "Official verification service — Directorate General of Merchant Marine, Libreville (Gabon)"}
      </footer>
    </div>
  );
}

export function validateLang(s: Record<string, unknown>): { lang?: Lang | undefined } {
  return { lang: s["lang"] === "en" ? "en" : undefined };
}
