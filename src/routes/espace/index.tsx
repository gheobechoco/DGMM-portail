import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  ClipboardCheck,
  Clock,
  ShieldAlert,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import { useSession } from "@/lib/dgmm/auth";
import { ageBracket, can, isOverdueRegistration } from "@/lib/dgmm/rules";
import {
  age,
  formatDate,
  fullName,
  lastCertificate,
  marinCertStatus,
  useMarins,
  useVisites,
} from "@/lib/dgmm/store";
import { PageHeader, Panel, StatCard, EmptyState } from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/espace/")({
  component: Accueil,
});

function Accueil() {
  const session = useSession();
  const navigate = useNavigate();
  const allowed = session ? can(session.role, "dashboard") : false;
  useEffect(() => {
    if (session && !allowed) navigate({ to: "/espace/marins", replace: true });
  }, [session, allowed, navigate]);
  if (!session || !allowed) return null;
  return <Dashboard nom={session.nom} medical={session.role === "gestionnaire_medical"} />;
}

const BRACKETS = ["Moins de 25 ans", "25 à 34 ans", "35 à 44 ans", "45 à 54 ans", "55 ans et plus"];

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

function Dashboard({ nom, medical }: { nom: string; medical: boolean }) {
  const marins = useMarins();
  const visites = useVisites();

  const stats = useMemo(() => {
    const now = new Date();
    const attenteAdmin = marins.filter((m) => m.validationAdmin === "en_attente");
    const attenteMed = marins.filter((m) => m.validationMedicale === "en_attente");
    const souffrance = marins.filter(
      (m) =>
        (m.validationAdmin === "en_attente" || m.validationMedicale === "en_attente") &&
        isOverdueRegistration(m.creeLe, now),
    );
    const certs = marins.map((m) => ({
      m,
      st: marinCertStatus(visites, m.id, now),
      cert: lastCertificate(visites, m.id),
    }));
    const aRenouveler = certs
      .filter((c) => c.st === "expire_bientot" || c.st === "expire")
      .sort((a, b) =>
        (a.cert?.stcw.validJusquau ?? "").localeCompare(b.cert?.stcw.validJusquau ?? ""),
      );
    const counts = { valide: 0, expire_bientot: 0, expire: 0, aucun: 0 };
    certs.forEach((c) => counts[c.st]++);

    const months: { mois: string; inscriptions: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const n = marins.filter((m) => {
        const c = new Date(m.creeLe);
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
      }).length;
      months.push({
        mois: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
        inscriptions: n,
      });
    }
    const ages = BRACKETS.map((b) => ({
      tranche: b,
      marins: marins.filter((m) => ageBracket(age(m)) === b).length,
    }));
    return {
      total: marins.length,
      livrets: marins.filter((m) => m.livret).length,
      attenteAdmin,
      attenteMed,
      souffrance,
      aRenouveler,
      counts,
      months,
      ages,
      visites30: visites.filter(
        (v) => now.getTime() - new Date(v.creeLe).getTime() <= 30 * 86400000,
      ).length,
    };
  }, [marins, visites]);

  const prenom = nom
    .replace(/^Dr\s+/i, "Dr ")
    .split(" ")
    .slice(0, 2)
    .join(" ");
  const total = Math.max(1, stats.total);

  return (
    <>
      <PageHeader
        eyebrow="Tableau de bord"
        title={`Bonjour, ${prenom}`}
        subtitle={`Situation des gens de mer au ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.`}
        actions={
          <Button asChild variant="gold">
            <Link to="/espace/marins/nouveau">
              <UserPlus /> Enrôler un marin
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Gens de mer enregistrés"
          value={stats.total}
          icon={Users}
          hint={`${stats.livrets} livrets délivrés`}
        />
        {medical ? (
          <StatCard
            label="Aptitude médicale en attente"
            value={stats.attenteMed.length}
            icon={Stethoscope}
            tone="warning"
            hint={`${stats.visites30} visites ces 30 derniers jours`}
          />
        ) : (
          <StatCard
            label="Validation administrative"
            value={stats.attenteAdmin.length}
            icon={ClipboardCheck}
            tone="warning"
            hint="dossiers en attente"
          />
        )}
        <StatCard
          label="Certificats à renouveler"
          value={stats.counts.expire_bientot}
          icon={CalendarClock}
          tone="gold"
          hint="expirent sous 30 jours"
        />
        <StatCard
          label="Certificats expirés"
          value={stats.counts.expire}
          icon={ShieldAlert}
          tone="danger"
          hint="marins non aptes à embarquer"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="Inscriptions"
          description="Nouveaux dossiers sur les 6 derniers mois"
          className="lg:col-span-2"
        >
          <div
            className="h-56"
            role="img"
            aria-label={`Inscriptions par mois : ${stats.months.map((m) => `${m.mois} ${m.inscriptions}`).join(", ")}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.months}
                margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="mois"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={<ChartTooltip unit="inscriptions" />}
                />
                <Bar
                  dataKey="inscriptions"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Aptitude médicale STCW"
          description="Statut du dernier certificat de chaque marin"
        >
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {(["valide", "expire_bientot", "expire", "aucun"] as const).map((k) =>
              stats.counts[k] ? (
                <div
                  key={k}
                  style={{ width: `${(stats.counts[k] / total) * 100}%` }}
                  className={
                    k === "valide"
                      ? "bg-success"
                      : k === "expire_bientot"
                        ? "bg-warning"
                        : k === "expire"
                          ? "bg-destructive"
                          : "bg-muted-foreground/30"
                  }
                />
              ) : null,
            )}
          </div>
          <ul className="mt-4 space-y-2.5">
            {(["valide", "expire_bientot", "expire", "aucun"] as const).map((k) => (
              <li key={k} className="flex items-center justify-between gap-2 text-sm">
                <StatusPill status={k} label={k === "aucun" ? "Sans certificat" : undefined} />
                <span className="tabular-nums">
                  <span className="font-semibold text-primary">{stats.counts[k]}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({Math.round((stats.counts[k] / total) * 100)} %)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="Dossiers en souffrance"
          description="En attente depuis plus de 7 jours"
          className="lg:col-span-2"
          bodyClassName="p-0"
          actions={
            <Link
              to="/espace/marins"
              search={{ statut: "en_attente" }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Tout voir <ArrowRight className="size-3" />
            </Link>
          }
        >
          {stats.souffrance.length === 0 ? (
            <EmptyState icon={Clock} title="Aucun dossier en retard">
              Toutes les inscriptions sont traitées dans les délais.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {stats.souffrance.slice(0, 6).map((m) => {
                const jours = Math.floor((Date.now() - new Date(m.creeLe).getTime()) / 86400000);
                return (
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
                          <StatusPill status="en_attente" label="Admin." />
                        )}
                        {m.validationMedicale === "en_attente" && (
                          <StatusPill status="en_attente" label="Médical" />
                        )}
                      </div>
                      <span className="w-14 text-right text-xs font-semibold tabular-nums text-warning">
                        {jours} j
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Répartition par âge" description="Gens de mer enregistrés">
          <div
            className="h-56"
            role="img"
            aria-label={`Répartition par âge : ${stats.ages.map((a) => `${a.tranche} ${a.marins}`).join(", ")}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.ages}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                barCategoryGap="25%"
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
                  dataKey="tranche"
                  width={96}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={<ChartTooltip unit="marins" />}
                />
                <Bar dataKey="marins" fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel
        title="Certificats d'aptitude à renouveler"
        description="Certificats expirés ou expirant dans les 30 prochains jours"
        className="mt-6"
        bodyClassName="p-0"
      >
        {stats.aRenouveler.length === 0 ? (
          <EmptyState icon={BookOpenCheck} title="Aucun certificat à renouveler" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Marin</th>
                  <th className="px-3 py-2.5 font-semibold">Fonction</th>
                  <th className="px-3 py-2.5 font-semibold">Certificat</th>
                  <th className="px-3 py-2.5 font-semibold">Valide jusqu'au</th>
                  <th className="px-5 py-2.5 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.aRenouveler.map(({ m, st, cert }) => (
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
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatDate(cert?.stcw.validJusquau)}
                    </td>
                    <td className="px-5 py-2.5">
                      <StatusPill status={st} />
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
