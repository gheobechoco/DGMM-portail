import { Link, createFileRoute } from "@tanstack/react-router";
import { CarteSkeleton } from "@/components/dgmm/Skeletons";
import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  FileSignature,
  MapPinned,
  Siren,
  Anchor,
  BookOpenCheck,
  Download,
  Lock,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PublicShell } from "@/components/dgmm/PublicShell";
import { EcranConnexion } from "@/components/dgmm/Accueil";
import { EmptyState, Panel, StatCard } from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import {
  EtatCertificatPill,
  MarinPhoto,
  StatutStepper,
  VerdictPill,
} from "@/components/dgmm/MarinBits";
import { Button } from "@/components/ui/button";
import { marinSession } from "@/lib/dgmm/auth";
import {
  etatCertificat,
  formatDate,
  fullName,
  joursEmbarquement,
  journaliser,
  lastCertificate,
  useMarins,
  useVisites,
  type Marin,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";
import { JaugeCarriere, SectionStatistiques } from "@/components/dgmm/Statistiques";
import { AlertesExpirationMarin } from "@/components/dgmm/AlertesExpiration";
import { Pagination, usePagination } from "@/components/dgmm/Listes";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/mon-espace/")({
  ssr: false,
  pendingComponent: CarteSkeleton,
  head: () => ({
    meta: [
      { title: "Espace Marin — DGMM" },
      {
        name: "description",
        content:
          "Espace personnel des gens de mer : livret, certificat d'aptitude, services en mer et alertes d'expiration.",
      },
    ],
  }),
  component: EspaceMarin,
});

function EspaceMarin() {
  const id = marinSession.use();
  const marins = useMarins();
  const m = marins.find((x) => String(x.id) === id);
  if (!m) return <ConnexionMarin />;
  return (
    <PublicShell
      titre="Espace Marin"
      utilisateur={
        <>
          <div className="font-semibold">{fullName(m)}</div>
          <div className="font-mono text-primary-foreground/70">{m.nip}</div>
        </>
      }
      onLogout={() => marinSession.write(null)}
      actions={<AlertesExpirationMarin m={m} />}
    >
      <Tableau m={m} />
    </PublicShell>
  );
}

