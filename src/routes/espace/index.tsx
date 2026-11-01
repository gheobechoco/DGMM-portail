import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  FilePlus2,
  HeartPulse,
  ShieldAlert,
  Stethoscope,
  UserPlus,
  Users,
  Flag,
  MapPin,
  Ship,
} from "lucide-react";
import { useSession, type Account } from "@/lib/dgmm/auth";
import { ARMATEURS, TOUS_NAVIRES, TYPES_FLOTTE } from "@/lib/dgmm/maritime";
import { ageBracket, can, isOverdueRegistration, profil } from "@/lib/dgmm/rules";
import {
  VERDICT_LABELS,
  age,
  formatDate,
  fullName,
  lastCertificate,
  marinCertStatus,
  useMarins,
  useVisites,
  type Marin,
  type Verdict,
  type Visite,
} from "@/lib/dgmm/store";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/espace/")({
  component: Accueil,
});

function Accueil() {
  const session = useSession();
  if (!session) return null;
  return profil(session.role) === "medical" ? (
    <MedicalDashboard session={session} />
  ) : (
    <PilotageDashboard session={session} />
  );
}

/* ---------- Éléments partagés ---------- */

const BRACKETS = ["Moins de 25 ans", "25 à 34 ans", "35 à 44 ans", "45 à 54 ans", "55 ans et plus"];
const DAY = 86400000;

function greeting(nom: string) {
  return nom.startsWith("Dr") ? nom : nom.split(" ").slice(0, 2).join(" ");
}
function today() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-card">
      <div className="font-semibold text-primary">{label}</div>
      <div className="text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{payload[0]!.value}</span>{" "}
        {unit}
      </div>
    </div>
  );
}

