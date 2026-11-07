import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { appliquerPrefs } from "@/lib/dgmm/prefs";
import { ThemeToggle } from "@/components/dgmm/ThemeToggle";
import { LogOut } from "lucide-react";
import { DgmmLogo, SceauFiligrane } from "@/components/dgmm/Logo";
import { RepubliqueBlock, Tricolor } from "@/components/dgmm/Brand";
import { AmbianceLayer } from "@/components/dgmm/Ambiance";

/** Cadre des espaces externes (marins, armateurs). */
export function PublicShell({
  titre,
  utilisateur,
  onLogout,
  children,
  fond,
  actions,
}: {
  titre: string;
  /** Boutons supplémentaires dans l'en-tête (ex. cloche des alertes). */
  actions?: ReactNode;
  /** Photographie de fond (pages de connexion des espaces externes). */
  fond?: string | undefined;
  utilisateur?: ReactNode;
  onLogout?: (() => void) | undefined;
  children: ReactNode;
}) {
  useEffect(() => appliquerPrefs(), []);
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      {fond && (
        <>
          <div
            aria-hidden
            className="profil-fond profil-fond-actif fixed inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${fond})` }}
          />
          <div
            aria-hidden
            className="fixed inset-0 -z-10 bg-gradient-to-b from-[#0a192f]/70 via-[#0a192f]/45 to-[#0a192f]/80"
          />
        </>
      )}
      <SceauFiligrane
        className="no-print fixed -bottom-24 -right-24 -z-10 w-[26rem] lg:w-[34rem]"
        opacite={0.05}
      />
      <AmbianceLayer />
      <Tricolor className="no-print" />
      <header className="no-print bg-sidebar text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
          <Link
            to="/"
            className="flex min-w-0 cursor-pointer items-center gap-2 sm:gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Retour à l'accueil DGMM"
          >
            <DgmmLogo className="size-10" />
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-sm font-bold">DGMM · {titre}</div>
              <div className="hidden text-[11px] text-primary-foreground/70 sm:block">
                Direction Générale de la Marine Marchande
              </div>
            </div>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {utilisateur && <div className="hidden text-right text-xs sm:block">{utilisateur}</div>}
            {actions}
            <ThemeToggle light />
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Déconnexion"
                className="inline-flex items-center gap-1.5 rounded-md border border-primary-foreground/30 px-2.5 py-1.5 text-xs font-semibold hover:bg-primary-foreground/10 sm:px-3"
              >
                <LogOut className="size-3.5" /> <span className="hidden sm:inline">Déconnexion</span>
              </button>
            ) : (
              <RepubliqueBlock light className="hidden sm:block" />
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8 print:max-w-none print:p-0">
        {children}
      </main>
      <footer className="no-print border-t px-4 py-4 text-center text-xs text-muted-foreground">
        Direction Générale de la Marine Marchande · République Gabonaise
      </footer>
    </div>
  );
}