function ConnexionMarin() {
  const marins = useMarins();
  const [nip, setNip] = useState("");
  const [mdp, setMdp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const demo = ["HAPPI", "ATENDE"].flatMap((nom) => {
    const marin = marins.find((m) => m.nom === nom && m.livret);
    return marin ? [marin] : [];
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const m = marins.find((x) => x.nip.toUpperCase() === nip.trim().toUpperCase() && x.mdp === mdp);
    if (!m) {
      setErr("NIP ou mot de passe incorrect.");
      return;
    }
    marinSession.write(String(m.id));
    journaliser(`Marin ${m.nip}`, "Connexion à l'espace marin", `${m.nom} ${m.prenom} (${m.nip})`);
  };
  return (
    <EcranConnexion
      profil="marin"
      titre="Espace Marin"
      accroche="Votre dossier, votre certificat d'aptitude, votre fascicule et vos jours en mer, au même endroit."
    >
      <div>
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary">
              <Anchor className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold text-primary">Espace Marin</h1>
              <p className="text-sm text-muted-foreground">Connectez-vous avec votre NIP.</p>
            </div>
          </div>
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="nip" className="text-sm font-medium">
                NIP (numéro d'identification)
              </label>
              <div className="field-dgmm flex h-11 items-center gap-2 rounded-md bg-card px-3">
                <User className="size-4 text-muted-foreground" />
                <input
                  id="nip"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="GAB-2024-001284"
                  className="h-full flex-1 bg-transparent font-mono text-sm uppercase outline-none"
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="mdp" className="text-sm font-medium">
                Mot de passe
              </label>
              <div className="field-dgmm flex h-11 items-center gap-2 rounded-md bg-card px-3">
                <Lock className="size-4 text-muted-foreground" />
                <input
                  id="mdp"
                  type="password"
                  value={mdp}
                  onChange={(e) => setMdp(e.target.value)}
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
              Accéder à mon espace
            </Button>
          </form>
          {demo.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Comptes de démonstration
              </div>
              <div className="grid gap-2">
                {demo.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setNip(d.nip);
                      setMdp(d.mdp);
                      setErr(null);
                    }}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-left text-xs hover:border-gold"
                  >
                    <span className="font-semibold text-primary">{fullName(d)}</span>
                    <span className="font-mono text-muted-foreground">{d.nip}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Pas encore de dossier ?{" "}
          <Link to="/inscription/marin" className="font-semibold text-primary hover:underline">
            Pré-inscription
          </Link>
          <span className="mx-2">·</span>
          Agent de la DGMM ?{" "}
          <Link
            to="/"
            search={{ profil: "gestion" }}
            className="font-semibold text-primary hover:underline"
          >
            Espace professionnel
          </Link>
        </p>
      </div>
    </EcranConnexion>
  );
}

const DAY = 86400000;

function Tableau({ m }: { m: Marin }) {
  const visites = useVisites().filter((v) => v.marinId === m.id && v.signee);
  const cert = lastCertificate(visites, m.id);
  const jours = cert
    ? Math.ceil((new Date(cert.stcw.validJusquau + "T23:59:59").getTime() - Date.now()) / DAY)
    : null;
  const emb = [...(m.embarquements ?? [])].sort((a, b) =>
    b.embarquement.localeCompare(a.embarquement),
  );
  const totalMer = emb.reduce(
    (s, e) => s + (e.statut === "valide_dgmm" ? joursEmbarquement(e) : 0),
    0,
  );

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="flex flex-col gap-4 bg-navy-gradient p-5 text-primary-foreground sm:flex-row sm:items-center">
          <MarinPhoto
            m={m}
            className="h-24 w-[75px] shrink-0 rounded-lg border-2 border-gold text-xl"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-gold">Bienvenue</div>
            <h1 className="font-display text-2xl font-bold">{fullName(m)}</h1>
            <p className="text-sm text-primary-foreground/75">
              {m.profession}
              {m.entreprise && ` · ${m.entreprise}`}
            </p>
            <p className="mt-1 font-mono text-xs text-gold">
              NIP {m.nip}
              {m.livret && ` · Livret ${m.livret}`}
            </p>
          </div>
        </div>
        <div className="p-5">
          <StatutStepper m={m} examenRealise={visites.length > 0} />
        </div>
      </section>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {[
          { to: "/mon-espace/contrat" as const, icon: FileSignature, titre: "Mon contrat et ma paie", texte: "Signer, vérifier les versements, demander le rapatriement.", ton: "bg-primary/10 text-primary" },
          { to: "/mon-espace/trajet" as const, icon: MapPinned, titre: "Mon trajet en 3D", texte: "Domicile, lieu de travail et station, avec les temps de trajet.", ton: "bg-secondary/15 text-secondary" },
          { to: "/signaler" as const, icon: Siren, titre: "Signaler un problème", texte: "Danger à bord ou abus : à la Direction générale, anonymement si besoin.", ton: "bg-destructive/12 text-destructive" },
        ].map(({ to, icon: Icon, titre, texte, ton }) => (
          <Link key={to} to={to} className="carte-survol flex items-start gap-3 rounded-xl border bg-card p-4 shadow-card">
            <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${ton}`}><Icon className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-primary">{titre}</span>
              <span className="block text-sm text-muted-foreground">{texte}</span>
            </span>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {jours !== null && jours <= 60 && (
        <div
          role="alert"
          className={cn(
            "mb-6 flex items-start gap-3 rounded-xl border p-4",
            jours < 0
              ? "border-destructive/40 bg-destructive/8 text-destructive"
              : jours <= 30
                ? "border-destructive/30 bg-destructive/5"
                : "border-warning/40 bg-warning/8",
          )}
        >
          <AlertTriangle
            className={cn(
              "mt-0.5 size-5 shrink-0",
              jours <= 30 ? "text-destructive" : "text-warning",
            )}
          />
          <div className="text-sm">
            <div className="font-semibold text-primary">
              {jours < 0
                ? "Votre certificat d'aptitude a expiré"
                : `Votre certificat d'aptitude expire dans ${jours} jour${jours > 1 ? "s" : ""}`}
            </div>
            <div className="text-muted-foreground">
              Prenez rendez-vous au centre médical agréé (Polyclinique EDELWEISS) pour une nouvelle
              visite d'aptitude.
            </div>
          </div>
        </div>
      )}

      <SectionStatistiques
        titre="Mes statistiques maritimes"
        description="Suivi personnel de vos titres, de votre service en mer et de votre progression STCW."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Certificat d'aptitude"
            value={jours === null ? "—" : jours < 0 ? "Expiré" : `${jours} j`}
            icon={Stethoscope}
            tone={jours === null || jours < 0 ? "danger" : jours <= 60 ? "warning" : "success"}
            hint={
              cert ? `échéance le ${formatDate(cert.stcw.validJusquau)}` : "aucun certificat valide"
            }
          />
          <StatCard
            label="Livret maritime"
            value={m.livret || "—"}
            icon={BookOpenCheck}
            hint={m.livret ? "délivré" : "en cours d'instruction"}
          />
          <StatCard
            label="Service en mer"
            value={`${totalMer} j`}
            icon={Anchor}
            hint={`${emb.length} embarquement(s)`}
          />
          <StatCard
            label="Visa DGMM"
            value={
              m.validationAdmin === "validee"
                ? "Accordé"
                : m.validationAdmin === "rejetee"
                  ? "Refusé"
                  : "En attente"
            }
            icon={ShieldCheck}
            tone={m.validationAdmin === "validee" ? "success" : "warning"}
          />
        </div>

        <div>
          <JaugeCarriere marin={m} />
        </div>
      </SectionStatistiques>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Mes certificats d'aptitude" className="lg:col-span-3" bodyClassName="p-0">
          {visites.length === 0 ? (
            <EmptyState icon={Stethoscope} title="Aucun certificat">
              Votre visite médicale d'aptitude n'a pas encore été réalisée.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {visites
                .sort((a, b) => b.traiteLe.localeCompare(a.traiteLe))
                .map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm font-semibold text-primary">{v.numero}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(v.traiteLe)} · {v.signataire}
                      </div>
                    </div>
                    <VerdictPill verdict={v.stcw.verdict} />
                    <EtatCertificatPill etat={etatCertificat(v)} />
                    <Button asChild size="sm" variant="outline">
                      <Link to="/mon-espace/certificat/$id" params={{ id: String(v.id) }}>
                        <Download /> PDF
                      </Link>
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </Panel>

      </div>

      <ServicesEnMer emb={emb} totalMer={totalMer} />
    </>
  );
}

type Embarquement = NonNullable<Marin["embarquements"]>[number];

/** « Mes services en mer » : liste dépliable et paginée (5 lignes par page). */
function ServicesEnMer({ emb, totalMer }: { emb: Embarquement[]; totalMer: number }) {
  const [ouvert, setOuvert] = useState(false);
  const { visibles, ...pagination } = usePagination(emb, 5);
  const aBord = emb.find((e) => !e.debarquement);
  return (
    <section className="mt-6 overflow-hidden rounded-xl border bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-controls="liste-services-mer"
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
          <Anchor className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-semibold text-primary">Mes services en mer</span>
          <span className="block truncate text-xs text-muted-foreground">
            {emb.length === 0
              ? "Aucun embarquement inscrit"
              : `${emb.length} embarquement(s) · ${totalMer} j validés DGMM${aBord ? ` · actuellement à bord du ${aBord.navire}` : ""}`}
          </span>
        </span>
        <span className="hidden text-xs font-semibold text-muted-foreground sm:inline">
          {ouvert ? "Masquer" : "Afficher"}
        </span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", ouvert && "rotate-180")}
          aria-hidden
        />
      </button>
      {ouvert && (
        <div id="liste-services-mer" className="border-t">
          {emb.length === 0 ? (
            <EmptyState icon={Anchor} title="Aucun embarquement inscrit" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-semibold">Navire</th>
                      <th className="px-3 py-2.5 font-semibold">Fonction</th>
                      <th className="px-3 py-2.5 font-semibold">Période</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Durée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visibles.map((e) => (
                      <tr key={e.id}>
                        <td className="px-5 py-2.5">
                          <div className="font-semibold text-primary">{e.navire}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.typeNavire} · {e.jauge.toLocaleString("fr-FR")} GT
                          </div>
                        </td>
                        <td className="px-3 py-2.5">{e.fonction}</td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {formatDate(e.embarquement)} →{" "}
                          {e.debarquement ? (
                            formatDate(e.debarquement)
                          ) : (
                            <StatusPill status="valide" label="À bord" />
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right font-semibold tabular-nums">
                          {joursEmbarquement(e)} j
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination {...pagination} className="border-t px-5 py-3" />
            </>
          )}
        </div>
      )}
    </section>
  );
}
