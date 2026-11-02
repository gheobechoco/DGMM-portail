import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BookOpenCheck,
  CircleHelp,
  LayoutDashboard,
  Rows3,
  Rows4,
  Contrast,
  LogOut,
  ShieldCheck,
  Ship,
  Scale,
  Menu,
  Stethoscope,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { DgmmLogo, SceauFiligrane } from "@/components/dgmm/Logo";
import { RepubliqueBlock, Tricolor } from "@/components/dgmm/Brand";
import { logout, type Account } from "@/lib/dgmm/auth";
import { Omnibar } from "@/components/dgmm/Omnibar";
import { Tour, type TourStep } from "@/components/dgmm/Tour";
import { ThemeToggle } from "@/components/dgmm/ThemeToggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { appliquerPrefs, setPrefs, usePrefs } from "@/lib/dgmm/prefs";
import { useVisites } from "@/lib/dgmm/store";
import { can, type Permission } from "@/lib/dgmm/rules";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  perm: Permission;
  exact?: boolean | undefined;
}

export const NAV: NavItem[] = [
  {
    to: "/espace",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    perm: "dashboard",
    exact: true,
  },
  { to: "/espace/marins", label: "Gens de mer", icon: Users, perm: "marins" },
  { to: "/espace/visites", label: "Visites médicales", icon: Stethoscope, perm: "visites" },
  { to: "/espace/livrets", label: "Fascicules / livrets", icon: BookOpenCheck, perm: "marins.livret" },
  { to: "/espace/equipages", label: "Rôles d'équipage", icon: Ship, perm: "roles.lecture" },
  { to: "/espace/audit", label: "Journal d'audit", icon: ShieldCheck, perm: "audit" },
  { to: "/reglementation", label: "Réglementation", icon: Scale, perm: "marins" },
];

