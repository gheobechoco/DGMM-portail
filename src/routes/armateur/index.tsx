import { Link, createFileRoute } from "@tanstack/react-router";
import { CarteSkeleton } from "@/components/dgmm/Skeletons";
import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Lock,
  Plus,
  Ship,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PublicShell } from "@/components/dgmm/PublicShell";
import {
  EmptyState,
  Field,
  Panel,
  StatCard,
  inputClass,
  selectClass,
} from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import { MarinPhoto } from "@/components/dgmm/MarinBits";
import { ConformityGauge } from "@/components/dgmm/ConformityGauge";
import { Aide } from "@/components/dgmm/Aide";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  ARMATEUR_ACCOUNTS,
  armateurSession,
  loginArmateur,
  useArmateur,
  type ArmateurAccount,
} from "@/lib/dgmm/auth";
import { certificateStatus, type CertStatus } from "@/lib/dgmm/rules";
import { FONCTIONS_BORD, armateur as getArmateur } from "@/lib/dgmm/maritime";
import {
  formatDate,
  fullName,
  journaliser,
  lastCertificate,
  niveauConformite,
  saveRole,
  useMarins,
  useRoles,
  useVisites,
  type Marin,
  type RoleEquipage,
  type Visite,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/armateur/")({
  ssr: false,
  pendingComponent: CarteSkeleton,
  head: () => ({
    meta: [
      { title: "Espace Armateurs — DGMM" },
      {
        name: "description",
        content:
          "Espace des compagnies maritimes : rôle d'équipage et conformité médicale avant appareillage.",
      },
    ],
  }),
  component: EspaceArmateur,
});

function EspaceArmateur() {
  const a = useArmateur();
  if (!a) return <ConnexionArmateur />;
  return (
    <PublicShell
      titre="Espace Armateurs"
      utilisateur={
        <>
          <div className="font-semibold">{a.entreprise}</div>
          <div className="text-primary-foreground/70">{a.contact}</div>
        </>
      }
      onLogout={() => armateurSession.write(null)}
    >
      <Tableau a={a} />
    </PublicShell>
  );
}

