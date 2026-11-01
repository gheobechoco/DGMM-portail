import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Ship } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader, Panel, StatCard, selectClass } from "@/components/dgmm/Page";
import { RoleCard, aptitudeAu } from "@/components/dgmm/RoleCard";
import { Aide } from "@/components/dgmm/Aide";
import { useMarins, useRoles, useVisites } from "@/lib/dgmm/store";

export const Route = createFileRoute("/espace/equipages")({
  head: () => ({ meta: [{ title: "Rôles d'équipage — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="roles.lecture">{() => <Equipages />}</RequirePerm>,
});

/** Consultation (lecture seule) des rôles d'équipage déclarés par les armateurs. */
function Equipages() {
  const roles = useRoles();
  const marins = useMarins();
  const visites = useVisites();
  const [armateur, setArmateur] = useState("");
  const liste = useMemo(
    () =>
      [...roles]
        .filter((r) => !armateur || r.armateur === armateur)
        .sort((a, b) => a.appareillage.localeCompare(b.appareillage)),
    [roles, armateur],
  );
  const conforme = (r: (typeof roles)[number]) =>
    r.membres.length > 0 &&
    r.membres.every((x) => {
      const { st } = aptitudeAu(
        marins.find((m) => m.id === x.marinId),
        visites,
        r.appareillage,
      );
      return st === "valide" || st === "expire_bientot";
    });
  const nbOk = liste.filter(conforme).length;

  return (
    <>
      <PageHeader
        eyebrow="Contrôle des armements"
        title="Rôles d'équipage"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            Rôles déclarés par les armateurs, avec la conformité médicale à la date d'appareillage{" "}
            <Aide terme="role" />
          </span>
        }
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Eye className="size-3.5" /> Lecture seule
          </span>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Rôles déclarés" value={liste.length} icon={Ship} />
        <StatCard label="Appareillages conformes" value={nbOk} icon={CheckCircle2} tone="success" />
        <StatCard
          label="Rôles non conformes"
          value={liste.length - nbOk}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>
      <Panel
        bodyClassName="space-y-4"
        actions={
          <label>
            <span className="sr-only">Armateur</span>
            <select
              className={selectClass}
              value={armateur}
              onChange={(e) => setArmateur(e.target.value)}
            >
              <option value="">Tous les armateurs</option>
              {[...new Set(roles.map((r) => r.armateur))].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        }
        title="Appareillages"
      >
        {liste.length === 0 ? (
          <EmptyState icon={Ship} title="Aucun rôle d'équipage déclaré" />
        ) : (
          <div className="stagger space-y-4">
            {liste.map((r) => (
              <div key={r.id}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-secondary">
                  {r.armateur}
                </div>
                <RoleCard r={r} marins={marins} visites={visites} />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
