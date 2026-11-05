import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Anchor, ArrowRight, Building2, ShieldCheck, Stethoscope } from "lucide-react";
import { DgmmLogo, SceauFiligrane } from "@/components/dgmm/Logo";
import { appliquerPrefs } from "@/lib/dgmm/prefs";
import { Sigle } from "@/components/dgmm/Sigle";
import { RepubliqueBlock, Tricolor } from "@/components/dgmm/Brand";
import { ThemeToggle } from "@/components/dgmm/ThemeToggle";
import { cn } from "@/lib/utils";
import { AmbianceLayer } from "@/components/dgmm/Ambiance";

export type Profil = "marin" | "armateur" | "gestion";

/** Photographie de fond de chaque profil (public/images/profils). */
export const FONDS: Record<Profil, string> = {
  marin: "/images/profils/marins.jpg",
  armateur: "/images/profils/navire.jpg",
  gestion: "/images/profils/sante.jpg",
};

const PROFILS: { id: Profil; titre: string; texte: string; icon: typeof Anchor }[] = [
  { id: "marin", titre: "Je suis marin", texte: "Mon dossier, mon certificat d'aptitude, mon fascicule et mes jours en mer.", icon: Anchor },
  { id: "armateur", titre: "Je suis armateur", texte: "Ma flotte, mes rôles d'équipage et l'aptitude de mes marins.", icon: Building2 },
  { id: "gestion", titre: "Gestion des gens de mer", texte: "Agents de la DGMM, médecins des gens de mer et administration.", icon: Stethoscope },
];

