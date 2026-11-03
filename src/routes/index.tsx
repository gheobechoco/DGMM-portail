import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2, ShieldCheck, Anchor, Stethoscope, FolderArchive, LayoutDashboard, Building2, ArrowRight, Settings2, Scale, Users } from "lucide-react";
import { DgmmLogo, SceauFiligrane } from "@/components/dgmm/Logo";
import { Sigle } from "@/components/dgmm/Sigle";
import { Chargement, ChoixProfil, FONDS, FOND_ROLE } from "@/components/dgmm/Accueil";
import type { Role } from "@/lib/dgmm/rules";

const ROLES: Role[] = ["gestionnaire_mm", "rh_marine", "medecin", "gestionnaire_medical", "admin_systeme", "inspecteur_travail", "delegue_syndical"];
import { ThemeToggle } from "@/components/dgmm/ThemeToggle";
import { RepubliqueBlock, Tricolor } from "@/components/dgmm/Brand";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ACCOUNTS, getSession, login } from "@/lib/dgmm/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connexion — GDM | Direction Générale de la Marine Marchande" },
      { name: "description", content: "Accès sécurisé au portail de gestion des gens de mer de la DGMM : dossiers marins, aptitude médicale STCW et livrets maritimes." },
      { property: "og:title", content: "Connexion — Portail GDM de la DGMM" },
      { property: "og:description", content: "Accès sécurisé au portail de gestion des gens de mer de la Direction Générale de la Marine Marchande." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { profil?: "gestion" | undefined; role?: Role | undefined } => ({
    profil: s["profil"] === "gestion" ? "gestion" : undefined,
    role: ROLES.includes(s["role"] as Role) ? (s["role"] as Role) : undefined,
  }),
  component: Accueil,
});

const VU = "dgmm-accueil-vu";

/** Accueil : écran de chargement (une fois par session), choix du profil, puis connexion. */
function Accueil() {
  const navigate = useNavigate();
  const { profil } = Route.useSearch();
  const [etape, setEtape] = useState<"init" | "chargement" | "profil">("init");
  useEffect(() => {
    if (getSession()) {
      navigate({ to: "/espace" });
      return;
    }
    let vu = false;
    try { vu = !!window.sessionStorage.getItem(VU); } catch { /* stockage indisponible */ }
    setEtape(vu ? "profil" : "chargement");
  }, [navigate]);
  if (profil === "gestion") return <LoginPage />;
  if (etape === "init") return <div className="min-h-screen bg-navy-gradient" />;
  // Le choix du profil est déjà en place sous l'écran de chargement, qui s'efface par-dessus.
  return (
    <>
      <ChoixProfil
        onRole={(role) => navigate({ to: "/", search: { profil: "gestion", role } })}
        onChoix={(p) => navigate({ to: p === "marin" ? "/mon-espace" : "/armateur" })}
      />
      {etape === "chargement" && (
        <Chargement
          onFini={() => {
            try { window.sessionStorage.setItem(VU, "1"); } catch { /* stockage indisponible */ }
            setEtape("profil");
          }}
        />
      )}
    </>
  );
}

const ROLE_ICONS = { gestionnaire_mm: LayoutDashboard, rh_marine: FolderArchive, medecin: Stethoscope, gestionnaire_medical: ShieldCheck, admin_systeme: Settings2, inspecteur_travail: Scale, delegue_syndical: Users };

