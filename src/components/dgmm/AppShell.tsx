import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  BookOpenCheck,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Menu,
  Stethoscope,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { DgmmLogo } from "@/components/dgmm/Logo";
import { RepubliqueBlock, Tricolor } from "@/components/dgmm/Brand";
import { logout, type Account } from "@/lib/dgmm/auth";
import { Omnibar } from "@/components/dgmm/Omnibar";
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
  { to: "/espace/livrets", label: "Livrets maritimes", icon: BookOpenCheck, perm: "marins.livret" },
  { to: "/espace/audit", label: "Journal d'audit", icon: ShieldCheck, perm: "audit" },
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
                "size-4",
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

export function AppShell({ session, children }: { session: Account; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
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
            <div className="min-w-0 flex-1">
              <Omnibar session={session} />
            </div>
            <RepubliqueBlock className="hidden xl:block" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
