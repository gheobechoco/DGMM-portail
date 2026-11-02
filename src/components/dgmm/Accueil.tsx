import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Anchor, ArrowRight, Building2, ShieldCheck, Stethoscope } from "lucide-react";
import { DgmmLogo } from "@/components/dgmm/Logo";
import { Sigle } from "@/components/dgmm/Sigle";
import { RepubliqueBlock, Tricolor } from "@/components/dgmm/Brand";
import { ThemeToggle } from "@/components/dgmm/ThemeToggle";
import { cn } from "@/lib/utils";

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
          <Link to="/inscription/marin" className="font-semibold text-primary-foreground/85 hover:text-gold">Pré-inscription marin</Link>
          <Link to="/inscription/armateur" className="font-semibold text-primary-foreground/85 hover:text-gold">Inscription armateur</Link>
        </div>
      </main>
      <footer className="px-5 py-4 text-center text-xs text-primary-foreground/55">© {new Date().getFullYear()} Direction Générale de la Marine Marchande · République Gabonaise</footer>
    </div>
  );
}
