import { Link, createFileRoute } from "@tanstack/react-router";
import { CarteSkeleton } from "@/components/dgmm/Skeletons";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
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
import { EcranConnexion } from "@/components/dgmm/Accueil";
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
import { RoleCard, aptitudeAu } from "@/components/dgmm/RoleCard";
import { ArmateurOutils } from "@/components/dgmm/ArmateurOutils";
import { ConformityGauge } from "@/components/dgmm/ConformityGauge";
import { CircularGauge, CountUp } from "@/components/dgmm/Anim";
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
import { evaluateCertStatus, libelleJours } from "@/lib/dgmm/rules";
import { FONCTIONS_BORD, armateur as getArmateur } from "@/lib/dgmm/maritime";
import {
  formatDate,
  fullName,
  journaliser,
  joursEmbarquement,
  lastCertificate,
  niveauConformite,
  saveRole,
  useMarins,
  useRoles,
  useVisites,
  type Marin,
  type RoleEquipage,
  type Visite,
  soumettreDebarquementLot,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";
import { SectionStatistiques, TableauArmateur } from "@/components/dgmm/Statistiques";

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
    <EcranConnexion
      profil="armateur"
      titre="Espace Armateurs"
      accroche="Votre flotte, vos rôles d'équipage et l'aptitude médicale de vos marins avant chaque appareillage."
    >
      <div>
        <div>
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
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link to="/inscription/armateur" className="font-semibold text-primary hover:underline">
            Inscrire votre compagnie
          </Link>
          <span className="mx-2">·</span>
          <Link to="/" className="font-semibold text-primary hover:underline">
            Retour au portail
          </Link>
        </p>
      </div>
    </EcranConnexion>
  );
}

