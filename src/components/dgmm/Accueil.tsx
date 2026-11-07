import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Anchor, ArrowRight, Building2, FolderArchive, LayoutDashboard, Scale, Settings2, ShieldCheck, Siren, Stethoscope, Users } from "lucide-react";
import type { Role } from "@/lib/dgmm/rules";
import { DgmmLogo, SceauFiligrane } from "@/components/dgmm/Logo";
import { appliquerPrefs } from "@/lib/dgmm/prefs";
import { Sigle } from "@/components/dgmm/Sigle";
import { RepubliqueBlock, Tricolor } from "@/components/dgmm/Brand";
import { ThemeToggle } from "@/components/dgmm/ThemeToggle";
import { cn } from "@/lib/utils";
import { AmbianceLayer } from "@/components/dgmm/Ambiance";
import { BarometreBleu } from "@/components/dgmm/Statistiques";

export type Profil = "marin" | "armateur" | "gestion" | "medical";

/** Photographie de fond de chaque profil (public/images/profils). */
export const FONDS: Record<Profil, string> = {
  marin: "/images/profils/marins.jpg",
  armateur: "/images/profils/navire.jpg",
  gestion: "/images/profils/navire.jpg",
  medical: "/images/profils/sante.jpg",
};

/** Photographie associée à chaque rôle du personnel de la DGMM. */
export const FOND_ROLE: Record<Role, string> = {
  directeur_gm: FONDS.gestion,
  rh_marine: FONDS.marin,
  medecin: FONDS.medical,
  gestionnaire_medical: FONDS.medical,
  admin_systeme: FONDS.gestion,
  inspecteur_travail: FONDS.armateur,
  delegue_syndical: FONDS.marin,
};

type Choix = { id: "marin" | "armateur" | Role; titre: string; texte: string; icon: typeof Anchor; fond: string };

const EXTERNES: Choix[] = [
  { id: "marin", titre: "Je suis marin", texte: "Mon dossier, mon certificat d'aptitude, mon fascicule et mes jours en mer.", icon: Anchor, fond: FONDS.marin },
  { id: "armateur", titre: "Je suis armateur", texte: "Ma flotte, mes rôles d'équipage et l'aptitude de mes marins.", icon: Building2, fond: FONDS.armateur },
];
const PERSONNEL: Choix[] = [
  { id: "directeur_gm", titre: "Directeur des Gens de Mer", texte: "Visa, fascicules et pilotage national.", icon: LayoutDashboard, fond: FOND_ROLE.directeur_gm },
  { id: "rh_marine", titre: "Agent DGMM — RH Marine", texte: "Pré-inscriptions, dossiers des marins, équipages.", icon: FolderArchive, fond: FOND_ROLE.rh_marine },
  { id: "medecin", titre: "Médecin des gens de mer", texte: "Visites d'aptitude et signature des certificats.", icon: Stethoscope, fond: FOND_ROLE.medecin },
  { id: "gestionnaire_medical", titre: "Gestionnaire médical", texte: "Accueil, file du jour et préparation des visites.", icon: ShieldCheck, fond: FOND_ROLE.gestionnaire_medical },
  { id: "admin_systeme", titre: "Administrateur système", texte: "Réglages, sauvegardes et état du portail.", icon: Settings2, fond: FOND_ROLE.admin_systeme },
];
const CONTROLE: Choix[] = [
  { id: "inspecteur_travail", titre: "Inspection du travail maritime", texte: "Contrats d'engagement et alertes des marins.", icon: Scale, fond: FOND_ROLE.inspecteur_travail },
  { id: "delegue_syndical", titre: "Délégué syndical", texte: "Suivi des alertes adressées à votre syndicat.", icon: Users, fond: FOND_ROLE.delegue_syndical },
];

