import { useEffect, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/dgmm/ThemeToggle";
import { appliquerPrefs, setPrefs, usePrefs } from "@/lib/dgmm/prefs";
import { DgmmLogo, SceauFiligrane } from "@/components/dgmm/Logo";
import { Tricolor } from "@/components/dgmm/Brand";
import { AmbianceLayer } from "@/components/dgmm/Ambiance";
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => appliquerPrefs(prefs), [prefs]);
  const retour = pathname.startsWith("/verifier/") ? "/verifier" : "/";
  const libelleRetour =
    retour === "/verifier"
      ? lang === "fr"
        ? "Retour à la recherche"
        : "Back to search"
      : lang === "fr"
        ? "Retour à l'accueil"
        : "Back to home";
  return (
    <div
      className="relative isolate flex min-h-screen flex-col overflow-hidden bg-background"
      lang={lang}
    >
      <SceauFiligrane
        className="fixed left-1/2 top-1/2 -z-10 w-[min(90vw,40rem)] -translate-x-1/2 -translate-y-1/2"
        opacite={0.06}
      />
      <AmbianceLayer />
      <Tricolor />
      <header className="flex items-center justify-between gap-3 bg-sidebar px-4 py-3 text-primary-foreground sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          {pathname !== "/verifier" && (
            <Link
              to={retour}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-2 text-xs font-semibold text-primary-foreground/85 hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              aria-label={libelleRetour}
              title={libelleRetour}
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">{lang === "fr" ? "Retour" : "Back"}</span>
            </Link>
          )}
          <Link
            to="/verifier"
            className="flex min-w-0 cursor-pointer items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
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
          </Link>
        </div>
        <ThemeToggle light className="ml-auto size-8" />
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

export function validateLang(s: Record<string, unknown>): {
  lang?: Lang | undefined;
  source?: "qr" | undefined;
} {
  return {
    lang: s["lang"] === "en" ? "en" : undefined,
    source: s["source"] === "qr" ? "qr" : undefined,
  };
}