function ConnexionArmateur() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const a = loginArmateur(u, p);
    if (!a) return setErr("Identifiant ou mot de passe incorrect.");
    journaliser(`Armateur ${a.entreprise}`, "Connexion à l'espace armateur", a.entreprise);
  };
  return (
    <PublicShell titre="Espace Armateurs">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary">
              <Building2 className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold text-primary">Espace Armateurs</h1>
              <p className="text-sm text-muted-foreground">
                Compagnies maritimes et armateurs agréés.
              </p>
            </div>
          </div>
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="u" className="text-sm font-medium">
                Identifiant
              </label>
              <div className="field-dgmm flex h-11 items-center gap-2 rounded-md bg-card px-3">
                <User className="size-4 text-muted-foreground" />
                <input
                  id="u"
                  value={u}
                  onChange={(e) => setU(e.target.value)}
                  className="h-full flex-1 bg-transparent text-sm outline-none"
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="p" className="text-sm font-medium">
                Mot de passe
              </label>
              <div className="field-dgmm flex h-11 items-center gap-2 rounded-md bg-card px-3">
                <Lock className="size-4 text-muted-foreground" />
                <input
                  id="p"
                  type="password"
                  value={p}
                  onChange={(e) => setP(e.target.value)}
                  className="h-full flex-1 bg-transparent text-sm outline-none"
                  autoComplete="current-password"
                />
              </div>
            </div>
            {err && (
              <p role="alert" className="text-sm text-destructive">
                {err}
              </p>
            )}
            <Button type="submit" variant="gold" size="lg" className="h-11 w-full">
              Se connecter
            </Button>
          </form>
          <div className="mt-6 border-t pt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comptes de démonstration
            </div>
            <div className="grid gap-2">
              {ARMATEUR_ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  type="button"
                  onClick={() => {
                    setU(a.username);
                    setP(a.password);
                    setErr(null);
                  }}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-left text-xs hover:border-gold"
                >
                  <span className="font-semibold text-primary">{a.entreprise}</span>
                  <span className="text-muted-foreground">{a.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="font-semibold text-primary hover:underline">
            Retour au portail
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}

/** Aptitude d'un marin à la date d'appareillage. */
function aptitudeAu(
  m: Marin | undefined,
  visites: Visite[],
  date: string,
): { st: CertStatus; cert: Visite | undefined } {
  if (!m) return { st: "aucun", cert: undefined };
  const cert = lastCertificate(visites, m.id);
  return { st: certificateStatus(cert?.stcw.validJusquau, new Date(`${date}T12:00:00`)), cert };
}

function Tableau({ a }: { a: ArmateurAccount }) {
  const marins = useMarins();
  const visites = useVisites();
  const roles = useRoles().filter((r) => r.armateur === a.entreprise);
  const flotte = getArmateur(a.entreprise)?.navires ?? [];
  const effectif = marins.filter((m) => m.entreprise === a.entreprise);
  const today = new Date().toISOString().slice(0, 10);
  const conformes = effectif.filter((m) => {
    const s = aptitudeAu(m, visites, today).st;
    return s === "valide" || s === "expire_bientot";
  }).length;
  const [edit, setEdit] = useState<RoleEquipage | "new" | null>(null);

  return (
    <>
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
          Espace armateur
        </div>
        <h1 className="font-display text-2xl font-bold text-primary sm:text-[28px]">
          {a.entreprise}
        </h1>
        <p className="text-sm text-muted-foreground">
          Rôles d'équipage et conformité médicale STCW de vos équipages avant appareillage.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Marins rattachés" value={effectif.length} icon={Users} />
        <StatCard label="Aptes aujourd'hui" value={conformes} icon={CheckCircle2} tone="success" />
        <StatCard
          label="Non conformes"
          value={effectif.length - conformes}
          icon={AlertTriangle}
          tone="danger"
          hint="certificat expiré ou absent"
        />
        <StatCard label="Navires" value={flotte.length} icon={Ship} />
      </div>

      <Panel
        title="Santé réglementaire de l'effectif"
        description="Certificats médicaux STCW à ce jour"
        className="mb-6"
      >
        <ConformityGauge niveaux={effectif.map((m) => niveauConformite(m, visites))} />
      </Panel>

      <Panel
        title={
          <span className="inline-flex items-center gap-1.5">
            Rôles d'équipage <Aide terme="role" />
          </span>
        }
        description="Déclarez l'équipage de chaque appareillage : la conformité est contrôlée à la date de départ."
        actions={
          <Button size="sm" variant="gold" onClick={() => setEdit("new")} disabled={!flotte.length}>
            <Plus /> Déclarer un rôle
          </Button>
        }
        bodyClassName="space-y-4"
      >
        {roles.length === 0 ? (
          <EmptyState icon={Ship} title="Aucun rôle d'équipage déclaré" />
        ) : (
          roles.map((r) => (
            <RoleCard
              key={r.id}
              r={r}
              marins={marins}
              visites={visites}
              onEdit={() => setEdit(r)}
            />
          ))
        )}
      </Panel>

      <Panel title="Effectif rattaché à la compagnie" className="mt-6" bodyClassName="p-0">
        {effectif.length === 0 ? (
          <EmptyState icon={Users} title="Aucun marin rattaché" />
        ) : (
          <ul className="divide-y">
            {effectif.map((m) => {
              const { st, cert } = aptitudeAu(m, visites, today);
              return (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <MarinPhoto m={m} className="size-9 shrink-0 rounded-full text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-primary">{fullName(m)}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.profession} · <span className="font-mono">{m.nip}</span>
                    </div>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {cert ? `→ ${formatDate(cert.stcw.validJusquau)}` : ""}
                  </span>
                  <StatusPill status={st} />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {edit && (
        <RoleDialog a={a} role={edit === "new" ? null : edit} onClose={() => setEdit(null)} />
      )}
    </>
  );
}

function RoleCard({
  r,
  marins,
  visites,
  onEdit,
}: {
  r: RoleEquipage;
  marins: Marin[];
  visites: Visite[];
  onEdit: () => void;
}) {
  const rows = r.membres.map((x) => {
    const m = marins.find((y) => y.id === x.marinId);
    return { ...x, m, ...aptitudeAu(m, visites, r.appareillage) };
  });
  const bloquants = rows.filter((x) => x.st !== "valide" && x.st !== "expire_bientot");
  const ok = bloquants.length === 0 && rows.length > 0;
  const passe = r.appareillage < new Date().toISOString().slice(0, 10);
  return (
    <article className="overflow-hidden rounded-lg border">
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 px-4 py-3",
          ok ? "bg-success/8" : "bg-destructive/6",
        )}
      >
        <Ship className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold text-primary">{r.navire}</div>
          <div className="text-xs text-muted-foreground">
            Appareillage {passe ? "effectué le" : "prévu le"} {formatDate(r.appareillage)} ·{" "}
            {rows.length} marin(s)
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
            ok
              ? "bg-success text-success-foreground"
              : "bg-destructive text-destructive-foreground",
          )}
        >
          {ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
          {ok
            ? "Conforme — appareillage autorisé"
            : `Non conforme — ${bloquants.length} marin(s) bloquant(s)`}
        </span>
        <Button size="sm" variant="outline" onClick={onEdit}>
          Modifier
        </Button>
      </div>
      <div className="border-b px-4 py-3">
        <ConformityGauge
          compact
          sujet="d'équipage"
          niveaux={rows.map((x) =>
            x.m
              ? niveauConformite(x.m, visites, new Date(`${r.appareillage}T12:00:00`))
              : "non_conforme",
          )}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2 font-semibold">Marin</th>
              <th className="px-3 py-2 font-semibold">Fonction à bord</th>
              <th className="px-3 py-2 font-semibold">Livret</th>
              <th className="px-3 py-2 font-semibold">Échéance médicale</th>
              <th className="px-4 py-2 font-semibold">À l'appareillage</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((x) => (
              <tr
                key={x.marinId}
                className={cn(x.st !== "valide" && x.st !== "expire_bientot" && "bg-destructive/5")}
              >
                <td className="px-4 py-2">
                  <div className="font-medium">{fullName(x.m)}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{x.m?.nip}</div>
                </td>
                <td className="px-3 py-2">{x.fonction}</td>
                <td className="px-3 py-2 font-mono text-xs">{x.m?.livret || "—"}</td>
                <td className="px-3 py-2 tabular-nums">{formatDate(x.cert?.stcw.validJusquau)}</td>
                <td className="px-4 py-2">
                  <StatusPill
                    status={x.st}
                    label={x.st === "expire_bientot" ? "Valide (bientôt)" : undefined}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function RoleDialog({
  a,
  role,
  onClose,
}: {
  a: ArmateurAccount;
  role: RoleEquipage | null;
  onClose: () => void;
}) {
  const marins = useMarins();
  const flotte = useMemo(() => getArmateur(a.entreprise)?.navires ?? [], [a.entreprise]);
  const [navire, setNavire] = useState(role?.navire ?? flotte[0]?.nom ?? "");
  const [date, setDate] = useState(
    role?.appareillage ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const [membres, setMembres] = useState(
    role?.membres ??
      marins
        .filter((m) => m.entreprise === a.entreprise)
        .map((m) => ({ marinId: m.id, fonction: m.profession })),
  );
  const [nip, setNip] = useState("");
  const [fonction, setFonction] = useState("Matelot");
  const [err, setErr] = useState<string | null>(null);

  const ajouter = () => {
    const m = marins.find((x) => x.nip.toUpperCase() === nip.trim().toUpperCase());
    if (!m) return setErr("Aucun marin enregistré avec ce NIP.");
    if (membres.some((x) => x.marinId === m.id)) return setErr("Ce marin figure déjà au rôle.");
    setMembres([...membres, { marinId: m.id, fonction }]);
    setNip("");
    setErr(null);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogTitle>
          {role ? "Modifier le rôle d'équipage" : "Déclarer un rôle d'équipage"}
        </DialogTitle>
        <DialogDescription>
          Liste nominative de l'équipage embarqué pour l'appareillage.
        </DialogDescription>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Navire" htmlFor="r-navire">
            <select
              id="r-navire"
              className={selectClass}
              value={navire}
              onChange={(e) => setNavire(e.target.value)}
            >
              {flotte.map((n) => (
                <option key={n.imo} value={n.nom}>
                  {n.nom} (IMO {n.imo})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date d'appareillage" htmlFor="r-date">
            <input
              id="r-date"
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
        <div className="rounded-lg border">
          <ul className="max-h-64 divide-y overflow-y-auto">
            {membres.map((x, i) => {
              const m = marins.find((y) => y.id === x.marinId);
              return (
                <li key={x.marinId} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{fullName(m)}</span>{" "}
                    <span className="font-mono text-xs text-muted-foreground">{m?.nip}</span>
                  </span>
                  <select
                    aria-label={`Fonction de ${fullName(m)}`}
                    className="field-dgmm h-8 rounded-md bg-card px-2 text-xs"
                    value={x.fonction}
                    onChange={(e) =>
                      setMembres(
                        membres.map((y, j) => (j === i ? { ...y, fonction: e.target.value } : y)),
                      )
                    }
                  >
                    {[...new Set([...FONCTIONS_BORD, x.fonction])].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Retirer ${fullName(m)}`}
                    onClick={() => setMembres(membres.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
            {membres.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                Aucun marin au rôle.
              </li>
            )}
          </ul>
          <div className="flex flex-wrap items-end gap-2 border-t bg-muted/40 p-3">
            <Field label="Ajouter par NIP" htmlFor="r-nip" className="min-w-40 flex-1">
              <input
                id="r-nip"
                className={cn(inputClass, "font-mono uppercase")}
                placeholder="15101-2410-DGM"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
              />
            </Field>
            <Field label="Fonction" htmlFor="r-fonction">
              <select
                id="r-fonction"
                className={selectClass}
                value={fonction}
                onChange={(e) => setFonction(e.target.value)}
              >
                {FONCTIONS_BORD.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Button type="button" variant="secondary" onClick={ajouter}>
              <Plus /> Ajouter
            </Button>
          </div>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="gold"
            disabled={!navire || !date || membres.length === 0}
            onClick={() => {
              saveRole(
                {
                  ...(role ? { id: role.id } : {}),
                  armateur: a.entreprise,
                  navire,
                  appareillage: date,
                  membres,
                },
                `Armateur ${a.entreprise}`,
              );
              toast.success("Rôle d'équipage enregistré");
              onClose();
            }}
          >
            Enregistrer le rôle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