function LoginPage() {
  const navigate = useNavigate();
  const { role } = Route.useSearch();
  const compteRole = role ? ACCOUNTS.find((a) => a.role === role) : undefined;
  const [username, setUsername] = useState(compteRole?.username ?? "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) navigate({ to: "/espace" });
  }, [navigate]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    setTouched(true);
    setError(null);
    if (!username.trim() || !password) return;
    setLoading(true);
    setTimeout(() => {
      const acc = login(username, password);
      setLoading(false);
      if (!acc) {
        setError("Nom d'utilisateur ou mot de passe incorrect.");
        return;
      }
      navigate({ to: "/espace" });
    }, 250);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panneau institutionnel */}
      <aside className="relative isolate hidden overflow-hidden bg-navy-gradient text-primary-foreground lg:flex lg:flex-col">
        <div aria-hidden className="profil-fond profil-fond-actif absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `url(${role ? FOND_ROLE[role] : FONDS.gestion})` }} />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0a192f]/90 via-[#0a192f]/75 to-[#0a192f]/55" />
        <SceauFiligrane className="absolute -bottom-32 -right-32 w-[34rem]" opacite={0.07} />
        <Tricolor />
        <WaveLines />
        <div className="relative flex flex-1 flex-col justify-between p-12">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Anchor className="size-5 text-gold" />
              <span className="font-display text-sm font-semibold tracking-wide"><Sigle s="DGMM" /> · Système <Sigle s="GDM" /></span>
            </div>
            <RepubliqueBlock light />
          </div>
          <div className="max-w-lg">
            <DgmmLogo className="mb-8 size-40 drop-shadow-xl" />
            <h1 className="font-display text-4xl font-bold leading-tight">
              Direction Générale de la <span className="text-gold">Marine Marchande</span>
            </h1>
            <p className="mt-4 text-base text-primary-foreground/75">
              Gestion des gens de mer : enrôlement, aptitude médicale aux normes <Sigle s="STCW" className="font-semibold text-primary-foreground" /> et délivrance des livrets maritimes sécurisés par QR code.
            </p>
          </div>
          <p className="text-xs text-primary-foreground/50">© {new Date().getFullYear()} Direction Générale de la Marine Marchande — Tous droits réservés</p>
        </div>
      </aside>

      {/* Formulaire */}
      <main className="relative isolate flex flex-col overflow-hidden">
        <ThemeToggle className="absolute right-4 top-4 z-10 bg-card" />
        <SceauFiligrane className="absolute -right-24 top-1/2 -z-10 w-[30rem] -translate-y-1/2 lg:-right-40" opacite={0.05} />
        <Tricolor className="lg:hidden" />
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <DgmmLogo className="size-28" />
              <h1 className="mt-4 font-display text-xl font-bold text-primary">Direction Générale de la Marine Marchande</h1>
            </div>
            <div className="mb-8 hidden lg:block">
              <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">← Changer de profil</Link>
              <h2 className="font-display text-3xl font-bold text-primary">Connexion</h2>
              {compteRole && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-primary">
                  Profil choisi : {compteRole.roleLabel}
                </p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">Accédez à votre espace professionnel sécurisé.</p>
            </div>

            <form onSubmit={submit} noValidate className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <div className="field-dgmm flex h-11 items-center gap-2 rounded-md bg-card px-3" data-invalid={touched && !username.trim()}>
                  <User className="size-4 text-muted-foreground" />
                  <input
                    id="username"
                    autoFocus={!compteRole}
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ex. marin"
                    className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {touched && !username.trim() && <p className="text-xs text-destructive">Saisissez votre nom d'utilisateur.</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="field-dgmm flex h-11 items-center gap-2 rounded-md bg-card pl-3 pr-1">
                  <Lock className="size-4 text-muted-foreground" />
                  <input
                    id="password"
                    autoFocus={!!compteRole}
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={onKey}
                    onKeyDown={onKey}
                    placeholder="••••••••"
                    className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    aria-pressed={show}
                    className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {touched && !password && <p className="text-xs text-destructive">Saisissez votre mot de passe.</p>}
                {caps && <p className="text-xs text-warning">Majuscules activées.</p>}
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" /> {error}
                </div>
              )}

              <Button type="submit" variant="gold" size="lg" className="h-11 w-full text-base" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : null}
                {loading ? "Connexion…" : "Se connecter"}
              </Button>
            </form>

            <div className="mt-10">
              <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> Comptes de démonstration <span className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNTS.map((a) => {
                  const Icon = ROLE_ICONS[a.role];
                  return (
                    <button
                      key={a.username}
                      type="button"
                      onClick={() => {
                        setUsername(a.username);
                        setPassword(a.password);
                        setError(null);
                      }}
                      aria-pressed={username === a.username}
                      className={`flex items-center gap-2 rounded-lg border bg-card p-2.5 text-left transition hover:border-gold hover:shadow-card ${username === a.username ? "border-gold ring-2 ring-gold/30" : ""}`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-primary">{a.roleLabel}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{a.username}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-2">
              <Link to="/mon-espace" className="group flex items-center gap-2 rounded-lg border border-dashed p-3 text-left transition hover:border-gold hover:bg-muted/40">
                <Anchor className="size-4 shrink-0 text-secondary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-primary">Espace Marin</span>
                  <span className="block truncate text-[11px] text-muted-foreground">Accès avec votre NIP</span>
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
              </Link>
              <Link to="/armateur" className="group flex items-center gap-2 rounded-lg border border-dashed p-3 text-left transition hover:border-gold hover:bg-muted/40">
                <Building2 className="size-4 shrink-0 text-secondary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-primary">Espace Armateurs</span>
                  <span className="block truncate text-[11px] text-muted-foreground">Rôles d'équipage</span>
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
              </Link>
            </div>
            <div className="mt-3 flex justify-center gap-4 text-xs">
              <Link to="/verifier" className="font-semibold text-primary hover:underline">Vérifier un titre (<Sigle s="PSC" />)</Link>
              <span className="text-border">|</span>
              <Link to="/reglementation" className="font-semibold text-primary hover:underline">Réglementation & <Sigle s="AVURNAV" /></Link>
            </div>
            <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3 text-center text-xs text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link to="/inscription/marin" className="font-semibold text-primary hover:underline">Pré-inscription marin</Link>
              <span className="mx-2 text-border">·</span>
              <Link to="/inscription/armateur" className="font-semibold text-primary hover:underline">Inscription armateur</Link>
            </div>
          </div>
        </div>
        <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
          Direction Générale de la Marine Marchande · République Gabonaise
        </footer>
      </main>
    </div>
  );
}

function WaveLines() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" viewBox="0 0 800 800" preserveAspectRatio="none" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <path
          key={i}
          d={`M0 ${480 + i * 32} C 200 ${430 + i * 32}, 400 ${540 + i * 32}, 800 ${460 + i * 32}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      ))}
    </svg>
  );
}