/** Écran de chargement : le sceau se dessine, puis le portail s'ouvre. */
export function Chargement({ onFini }: { onFini: () => void }) {
  const [sortie, setSortie] = useState(false);
  useEffect(() => {
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t1 = window.setTimeout(() => setSortie(true), reduit ? 300 : 2600);
    const t2 = window.setTimeout(onFini, reduit ? 400 : 3100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onFini]);
  return (
    <div
      role="status"
      aria-label="Chargement du portail de la Direction Générale de la Marine Marchande"
      className={cn(
        "chargement fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy-gradient text-primary-foreground",
        sortie && "chargement-sortie",
      )}
    >
      <Tricolor className="absolute inset-x-0 top-0" />
      <div className="chargement-halo" aria-hidden />
      <div className="chargement-sceau">
        <DgmmLogo className="size-44 sm:size-52" />
      </div>
      <div className="chargement-titre mt-8 text-center">
        <div className="font-display text-3xl font-bold tracking-[0.3em]">DGMM</div>
        <div className="mt-1 text-sm text-primary-foreground/70">
          Direction Générale de la Marine Marchande
        </div>
      </div>
      <div
        className="chargement-barre mt-8 h-1 w-56 overflow-hidden rounded-full bg-primary-foreground/15"
        aria-hidden
      >
        <div className="h-full rounded-full bg-gold" />
      </div>
      <p className="mt-3 text-xs text-primary-foreground/55">
        Ouverture du portail des gens de mer…
      </p>
      <button
        type="button"
        onClick={onFini}
        className="absolute bottom-6 text-xs text-primary-foreground/60 underline-offset-4 hover:text-gold hover:underline"
      >
        Passer
      </button>
    </div>
  );
}

/** Choix du profil : le fond change selon la carte survolée ; chaque choix ouvre sa page de connexion. */
export function ChoixProfil({ onRole, onChoix }: { onRole: (r: Role) => void; onChoix: (p: "marin" | "armateur") => void }) {
  const [survol, setSurvol] = useState<Choix>(EXTERNES[0]!);
  const [choisi, setChoisi] = useState<Choix | null>(null);
  const actif = choisi ?? survol;
  const choisir = (c: Choix) => {
    setChoisi(c);
    window.setTimeout(() => (c.id === "marin" || c.id === "armateur" ? onChoix(c.id) : onRole(c.id)), 420);
  };
  const fonds = [...new Set([...EXTERNES, ...PERSONNEL, ...CONTROLE].map((c) => c.fond))];
  const carte = (c: Choix, grande: boolean) => {
    const Icon = c.icon;
    return (
      <button
        key={c.id}
        type="button"
        role="radio"
        aria-checked={choisi?.id === c.id}
        onMouseEnter={() => setSurvol(c)}
        onFocus={() => setSurvol(c)}
        onClick={() => choisir(c)}
        className={cn(
          "profil-carte group relative isolate overflow-hidden rounded-2xl border border-primary-foreground/20 bg-[#0a192f]/45 text-left backdrop-blur-md",
          grande ? "p-6" : "p-4",
          actif.id === c.id && "border-gold",
        )}
      >
        <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center opacity-30 transition-opacity duration-500 group-hover:opacity-60" style={{ backgroundImage: `url(${c.fond})` }} />
        <span className={cn("grid place-items-center rounded-xl bg-gold text-[#0a192f] shadow-lg", grande ? "size-12" : "size-10")}>
          <Icon className={grande ? "size-6" : "size-5"} />
        </span>
        <span className={cn("block font-display font-bold", grande ? "mt-5 text-xl" : "mt-3 text-base leading-tight")}>{c.titre}</span>
        <span className={cn("mt-1 block text-primary-foreground/80", grande ? "text-sm" : "text-xs")}>{c.texte}</span>
        <span className={cn("inline-flex items-center gap-1.5 font-semibold text-gold", grande ? "mt-5 text-sm" : "mt-3 text-xs")}>
          Se connecter <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </button>
    );
  };
  return (
    <div className="profils relative isolate flex min-h-screen flex-col overflow-hidden text-primary-foreground">
      {fonds.map((f) => (
        <div key={f} aria-hidden className={cn("profil-fond absolute inset-0 -z-20 bg-cover bg-center", actif.fond === f && "profil-fond-actif")} style={{ backgroundImage: `url(${f})` }} />
      ))}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0a192f]/80 via-[#0a192f]/60 to-[#0a192f]/90"
      />
      <AmbianceLayer />
      <Tricolor />
      <header className="flex items-center gap-3 px-5 py-4 sm:px-10">
        <Link
          to="/"
          className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          aria-label="Retour à l'accueil DGMM"
        >
          <DgmmLogo className="size-12 drop-shadow-lg" />
        </Link>
        <div className="leading-tight">
          <div className="font-display text-sm font-bold">
            <Sigle s="DGMM" /> · Système <Sigle s="GDM" />
          </div>
          <div className="text-[11px] text-primary-foreground/70">Portail des gens de mer</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle light />
          <RepubliqueBlock light className="hidden sm:block" />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="mb-8 max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
            Bienvenue
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Qui êtes-vous ?</h1>
          <p className="mt-2 text-sm text-primary-foreground/75">
            Choisissez votre profil : vous arrivez directement sur sa page de connexion.
          </p>
        </div>
        <div className="w-full max-w-6xl space-y-6" role="radiogroup" aria-label="Profil">
          <section aria-label="Gens de mer et compagnies">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">Gens de mer et compagnies</h2>
            <div className="grid gap-4 md:grid-cols-2">{EXTERNES.map((c) => carte(c, true))}</div>
          </section>
          <section aria-label="Personnel de la DGMM">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">Personnel de la <Sigle s="DGMM" /></h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{PERSONNEL.map((c) => carte(c, false))}</div>
          </section>
          <section aria-label="Contrôle et représentation des marins">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">Contrôle et représentation des marins</h2>
            <div className="grid gap-3 sm:grid-cols-2">{CONTROLE.map((c) => carte(c, false))}</div>
          </section>
        </div>
        <Link to="/signaler" className="mt-6 inline-flex items-center gap-2 rounded-full border border-destructive/60 bg-destructive/20 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-destructive/35">
          <Siren className="size-4" /> Signaler un danger ou un abus — anonymat possible
        </Link>
        <Link
          to="/verifier"
          className="mt-6 flex w-full max-w-5xl flex-col gap-4 rounded-2xl border border-gold/50 bg-[#0a192f]/70 p-5 text-left shadow-xl backdrop-blur-md transition hover:border-gold hover:bg-[#0a192f]/85 sm:flex-row sm:items-center sm:px-7"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold text-[#0a192f]">
            <ShieldCheck className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-bold text-gold sm:text-lg">
              🛡️ Contrôle public des titres maritimes (Port State Control — MoU d'Abuja)
            </span>
            <span className="mt-1 block text-sm text-primary-foreground/80">
              Vérification immédiate sans compte par scan QR ou saisie du NIP / code certificat.
            </span>
          </span>
          <span className="inline-flex items-center gap-2 font-semibold text-primary-foreground">
            Accéder au contrôle <ArrowRight className="size-4" />
          </span>
        </Link>
        <div className="mt-5">
          <BarometreBleu />
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
          <Link
            to="/reglementation"
            className="font-semibold text-primary-foreground/85 hover:text-gold"
          >
            Réglementation & <Sigle s="AVURNAV" />
          </Link>
          <Link to="/carte" className="font-semibold text-primary-foreground/85 hover:text-gold">
            Carte des stations & entreprises
          </Link>
          <Link
            to="/inscription/marin"
            className="font-semibold text-primary-foreground/85 hover:text-gold"
          >
            Pré-inscription marin (nouveau dossier)
          </Link>
          <Link
            to="/suivi-demande"
            search={{ numero: undefined }}
            className="font-semibold text-primary-foreground/85 hover:text-gold"
          >
            Suivre ma demande
          </Link>
        </div>
      </main>
      <footer className="px-5 py-4 text-center text-xs text-primary-foreground/55">
        © {new Date().getFullYear()} Direction Générale de la Marine Marchande · République
        Gabonaise
      </footer>
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
    <div
      className={cn(
        "grid min-h-screen isolate",
        large ? "lg:grid-cols-[0.85fr_1.15fr]" : "lg:grid-cols-[1.1fr_1fr]",
      )}
    >
      <AmbianceLayer />
      <aside className="relative isolate hidden bg-navy-gradient text-primary-foreground lg:block">
        <div className="sticky top-0 flex h-screen flex-col justify-between overflow-hidden p-12">
          <div
            aria-hidden
            className="profil-fond profil-fond-actif absolute inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${FONDS[profil]})` }}
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0a192f]/90 via-[#0a192f]/72 to-[#0a192f]/50"
          />
          <div className="flex items-start justify-between">
            <Link to="/" className="flex items-center gap-3">
              <Anchor className="size-5 text-gold" />
              <span className="font-display text-sm font-semibold tracking-wide">
                <Sigle s="DGMM" /> · Système <Sigle s="GDM" />
              </span>
            </Link>
            <RepubliqueBlock light />
          </div>
          <div className="max-w-lg">
            <Link
              to="/"
              className="mb-8 inline-block cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              aria-label="Retour à l'accueil DGMM"
            >
              <DgmmLogo className="size-40 drop-shadow-xl" />
            </Link>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              {titre}
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight">
              Direction Générale de la <span className="text-gold">Marine Marchande</span>
            </h1>
            <p className="mt-4 text-base text-primary-foreground/80">{accroche}</p>
          </div>
          <p className="text-xs text-primary-foreground/55">
            © {new Date().getFullYear()} Direction Générale de la Marine Marchande — Tous droits
            réservés
          </p>
        </div>
      </aside>
      <main className="relative isolate flex flex-col overflow-hidden">
        <ThemeToggle className="absolute right-4 top-4 z-10 bg-card" />
        <SceauFiligrane
          className="absolute -right-24 top-1/2 -z-10 w-[30rem] -translate-y-1/2 lg:-right-40"
          opacite={0.05}
        />
        <Tricolor className="lg:hidden" />
        <div className="flex flex-1 justify-center px-5 py-10 sm:px-10 lg:items-center">
          <div className={cn("w-full", large ? "max-w-2xl" : "max-w-md")}>
            <div className="mb-6 flex flex-col items-center text-center lg:hidden">
              <Link
                to="/"
                className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Retour à l'accueil DGMM"
              >
                <DgmmLogo className="size-24" />
              </Link>
              <div className="mt-3 font-display text-lg font-bold text-primary">
                Direction Générale de la Marine Marchande
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                {titre}
              </div>
            </div>
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              ← Changer de profil
            </Link>
            {children}
          </div>
        </div>
        <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
          Direction Générale de la Marine Marchande · République Gabonaise
        </footer>
      </main>
    </div>
  );
}