function Tableau({ a }: { a: ArmateurAccount }) {
  const marins = useMarins();
  const visites = useVisites();
  const roles = useRoles().filter((r) => r.armateur === a.entreprise);
  const flotte = getArmateur(a.entreprise)?.navires ?? a.navires ?? [];
  const effectif = marins.filter((m) => m.entreprise === a.entreprise);
  const today = new Date().toISOString().slice(0, 10);
  const conformes = effectif.filter((m) => {
    const s = aptitudeAu(m, visites, today).st;
    return s === "valide" || s === "expire_bientot";
  }).length;
  const [edit, setEdit] = useState<RoleEquipage | "new" | null>(null);
  const allRoles = useRoles();
  const alertes = useMemo(() => {
    const ids = new Set([
      ...effectif.map((m) => m.id),
      ...allRoles
        .filter((r) => r.armateur === a.entreprise)
        .flatMap((r) => r.membres.map((x) => x.marinId)),
    ]);
    return [...ids]
      .map((id) => marins.find((m) => m.id === id))
      .filter((m): m is Marin => !!m)
      .map((m) => ({ m, cert: lastCertificate(visites, m.id) }))
      .filter((x): x is { m: Marin; cert: Visite } => !!x.cert)
      .map((x) => ({ ...x, etat: evaluateCertStatus(x.cert.stcw.validJusquau) }))
      .filter((x) => x.etat.status !== "valide")
      .sort((p, q) => p.etat.joursRestants - q.etat.joursRestants);
  }, [effectif, allRoles, a.entreprise, marins, visites]);

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

      <SectionStatistiques
        titre="Statistiques et performance de la flotte"
        description="Conformité de l’effectif, alertes d’expiration et indicateurs prédictifs de votre compagnie."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Marins rattachés" value={effectif.length} icon={Users} />
          <StatCard
            label="Aptes aujourd'hui"
            value={conformes}
            icon={CheckCircle2}
            tone="success"
          />
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
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <CircularGauge
              value={effectif.length ? (conformes / effectif.length) * 100 : 0}
              label="Aptitude globale de l'effectif"
              size={108}
            />
            <div className="w-full flex-1">
              <ConformityGauge niveaux={effectif.map((m) => niveauConformite(m, visites))} />
            </div>
          </div>
        </Panel>

        <div>
          <TableauArmateur entreprise={a.entreprise} />
        </div>
      </SectionStatistiques>

      <ArmateurOutils />

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
          roles.map((r, i) => (
            <details key={r.id} open={i === 0} className="group/acc rounded-lg border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <Ship className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold text-primary">{r.navire}</div>
                  <div className="text-xs text-muted-foreground">
                    Appareillage du {formatDate(r.appareillage)} · {r.membres.length} marin(s)
                  </div>
                </div>
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-open/acc:rotate-180" />
              </summary>
              <div className="space-y-3 border-t p-3">
                <RoleCard r={r} marins={marins} visites={visites} onEdit={() => setEdit(r)} />
                <DebarquementLot role={r} armateur={a} marins={marins} />
              </div>
            </details>
          ))
        )}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Vue flotte"
          description="Navires de la compagnie, équipage à bord et conformité du dernier rôle déclaré"
          bodyClassName="p-0"
        >
          <ul className="stagger divide-y">
            {flotte.map((n) => {
              const aBordLignes = marins.flatMap((m) =>
                (m.embarquements ?? [])
                  .filter(
                    (e) => e.navire === n.nom && (!e.debarquement || e.statut === "en_attente_validation"),
                  )
                  .map((e) => ({ m, e })),
              );
              const aBord = aBordLignes.map((x) => x.m);
              const dernier = [...roles]
                .filter((r) => r.navire === n.nom)
                .sort((x, y) => y.appareillage.localeCompare(x.appareillage))[0];
              const niveaux = dernier
                ? dernier.membres.map((x) => {
                    const m = marins.find((y) => y.id === x.marinId);
                    return m
                      ? niveauConformite(m, visites, new Date(`${dernier.appareillage}T12:00:00`))
                      : ("non_conforme" as const);
                  })
                : [];
              return (
                <li key={n.imo} className="group">
                  <details className="group/nav">
                  <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4 hover:bg-muted/40">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Ship className="sway size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-display font-semibold text-primary">{n.nom}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          IMO {n.imo}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {n.type} · {n.jauge.toLocaleString("fr-FR")} GT · pavillon {n.pavillon}
                      </div>
                      <div className="mt-1 text-xs">
                        {aBord.length ? (
                          <span>
                            <strong>{aBord.length}</strong> marin(s) à bord :{" "}
                            {aBord.map((m) => fullName(m)).join(", ")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Aucun embarquement en cours enregistré.
                          </span>
                        )}
                      </div>
                      {dernier && (
                        <div className="mt-2">
                          <ConformityGauge
                            compact
                            niveaux={niveaux}
                            sujet={`d'équipage (appareillage du ${formatDate(dernier.appareillage)})`}
                          />
                        </div>
                      )}
                    </div>
                    <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open/nav:rotate-180" />
                  </summary>
                  <div className="border-t bg-muted/20 px-5 py-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
                      Équipage en mer en temps réel ({aBordLignes.length})
                    </div>
                    {aBordLignes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Aucun marin à bord actuellement.</p>
                    ) : (
                      <ul className="space-y-2">
                        {aBordLignes.map(({ m, e }) => (
                          <li key={e.id} className="flex items-center gap-3 text-xs">
                            <MarinPhoto m={m} className="size-8 shrink-0 rounded-full text-[10px]" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-primary">{fullName(m)}</div>
                              <div className="truncate text-muted-foreground">
                                {e.fonction} · <span className="font-mono">{m.nip}</span> · à bord depuis le{" "}
                                {formatDate(e.embarquement)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{joursEmbarquement(e)} j</div>
                              {e.statut === "en_attente_validation" && (
                                <div className="text-[10px] italic text-muted-foreground">débarquement en attente DGMM</div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel
          title="Alertes d'expiration"
          description="Certificats expirés ou expirant sous 30 jours"
          bodyClassName="p-0"
        >
          {alertes.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Aucune alerte">
              Tous vos marins ont un certificat valide au-delà de 30 jours.
            </EmptyState>
          ) : (
            <ul className="stagger divide-y">
              {alertes.map(({ m, cert, etat }) => (
                <li
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3",
                    etat.status === "expire" && "glow-alert",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-primary">{fullName(m)}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.profession} · échéance {formatDate(cert.stcw.validJusquau)}
                    </div>
                  </div>
                  <StatusPill status={etat.status} label={libelleJours(etat.joursRestants)} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Effectif rattaché à la compagnie" className="mt-6" bodyClassName="p-0">
        {effectif.length === 0 ? (
          <EmptyState icon={Users} title="Aucun marin rattaché" />
        ) : (
          <ul className="stagger divide-y">
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

function lireJustificatif(file: File, maxBytes = 450_000): Promise<string> {
  if (file.size > maxBytes) {
    return Promise.reject(new Error("Fichier trop volumineux (450 Ko maximum)."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Le fichier n'a pas pu être lu."));
        return;
      }
      resolve(`${file.name}::${reader.result}`);
    };
    reader.onerror = () => reject(new Error("Impossible de lire ce fichier."));
    reader.readAsDataURL(file);
  });
}

function DebarquementLot({
  role,
  armateur,
  marins,
}: {
  role: RoleEquipage;
  armateur: ArmateurAccount;
  marins: Marin[];
}) {
  const lignes = role.membres.flatMap((membre) => {
    const marin = marins.find((m) => m.id === membre.marinId);
    const embarquement = marin?.embarquements?.find((e) => e.roleId === role.id);
    return marin && embarquement ? [{ marin, embarquement }] : [];
  });
  const aDebarquer = lignes.filter(
    ({ embarquement }) =>
      (embarquement.statut === "valide_dgmm" && !embarquement.debarquement) ||
      embarquement.statut === "rejete",
  );
  const attenteVisa = lignes.filter(
    ({ embarquement }) => embarquement.statut === "en_attente_validation",
  );
  const joursAttente = attenteVisa.reduce(
    (total, { embarquement }) => total + joursEmbarquement(embarquement),
    0,
  );
  const [selectionnes, setSelectionnes] = useState<number[]>([]);
  const [dateFin, setDateFin] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [preuves, setPreuves] = useState<Record<number, string>>({});
  const [preuveRole, setPreuveRole] = useState("");
  const [erreur, setErreur] = useState("");

  if (!lignes.length) return null;

  const charger = async (event: ChangeEvent<HTMLInputElement>, marinId?: number) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const value = await lireJustificatif(file);
      if (marinId === undefined) setPreuveRole(value);
      else setPreuves((current) => ({ ...current, [marinId]: value }));
      setErreur("");
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Impossible de joindre ce fichier.");
    }
  };

  const envoyer = () => {
    const choisies = aDebarquer.filter(({ marin }) => selectionnes.includes(marin.id));
    if (!choisies.length) return setErreur("Sélectionnez au moins un marin.");
    if (!dateFin) return setErreur("Indiquez la date et l'heure de fin de campagne.");
    if (!preuveRole) return setErreur("Joignez le rôle de désarmement global.");
    if (choisies.some(({ marin }) => !preuves[marin.id]))
      return setErreur("Ajoutez une photo du tampon pour chaque marin sélectionné.");
    try {
      soumettreDebarquementLot(
        armateur.entreprise,
        role.id,
        choisies.map(({ marin, embarquement }) => ({
          marinId: marin.id,
          embId: embarquement.id,
          dateDebarquement: dateFin,
          justificatif: preuves[marin.id]!,
        })),
        `Armateur ${armateur.entreprise}`,
        preuveRole,
      );
      setSelectionnes([]);
      setPreuves({});
      setErreur("");
      toast.success("Lot transmis à la DGMM", {
        description: `${choisies.length} marin(s) en attente du visa régalien.`,
      });
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Le lot n'a pas pu être transmis.");
    }
  };

  return (
    <Panel
      title="⚓ Débarquement collectif / Fin de campagne"
      description={`Rôle ${role.id} · ${role.navire}${role.navireImo ? ` · OMI ${role.navireImo}` : ""}. Les marins ne seront libérés qu'après le visa DGMM.`}
    >
      {attenteVisa.length > 0 && (
        <p className="mb-3 rounded-md bg-warning/10 px-3 py-2 text-sm font-medium text-warning">
          {attenteVisa.length} débarquement(s) en attente de visa DGMM · {joursAttente} jour(s)
          informatifs non encore crédités.
        </p>
      )}
      <div className="space-y-3">
        {aDebarquer.map(({ marin, embarquement }) => (
          <div
            key={embarquement.id}
            className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[auto_1fr_auto]"
          >
            <input
              type="checkbox"
              aria-label={`Sélectionner ${fullName(marin)} pour le débarquement`}
              checked={selectionnes.includes(marin.id)}
              onChange={(event) =>
                setSelectionnes((current) =>
                  event.target.checked
                    ? [...current, marin.id]
                    : current.filter((id) => id !== marin.id),
                )
              }
              className="mt-1 size-4 accent-primary"
            />
            <div className="min-w-0">
              <div className="font-semibold text-primary">{fullName(marin)}</div>
              <div className="text-xs text-muted-foreground">
                {marin.nip} · {embarquement.fonction} · embarqué le{" "}
                {formatDate(embarquement.embarquement)}
              </div>
              {embarquement.statut === "rejete" && (
                <p className="mt-1 text-xs text-destructive">
                  Rejet DGMM : {embarquement.motifRejet ?? "motif non renseigné"}
                </p>
              )}
              {preuves[marin.id] && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-success">
                  <FileCheck2 className="size-3.5" /> Justificatif joint
                </p>
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 self-start rounded-md border px-3 py-2 text-xs font-semibold hover:border-gold">
              <Camera className="size-4" /> Prendre photo / Scan du livret
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => void charger(event, marin.id)}
              />
            </label>
          </div>
        ))}
        {aDebarquer.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun marin disponible pour une nouvelle déclaration sur ce rôle.
          </p>
        )}
      </div>
      {aDebarquer.length > 0 && (
        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
          <Field label="Date & heure de fin (pour les marins cochés)" htmlFor={`fin-${role.id}`}>
            <input
              id={`fin-${role.id}`}
              type="datetime-local"
              value={dateFin}
              onChange={(event) => setDateFin(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Rôle de désarmement global" htmlFor={`role-debarquement-${role.id}`}>
            <input
              id={`role-debarquement-${role.id}`}
              type="file"
              accept="image/*,application/pdf"
              className={inputClass}
              onChange={(event) => void charger(event)}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {preuveRole
                ? "Document joint"
                : role.justificatifDebarquement
                  ? "Un document antérieur est enregistré; joindre le rôle de cette campagne."
                  : "Photo ou PDF · 450 Ko maximum"}
            </span>
          </Field>
        </div>
      )}
      {erreur && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {erreur}
        </p>
      )}
      {aDebarquer.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="gold"
            disabled={!selectionnes.length || !preuveRole}
            onClick={envoyer}
          >
            🚀 Transmettre le lot à la DGMM
          </Button>
        </div>
      )}
    </Panel>
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
  const visitesRole = useVisites();
  const flotte = useMemo(
    () => getArmateur(a.entreprise)?.navires ?? a.navires ?? [],
    [a.entreprise, a.navires],
  );
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
  const navireRole = flotte.find((n) => n.nom === navire);

  const ajouter = () => {
    const m = marins.find((x) => x.nip.toUpperCase() === nip.trim().toUpperCase());
    if (!m) return setErr("Aucun marin enregistré avec ce NIP.");
    if (membres.some((x) => x.marinId === m.id)) return setErr("Ce marin figure déjà au rôle.");
    // Règle DGMM : embarquement d'un marin apte uniquement (certificat valide à la date d'appareillage).
    const { st } = aptitudeAu(m, visitesRole, date);
    if (st !== "valide" && st !== "expire_bientot")
      return setErr(
        `Embarquement refusé : ${fullName(m)} n'a pas de certificat médical STCW valide au ${formatDate(date)}.`,
      );
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
                placeholder="GAB-2024-001284"
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
              const inaptes = membres
                .map((x) => marins.find((y) => y.id === x.marinId))
                .filter((m) => {
                  const { st } = aptitudeAu(m, visitesRole, date);
                  return st !== "valide" && st !== "expire_bientot";
                });
              if (inaptes.length) {
                setErr(
                  `Appareillage impossible : ${inaptes.map((m) => fullName(m)).join(", ")} ${inaptes.length > 1 ? "n'ont" : "n'a"} pas de certificat valide au ${formatDate(date)}. Retirez-les du rôle ou faites renouveler leur visite.`,
                );
                return;
              }
              saveRole(
                {
                  ...(role ? { id: role.id } : {}),
                  armateur: a.entreprise,
                  navire,
                  navireImo: navireRole?.imo,
                  typeNavire: navireRole?.type,
                  jauge: navireRole?.jauge,
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