function initials(nom: string) {
  return nom
    .replace(/^Dr\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function NavLinks({
  session,
  onNavigate,
}: {
  session: Account;
  onNavigate?: (() => void) | undefined;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-1" aria-label="Navigation principale">
      {NAV.filter((n) => can(session.role, n.perm)).map((n) => {
        const active = n.exact
          ? pathname === n.to || pathname === `${n.to}/`
          : pathname.startsWith(n.to);
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            data-tour={n.to === "/espace/marins" ? "nav-marins" : undefined}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            {active && (
              <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-gold" aria-hidden />
            )}
            <Icon
              className={cn(
                "sway size-4",
                active ? "text-gold" : "text-sidebar-foreground/60 group-hover:text-gold",
              )}
            />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  session,
  onNavigate,
}: {
  session: Account;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <DgmmLogo className="size-11 shrink-0" />
        <div className="leading-tight">
          <div className="font-display text-sm font-bold text-white">DGMM</div>
          <div className="text-[11px] text-sidebar-foreground/70">Système GDM · Gens de mer</div>
        </div>
      </div>
      <div className="px-3">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
          Modules
        </div>
        <NavLinks session={session} onNavigate={onNavigate} />
      </div>
      <div className="mt-auto border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold font-display text-xs font-bold text-gold-foreground">
            {initials(session.nom)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{session.nom}</div>
            <div className="truncate text-[11px] text-sidebar-foreground/65">
              {session.roleLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="grid size-8 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function tourSteps(session: Account): TourStep[] {
  const medical = can(session.role, "visites.saisir");
  return [
    {
      cible: "omnibar",
      titre: "Recherche universelle",
      texte:
        "Tapez un NIP, un nom, un n° de livret, de certificat ou un navire pour ouvrir la fiche instantanément. Raccourci : Ctrl + K (⌘ K sur Mac), depuis n'importe quel écran.",
    },
    {
      cible: "nav-marins",
      titre: "Répertoire et filtres de conformité",
      texte:
        "Retrouvez tous les gens de mer et filtrez-les par statut administratif, aptitude médicale, certificat STCW ou armateur. Un clic sur une ligne ouvre l'aperçu latéral.",
    },
    {
      cible: "action",
      titre: medical
        ? "Nouvelle visite STCW"
        : can(session.role, "marins.creer")
          ? "Enrôler un marin"
          : "Action principale",
      texte: medical
        ? "Démarrez une visite d'aptitude (touche V). Le bouton « Examen standard » remplit les contrôles normaux en un clic et le brouillon est sauvegardé automatiquement."
        : "Ouvrez l'enrôlement guidé en 2 volets (touche N). Chaque champ est vérifié au fil de la frappe.",
    },
    {
      cible: "affichage",
      titre: "Confort d'affichage",
      texte:
        "Basculez entre les modes confort et compact, entre le mode clair et le mode nuit, activez le contraste « plein soleil » pour les contrôles à quai, et relancez ce guide (touche ?). Autres raccourcis : P pour imprimer, Échap pour fermer.",
    },
  ];
}

function estSaisie(t: EventTarget | null) {
  return (
    t instanceof HTMLElement &&
    (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
  );
}

function AffichageToolbar({ onGuide }: { onGuide: () => void }) {
  const prefs = usePrefs();
  const compact = prefs.densite === "compact";
  const eleve = prefs.contraste === "eleve";
  const btn =
    "grid size-9 place-items-center rounded-md border text-muted-foreground transition-colors hover:border-gold hover:text-primary aria-pressed:border-gold aria-pressed:bg-gold/15 aria-pressed:text-primary";
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1.5" data-tour="affichage">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={btn}
              aria-pressed={compact}
              aria-label={compact ? "Passer en mode confort" : "Passer en mode compact"}
              onClick={() => setPrefs({ densite: compact ? "confort" : "compact" })}
            >
              {compact ? <Rows4 className="size-4" /> : <Rows3 className="size-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {compact ? "Mode compact (actif)" : "Mode confort (actif)"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <ThemeToggle />
            </span>
          </TooltipTrigger>
          <TooltipContent>Mode nuit / mode clair</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={btn}
              aria-pressed={eleve}
              aria-label="Contraste élevé (plein soleil)"
              onClick={() => setPrefs({ contraste: eleve ? "normal" : "eleve" })}
            >
              <Contrast className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Contraste élevé · plein soleil</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                btn,
                "inline-flex w-auto items-center gap-1.5 whitespace-nowrap px-2.5 text-xs font-semibold",
              )}
              onClick={onGuide}
            >
              <CircleHelp className="size-4" />
              <span className="hidden md:inline">Guide rapide</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Visite guidée (touche ?)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function AppShell({ session, children }: { session: Account; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tour, setTour] = useState(false);
  const prefs = usePrefs();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const visites = useVisites();
  const visitesRef = useRef(visites);
  visitesRef.current = visites;

  useEffect(() => appliquerPrefs(prefs), [prefs]);

  // Première visite : le guide démarre seul sur le tableau de bord.
  useEffect(() => {
    if (prefs.tourVu || !(pathname === "/espace" || pathname === "/espace/")) return;
    const t = window.setTimeout(() => setTour(true), 900);
    return () => window.clearTimeout(t);
  }, [prefs.tourVu, pathname]);

  // Raccourcis clavier : N (nouveau marin), V (visite), P (imprimer), ? (guide).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        estSaisie(e.target) ||
        document.querySelector("[role=dialog]")
      )
        return;
      const k = e.key.toLowerCase();
      if (k === "n" && can(session.role, "marins.creer")) {
        e.preventDefault();
        navigate({ to: "/espace/marins/nouveau" });
      } else if (k === "v" && can(session.role, "visites.saisir")) {
        e.preventDefault();
        const m = /^\/espace\/marins\/(\d+)$/.exec(pathname);
        const draft = m
          ? visitesRef.current.find((x) => x.marinId === Number(m[1]) && !x.signee)
          : undefined;
        if (draft)
          navigate({ to: "/espace/visites/modifier/$id", params: { id: String(draft.id) } });
        else navigate({ to: "/espace/visites/nouvelle", search: m ? { marin: Number(m[1]) } : {} });
      } else if (k === "p" && document.querySelector(".print-sheet")) {
        e.preventDefault();
        window.print();
      } else if (e.key === "?") {
        e.preventDefault();
        setTour(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session.role, navigate, pathname]);

  return (
    <div className="relative isolate min-h-screen bg-background">
      <SceauFiligrane
        className="no-print fixed -bottom-24 -right-24 -z-10 w-[26rem] lg:w-[32rem]"
        opacite={0.045}
      />
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 bg-sidebar lg:block">
        <Tricolor />
        <SidebarContent session={session} />
      </aside>

      {open && (
        <div
          className="no-print fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-primary/50"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar shadow-xl">
            <Tricolor />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 grid size-8 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Fermer le menu"
            >
              <X className="size-4" />
            </button>
            <SidebarContent session={session} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64 print:pl-0">
        <header className="no-print sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
          <Tricolor className="lg:hidden" />
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid size-9 place-items-center rounded-md text-primary hover:bg-muted lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <DgmmLogo className="size-8" />
              <span className="hidden font-display text-sm font-bold text-primary sm:inline">
                DGMM
              </span>
            </div>
            <div className="min-w-0 flex-1" data-tour="omnibar">
              <Omnibar session={session} />
            </div>
            <AffichageToolbar onGuide={() => setTour(true)} />
            <RepubliqueBlock className="hidden 2xl:block" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
      <Tour steps={tourSteps(session)} open={tour} onClose={() => setTour(false)} />
    </div>
  );
}