/** Barres horizontales, une seule série (pas de légende : le titre la nomme). */
function HBars({
  data,
  unit,
  color,
  label,
}: {
  data: { nom: string; n: number }[];
  unit: string;
  color: string;
  label: string;
}) {
  const height = Math.max(160, data.length * 34 + 30);
  return (
    <div
      style={{ height }}
      role="img"
      aria-label={`${label} : ${data.map((d) => `${d.nom} ${d.n}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            type="category"
            dataKey="nom"
            width={118}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip unit={unit} />} />
          <Bar dataKey="n" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function countBy(marins: Marin[], key: (m: Marin) => string, limit = 8) {
  const map = new Map<string, number>();
  marins.forEach((m) => {
    const k = key(m) || "Non renseigné";
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  const rows = [...map.entries()].map(([nom, n]) => ({ nom, n })).sort((a, b) => b.n - a.n);
  if (rows.length <= limit) return rows;
  const rest = rows.slice(limit - 1).reduce((s, r) => s + r.n, 0);
  return [...rows.slice(0, limit - 1), { nom: "Autres", n: rest }];
}

const seeAll =
  "inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary hover:underline";

function RenewTable({
  rows,
}: {
  rows: { m: Marin; st: "expire" | "expire_bientot"; cert?: Visite | undefined }[];
}) {
  if (!rows.length)
    return <EmptyState icon={BookOpenCheck} title="Aucun certificat à renouveler" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-5 py-2.5 font-semibold">Marin</th>
            <th className="px-3 py-2.5 font-semibold">Fonction</th>
            <th className="px-3 py-2.5 font-semibold">Certificat</th>
            <th className="px-3 py-2.5 font-semibold">Échéance</th>
            <th className="px-5 py-2.5 font-semibold">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(({ m, st, cert }) => (
            <tr key={m.id} className="hover:bg-muted/40">
              <td className="px-5 py-2.5">
                <Link
                  to="/espace/marins/$id"
                  params={{ id: String(m.id) }}
                  className="font-semibold text-primary hover:underline"
                >
                  {fullName(m)}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{m.profession}</td>
              <td className="px-3 py-2.5 font-mono text-xs">{cert?.numero}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatDate(cert?.stcw.validJusquau)}</td>
              <td className="px-5 py-2.5">
                <StatusPill status={st} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renewals(marins: Marin[], visites: Visite[]) {
  return marins
    .map((m) => ({ m, st: marinCertStatus(visites, m.id), cert: lastCertificate(visites, m.id) }))
    .filter(
      (c): c is { m: Marin; st: "expire" | "expire_bientot"; cert: Visite | undefined } =>
        c.st === "expire_bientot" || c.st === "expire",
    )
    .sort((a, b) =>
      (a.cert?.stcw.validJusquau ?? "").localeCompare(b.cert?.stcw.validJusquau ?? ""),
    );
}

/* ---------- 2A. Tableau de bord de pilotage (DGMM & RH Marine) ---------- */

function PilotageDashboard({ session }: { session: Account }) {
  const marins = useMarins();
  const visites = useVisites();
  const rh = session.role === "rh_marine";

  const d = useMemo(() => {
    const now = new Date();
    const souffrance = marins
      .filter(
        (m) =>
          (m.validationAdmin === "en_attente" ||
            (m.validationAdmin !== "rejetee" && m.validationMedicale === "en_attente")) &&
          isOverdueRegistration(m.creeLe, now),
      )
      .sort((a, b) => a.creeLe.localeCompare(b.creeLe));
    const renew = renewals(marins, visites);
    return {
      total: marins.length,
      valides: marins.filter(
        (m) => m.validationAdmin === "validee" && m.validationMedicale === "validee",
      ).length,
      attenteAdmin: marins.filter((m) => m.validationAdmin === "en_attente").length,
      livrets: marins.filter((m) => m.livret).length,
      souffrance,
      renew,
      bientot: renew.filter((r) => r.st === "expire_bientot").length,
      ages: BRACKETS.map((b) => ({
        nom: b,
        n: marins.filter((m) => ageBracket(age(m)) === b).length,
      })),
      professions: countBy(marins, (m) => m.profession),
      compagnies: countBy(marins, (m) => m.entreprise),
    };
  }, [marins, visites]);

  return (
    <>
      <PageHeader
        eyebrow={rh ? "Tableau de bord · RH Marine" : "Tableau de bord de pilotage"}
        title={`Bonjour, ${greeting(session.nom)}`}
        subtitle={`Situation des gens de mer — ${today()}.`}
        actions={
          can(session.role, "marins.creer") && (
            <Button asChild variant="gold">
              <Link to="/espace/marins/nouveau">
                <UserPlus /> Enrôler un marin
              </Link>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Gens de mer enregistrés" value={d.total} icon={Users} />
        <StatCard
          label="Dossiers validés"
          value={d.valides}
          icon={CheckCircle2}
          tone="success"
          hint="administratif + médical"
        />
        {rh ? (
          <StatCard
            label="À valider (administratif)"
            value={d.attenteAdmin}
            icon={ShieldAlert}
            tone="warning"
          />
        ) : (
          <StatCard label="Livrets maritimes émis" value={d.livrets} icon={BookOpenCheck} />
        )}
        <StatCard
          label="Certificats < 30 jours"
          value={d.bientot}
          icon={CalendarClock}
          tone="gold"
          hint="arrivent à expiration"
        />
        <StatCard
          label="En souffrance > 7 jours"
          value={d.souffrance.length}
          icon={Clock}
          tone="danger"
          hint="inscriptions en attente"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="Dossiers en souffrance"
          description="Inscriptions en attente depuis plus de 7 jours"
          className="lg:col-span-2"
          bodyClassName="p-0"
          actions={
            <Link to="/espace/marins" search={{ admin: "en_attente" }} className={seeAll}>
              Tout voir <ArrowRight className="size-3" />
            </Link>
          }
        >
          {d.souffrance.length === 0 ? (
            <EmptyState icon={Clock} title="Aucun dossier en retard">
              Toutes les inscriptions sont traitées dans les délais.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {d.souffrance.slice(0, 6).map((m) => (
                <li key={m.id}>
                  <Link
                    to="/espace/marins/$id"
                    params={{ id: String(m.id) }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50"
                  >
                    <AlertTriangle className="size-4 shrink-0 text-warning" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-primary">
                        {fullName(m)}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.profession} · NIP {m.nip}
                      </div>
                    </div>
                    <div className="hidden gap-1.5 sm:flex">
                      {m.validationAdmin === "en_attente" && (
                        <StatusPill status="en_attente" label="Administratif" />
                      )}
                      {m.validationMedicale === "en_attente" && (
                        <StatusPill status="en_attente" label="Médical" />
                      )}
                    </div>
                    <span className="w-14 text-right text-xs font-semibold tabular-nums text-warning">
                      {Math.floor((Date.now() - new Date(m.creeLe).getTime()) / DAY)} j
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Répartition par tranche d'âge" description="Gens de mer enregistrés">
          <HBars data={d.ages} unit="marins" color="var(--chart-1)" label="Répartition par âge" />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Répartition par profession">
          <HBars
            data={d.professions}
            unit="marins"
            color="var(--chart-1)"
            label="Répartition par profession"
          />
        </Panel>
        <Panel title="Répartition par compagnie maritime">
          <HBars
            data={d.compagnies}
            unit="marins"
            color="var(--chart-2)"
            label="Répartition par compagnie"
          />
        </Panel>
      </div>

      <Panel
        title="Alertes : certificats d'aptitude"
        description="Expirés ou expirant dans les 30 prochains jours"
        className="mt-6"
        bodyClassName="p-0"
      >
        <RenewTable rows={d.renew} />
      </Panel>

      {!rh && <PilotageNational marins={marins} />}
    </>
  );
}

/* ---------- Pilotage national (DGMM) ---------- */

function PilotageNational({ marins }: { marins: Marin[] }) {
  const d = useMemo(() => {
    const actifs = marins.filter(
      (m) => m.validationAdmin === "validee" && m.validationMedicale === "validee",
    );
    const embarques = marins.filter((m) => (m.embarquements ?? []).some((e) => !e.debarquement));
    const nationaux = marins.filter((m) => m.nationalite === "Gabonaise").length;
    const nat = countBy(
      marins.filter((m) => m.nationalite !== "Gabonaise"),
      (m) => m.nationalite,
    );
    const flotte = TYPES_FLOTTE.map((t) => ({
      nom: t,
      n: TOUS_NAVIRES.filter((n) => n.type === t).length,
    })).filter((x) => x.n);
    const marinsParType = TYPES_FLOTTE.map((t) => ({
      nom: t,
      n: marins.filter((m) => ARMATEURS.find((a) => a.nom === m.entreprise)?.type === t).length,
    })).filter((x) => x.n);
    const villes = [...new Set(ARMATEURS.map((a) => a.ville))].map((v) => ({
      ville: v,
      armateurs: ARMATEURS.filter((a) => a.ville === v),
    }));
    return {
      actifs,
      embarques,
      nationaux,
      nat,
      flotte,
      marinsParType,
      villes,
      jauge: TOUS_NAVIRES.reduce((s, n) => s + n.jauge, 0),
    };
  }, [marins]);
  const total = Math.max(1, marins.length);
  const pctNat = Math.round((d.nationaux / total) * 100);

  return (
    <section className="mt-10" aria-labelledby="pilotage-national">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <h2
          id="pilotage-national"
          className="font-display text-sm font-bold uppercase tracking-[0.16em] text-secondary"
        >
          Pilotage national · Marine marchande gabonaise
        </h2>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Effectif actif (temps réel)"
          value={d.actifs.length}
          icon={Users}
          hint={`sur ${marins.length} gens de mer enregistrés`}
        />
        <StatCard
          label="Actuellement embarqués"
          value={d.embarques.length}
          icon={Ship}
          tone="success"
        />
        <StatCard
          label="Taux de gabonisation"
          value={`${pctNat} %`}
          icon={Flag}
          tone="gold"
          hint={`${d.nationaux} marins nationaux`}
        />
        <StatCard
          label="Flotte suivie"
          value={TOUS_NAVIRES.length}
          icon={Ship}
          hint={`${ARMATEURS.length} armateurs · ${d.jauge.toLocaleString("fr-FR")} GT`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="Gabonisation des équipages"
          description="Marins nationaux et marins sous contrat étranger"
        >
          <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
            <div className="bg-secondary" style={{ width: `${pctNat}%` }} />
            <div className="bg-gold" style={{ width: `${100 - pctNat}%` }} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-sm bg-secondary" /> Nationaux
              </dt>
              <dd className="font-display text-xl font-bold tabular-nums text-primary">
                {pctNat} %
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-sm bg-gold" /> Étrangers
              </dt>
              <dd className="font-display text-xl font-bold tabular-nums text-primary">
                {100 - pctNat} %
              </dd>
            </div>
          </dl>
          <ul className="mt-4 space-y-1.5 border-t pt-3 text-sm">
            {d.nat.map((x) => (
              <li key={x.nom} className="flex justify-between">
                <span className="text-muted-foreground">{x.nom}</span>
                <span className="font-semibold tabular-nums">{x.n}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Typologie de la flotte" description="Navires par segment d'activité">
          <HBars
            data={d.flotte}
            unit="navires"
            color="var(--chart-1)"
            label="Typologie de la flotte"
          />
        </Panel>
        <Panel title="Gens de mer par segment" description="Selon l'activité de leur armateur">
          <HBars
            data={d.marinsParType}
            unit="marins"
            color="var(--chart-2)"
            label="Marins par segment"
          />
        </Panel>
      </div>

      <Panel title="Répartition géographique des armateurs" className="mt-6" bodyClassName="p-0">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {d.villes.map((v) => (
            <div key={v.ville} className="p-5">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-secondary" />
                <span className="font-display font-semibold text-primary">{v.ville}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {v.armateurs.length} armateur{v.armateurs.length > 1 ? "s" : ""}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {v.armateurs.map((a) => (
                  <li key={a.nom} className="text-sm">
                    <div className="font-medium">{a.nom}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.type} · {a.navires.length} navire(s) · siège : {a.pays}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

/* ---------- 2B. Tableau de bord médical ---------- */

const VERDICT_STYLE: Record<
  Exclude<Verdict, "">,
  { bar: string; pill: "validee" | "en_attente" | "expire" | "rejetee" }
> = {
  apte: { bar: "bg-success", pill: "validee" },
  apte_restrictions: { bar: "bg-warning", pill: "en_attente" },
  inapte_temporaire: { bar: "bg-[oklch(0.62_0.17_45)]", pill: "expire" },
  inapte: { bar: "bg-destructive", pill: "rejetee" },
};

function MedicalDashboard({ session }: { session: Account }) {
  const marins = useMarins();
  const visites = useVisites();
  const byId = useMemo(() => new Map(marins.map((m) => [m.id, m])), [marins]);
  const canSaisir = can(session.role, "visites.saisir");

  const d = useMemo(() => {
    const now = new Date();
    const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const duJour = visites
      .filter((v) => new Date(v.creeLe).getTime() >= debutJour)
      .sort((a, b) => b.creeLe.localeCompare(a.creeLe));
    const brouillons = visites.filter((v) => !v.signee);
    const fileActive = marins
      .filter((m) => m.validationAdmin !== "rejetee" && m.validationMedicale === "en_attente")
      .sort((a, b) => a.creeLe.localeCompare(b.creeLe));
    const renew = renewals(marins, visites);
    // Verdict de la dernière visite signée (non révoquée) de chaque marin.
    const counts: Record<Exclude<Verdict, "">, number> = {
      apte: 0,
      apte_restrictions: 0,
      inapte_temporaire: 0,
      inapte: 0,
    };
    marins.forEach((m) => {
      const last = visites
        .filter((v) => v.marinId === m.id && v.signee && !v.revoquee && v.stcw.verdict)
        .sort((a, b) => b.traiteLe.localeCompare(a.traiteLe))[0];
      if (last && last.stcw.verdict) counts[last.stcw.verdict]++;
    });
    return {
      duJour,
      brouillons,
      fileActive,
      renew,
      counts,
      expires: renew.filter((r) => r.st === "expire").length,
    };
  }, [marins, visites]);

  const totalVerdicts = Math.max(
    1,
    Object.values(d.counts).reduce((a, b) => a + b, 0),
  );

  return (
    <>
      <PageHeader
        eyebrow="Tableau de bord médical · Centre agréé"
        title={`Bonjour, ${greeting(session.nom)}`}
        subtitle={`Activité d'aptitude médicale STCW — ${today()}.`}
        actions={
          canSaisir && (
            <Button asChild variant="gold">
              <Link to="/espace/visites/nouvelle">
                <FilePlus2 /> Nouvelle visite
              </Link>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Visites du jour"
          value={d.duJour.length}
          icon={Stethoscope}
          hint={`${d.brouillons.length} brouillon(s) à signer`}
        />
        <StatCard
          label="File active"
          value={d.fileActive.length}
          icon={Users}
          tone="warning"
          hint="marins convoqués à examiner"
        />
        <StatCard
          label="Certificats à renouveler"
          value={d.renew.length - d.expires}
          icon={CalendarClock}
          tone="gold"
          hint="sous 30 jours"
        />
        <StatCard
          label="Urgences : certificats expirés"
          value={d.expires}
          icon={HeartPulse}
          tone="danger"
          hint="marins non aptes à embarquer"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="File active"
          description="Marins enrôlés convoqués pour la visite d'aptitude STCW"
          className="lg:col-span-2"
          bodyClassName="p-0"
          actions={
            <Link to="/espace/marins" search={{ medical: "en_attente" }} className={seeAll}>
              Tout voir <ArrowRight className="size-3" />
            </Link>
          }
        >
          {d.fileActive.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="File active vide">
              Aucun marin en attente de visite.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {d.fileActive.slice(0, 7).map((m) => {
                const jours = Math.floor((Date.now() - new Date(m.creeLe).getTime()) / DAY);
                const draft = d.brouillons.find((v) => v.marinId === m.id);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                      {m.nom[0]}
                      {m.prenom[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/espace/marins/$id"
                        params={{ id: String(m.id) }}
                        className="block truncate text-sm font-semibold text-primary hover:underline"
                      >
                        {fullName(m)}
                      </Link>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.profession} · {m.entreprise || "sans armateur"} ·{" "}
                        <span className={jours > 7 ? "font-semibold text-warning" : ""}>
                          en attente depuis {jours} j
                        </span>
                      </div>
                    </div>
                    {canSaisir &&
                      (draft ? (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/espace/visites/modifier/$id" params={{ id: String(draft.id) }}>
                            Reprendre
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="secondary">
                          <Link to="/espace/visites/nouvelle" search={{ marin: m.id }}>
                            Examiner
                          </Link>
                        </Button>
                      ))}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Statistiques d'aptitude"
          description="Dernière décision signée de chaque marin"
        >
          <div
            className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
            aria-hidden
          >
            {(Object.keys(VERDICT_STYLE) as Exclude<Verdict, "">[]).map((k) =>
              d.counts[k] ? (
                <div
                  key={k}
                  className={VERDICT_STYLE[k].bar}
                  style={{ width: `${(d.counts[k] / totalVerdicts) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-4 space-y-2.5">
            {(Object.keys(VERDICT_STYLE) as Exclude<Verdict, "">[]).map((k) => (
              <li key={k} className="flex items-center justify-between gap-2 text-sm">
                <StatusPill status={VERDICT_STYLE[k].pill} label={VERDICT_LABELS[k]} />
                <span className="tabular-nums">
                  <span className="font-semibold text-primary">{d.counts[k]}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({Math.round((d.counts[k] / totalVerdicts) * 100)} %)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="Visites du jour"
          bodyClassName="p-0"
          actions={
            <Link to="/espace/visites" className={seeAll}>
              Toutes les visites <ArrowRight className="size-3" />
            </Link>
          }
        >
          {d.duJour.length === 0 ? (
            <EmptyState icon={Stethoscope} title="Aucune visite aujourd'hui" />
          ) : (
            <ul className="divide-y">
              {d.duJour.map((v) => (
                <li key={v.id}>
                  <Link
                    to="/espace/visites/$id"
                    params={{ id: String(v.id) }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40"
                  >
                    <span className="w-12 text-xs tabular-nums text-muted-foreground">
                      {new Date(v.creeLe).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {fullName(byId.get(v.marinId))}
                    </span>
                    {v.signee ? (
                      <StatusPill status="validee" label="Signée" />
                    ) : (
                      <StatusPill status="en_attente" label="Brouillon" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title="Certificats à renouveler & urgences"
          className="lg:col-span-2"
          bodyClassName="p-0"
        >
          <RenewTable rows={d.renew} />
        </Panel>
      </div>
    </>
  );
}