/** Écran de chargement : le sceau se dessine, puis le portail s'ouvre. */
export function Chargement({ onFini }: { onFini: () => void }) {
  const [sortie, setSortie] = useState(false);
  useEffect(() => {
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t1 = window.setTimeout(() => setSortie(true), reduit ? 300 : 2600);
    const t2 = window.setTimeout(onFini, reduit ? 400 : 3100);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [onFini]);
  return (
    <div
      role="status"
      aria-label="Chargement du portail de la Direction Générale de la Marine Marchande"
      className={cn("chargement fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy-gradient text-primary-foreground", sortie && "chargement-sortie")}
    >
      <Tricolor className="absolute inset-x-0 top-0" />
      <div className="chargement-halo" aria-hidden />
      <div className="chargement-sceau">
        <DgmmLogo className="size-44 sm:size-52" />
      </div>
      <div className="chargement-titre mt-8 text-center">
        <div className="font-display text-3xl font-bold tracking-[0.3em]">DGMM</div>
        <div className="mt-1 text-sm text-primary-foreground/70">Direction Générale de la Marine Marchande</div>
      </div>
      <div className="chargement-barre mt-8 h-1 w-56 overflow-hidden rounded-full bg-primary-foreground/15" aria-hidden>
        <div className="h-full rounded-full bg-gold" />
      </div>
      <p className="mt-3 text-xs text-primary-foreground/55">Ouverture du portail des gens de mer…</p>
      <button type="button" onClick={onFini} className="absolute bottom-6 text-xs text-primary-foreground/60 underline-offset-4 hover:text-gold hover:underline">
        Passer
      </button>
    </div>
  );
}

/** Choix du profil : le fond change selon la carte survolée ou choisie. */
export function ChoixProfil({ onGestion, onChoix }: { onGestion: () => void; onChoix: (p: Profil) => void }) {
  const [survol, setSurvol] = useState<Profil>("gestion");
  const [choisi, setChoisi] = useState<Profil | null>(null);
  const actif = choisi ?? survol;
  const choisir = (p: Profil) => {
    setChoisi(p);
    window.setTimeout(() => (p === "gestion" ? onGestion() : onChoix(p)), 420);
  };
  return (
    <div className="profils relative isolate flex min-h-screen flex-col overflow-hidden text-primary-foreground">
      {(Object.keys(FONDS) as Profil[]).map((p) => (
        <div
          key={p}
          aria-hidden
          className={cn("profil-fond absolute inset-0 -z-20 bg-cover bg-center", actif === p && "profil-fond-actif")}
          style={{ backgroundImage: `url(${FONDS[p]})` }}
        />
      ))}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0a192f]/80 via-[#0a192f]/60 to-[#0a192f]/90" />
      <AmbianceLayer />
      <Tricolor />
      <header className="flex items-center gap-3 px-5 py-4 sm:px-10">
        <DgmmLogo className="size-12 drop-shadow-lg" />
        <div className="leading-tight">
          <div className="font-display text-sm font-bold"><Sigle s="DGMM" /> · Système <Sigle s="GDM" /></div>
          <div className="text-[11px] text-primary-foreground/70">Portail des gens de mer</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle light />
          <RepubliqueBlock light className="hidden sm:block" />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="mb-8 max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Bienvenue</div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Qui êtes-vous ?</h1>
          <p className="mt-2 text-sm text-primary-foreground/75">Choisissez votre profil pour ouvrir le bon espace.</p>
        </div>
        <div className="grid w-full max-w-5xl gap-4 md:grid-cols-3" role="radiogroup" aria-label="Profil">
          {PROFILS.map(({ id, titre, texte, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={choisi === id}
              onMouseEnter={() => setSurvol(id)}
              onFocus={() => setSurvol(id)}
              onClick={() => choisir(id)}
              className={cn(
                "profil-carte group relative overflow-hidden rounded-2xl border border-primary-foreground/20 bg-[#0a192f]/45 p-6 text-left backdrop-blur-md",
                actif === id && "border-gold",
              )}
            >
              <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center opacity-35 transition-opacity duration-500 group-hover:opacity-60" style={{ backgroundImage: `url(${FONDS[id]})` }} />
              <span className="grid size-12 place-items-center rounded-xl bg-gold text-[#0a192f] shadow-lg">
                <Icon className="size-6" />
              </span>
              <span className="mt-5 block font-display text-xl font-bold">{titre}</span>
              <span className="mt-1 block text-sm text-primary-foreground/80">{texte}</span>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold">
                Continuer <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
          <Link to="/verifier" className="inline-flex items-center gap-1 font-semibold text-primary-foreground/85 hover:text-gold">
            <ShieldCheck className="size-3.5" /> Vérifier un titre (<Sigle s="PSC" />)
          </Link>
          <Link to="/reglementation" className="font-semibold text-primary-foreground/85 hover:text-gold">Réglementation & <Sigle s="AVURNAV" /></Link>
          <Link to="/carte" className="font-semibold text-primary-foreground/85 hover:text-gold">Carte des entreprises et stations</Link>
          <Link to="/inscription/marin" className="font-semibold text-primary-foreground/85 hover:text-gold">Pré-inscription marin</Link>
          <Link to="/inscription/armateur" className="font-semibold text-primary-foreground/85 hover:text-gold">Inscription armateur</Link>
        </div>
      </main>
      <footer className="px-5 py-4 text-center text-xs text-primary-foreground/55">© {new Date().getFullYear()} Direction Générale de la Marine Marchande · République Gabonaise</footer>
    </div>
  );
}

/**
 * Gabarit des pages de connexion et d'inscription : panneau institutionnel avec le sceau
 * de la DGMM sur la photographie du profil, formulaire à droite (comme la connexion des agents).
 */
export function EcranConnexion({
  profil,
  titre,
  accroche,
  large,
  children,
}: {
  profil: Profil;
  titre: string;
  accroche: string;
  /** Formulaire long (inscriptions) : colonne plus large. */
  large?: boolean | undefined;
  children: ReactNode;
}) {
  useEffect(() => appliquerPrefs(), []);
  return (
    <div className={cn("grid min-h-screen isolate", large ? "lg:grid-cols-[0.85fr_1.15fr]" : "lg:grid-cols-[1.1fr_1fr]")}>
      <AmbianceLayer />
      <aside className="relative isolate hidden bg-navy-gradient text-primary-foreground lg:block">
        <div className="sticky top-0 flex h-screen flex-col justify-between overflow-hidden p-12">
          <div aria-hidden className="profil-fond profil-fond-actif absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `url(${FONDS[profil]})` }} />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0a192f]/90 via-[#0a192f]/72 to-[#0a192f]/50" />
          <div className="flex items-start justify-between">
            <Link to="/" className="flex items-center gap-3">
              <Anchor className="size-5 text-gold" />
              <span className="font-display text-sm font-semibold tracking-wide"><Sigle s="DGMM" /> · Système <Sigle s="GDM" /></span>
            </Link>
            <RepubliqueBlock light />
          </div>
          <div className="max-w-lg">
            <DgmmLogo className="mb-8 size-40 drop-shadow-xl" />
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">{titre}</div>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight">
              Direction Générale de la <span className="text-gold">Marine Marchande</span>
            </h1>
            <p className="mt-4 text-base text-primary-foreground/80">{accroche}</p>
          </div>
          <p className="text-xs text-primary-foreground/55">© {new Date().getFullYear()} Direction Générale de la Marine Marchande — Tous droits réservés</p>
        </div>
      </aside>
      <main className="relative isolate flex flex-col overflow-hidden">
        <ThemeToggle className="absolute right-4 top-4 z-10 bg-card" />
        <SceauFiligrane className="absolute -right-24 top-1/2 -z-10 w-[30rem] -translate-y-1/2 lg:-right-40" opacite={0.05} />
        <Tricolor className="lg:hidden" />
        <div className="flex flex-1 justify-center px-5 py-10 sm:px-10 lg:items-center">
          <div className={cn("w-full", large ? "max-w-2xl" : "max-w-md")}>
            <div className="mb-6 flex flex-col items-center text-center lg:hidden">
              <DgmmLogo className="size-24" />
              <div className="mt-3 font-display text-lg font-bold text-primary">Direction Générale de la Marine Marchande</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">{titre}</div>
            </div>
            <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">← Changer de profil</Link>
            {children}
          </div>
        </div>
        <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">Direction Générale de la Marine Marchande · République Gabonaise</footer>
      </main>
    </div>
  );
}
