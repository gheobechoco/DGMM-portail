import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Anchor,
  BellRing,
  BookOpenCheck,
  Download,
  Lock,
  Mail,
  MessageSquare,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PublicShell } from "@/components/dgmm/PublicShell";
import { EmptyState, Panel, StatCard } from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import {
  EtatCertificatPill,
  MarinPhoto,
  StatutStepper,
  VerdictPill,
} from "@/components/dgmm/MarinBits";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { marinSession } from "@/lib/dgmm/auth";
import {
  etatCertificat,
  formatDate,
  fullName,
  joursEmbarquement,
  journaliser,
  lastCertificate,
  setAlertes,
  useMarins,
  useVisites,
  type Marin,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mon-espace/")({
  ssr: false,
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
  const demo = marins.filter((m) => m.livret).slice(0, 2);
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
    <PublicShell titre="Espace Marin">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border bg-card p-6 shadow-card">
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
                  placeholder="15101-2410-DGM"
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
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Agent de la DGMM ?{" "}
          <Link to="/" className="font-semibold text-primary hover:underline">
            Espace professionnel
          </Link>
        </p>
      </div>
    </PublicShell>
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
  const totalMer = emb.reduce((s, e) => s + joursEmbarquement(e), 0);
  const alertes = m.alertes ?? { sms: true, email: !!m.email };
  const j60 = cert ? new Date(new Date(cert.stcw.validJusquau).getTime() - 60 * DAY) : null;
  const j30 = cert ? new Date(new Date(cert.stcw.validJusquau).getTime() - 30 * DAY) : null;

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

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Mes certificats d'aptitude" className="lg:col-span-2" bodyClassName="p-0">
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

        <Panel
          title="Alertes d'expiration"
          description="Rappels avant l'échéance de votre certificat."
        >
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-4 text-muted-foreground" />
                <span>
                  SMS
                  <span className="block text-xs text-muted-foreground">
                    {m.tel1 || "aucun numéro"}
                  </span>
                </span>
              </span>
              <Switch
                checked={alertes.sms}
                disabled={!m.tel1}
                onCheckedChange={(c) => {
                  setAlertes(m.id, { ...alertes, sms: c });
                  toast.success(c ? "Alertes SMS activées" : "Alertes SMS désactivées");
                }}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <span>
                  E-mail
                  <span className="block text-xs text-muted-foreground">
                    {m.email || "aucune adresse"}
                  </span>
                </span>
              </span>
              <Switch
                checked={alertes.email}
                disabled={!m.email}
                onCheckedChange={(c) => {
                  setAlertes(m.id, { ...alertes, email: c });
                  toast.success(c ? "Alertes e-mail activées" : "Alertes e-mail désactivées");
                }}
              />
            </label>
            <div className="rounded-lg bg-muted p-3 text-xs">
              <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-primary">
                <BellRing className="size-3.5" /> Rappels programmés
              </div>
              {cert && j60 && j30 ? (
                <ul className="space-y-1 text-muted-foreground">
                  {[
                    ["J-60", j60],
                    ["J-30", j30],
                  ].map(([l, d]) => (
                    <li key={l as string} className="flex justify-between gap-2">
                      <span>{l as string}</span>
                      <span className="tabular-nums">
                        {(d as Date).toLocaleDateString("fr-FR")}
                        {(d as Date).getTime() < Date.now() ? " · envoyé" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  Aucun certificat en cours : pas de rappel programmé.
                </p>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Mes services en mer" className="mt-6" bodyClassName="p-0">
        {emb.length === 0 ? (
          <EmptyState icon={Anchor} title="Aucun embarquement inscrit" />
        ) : (
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
                {emb.map((e) => (
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
        )}
      </Panel>
    </>
  );
}
