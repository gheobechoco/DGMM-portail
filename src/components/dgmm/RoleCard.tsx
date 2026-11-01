import { CheckCircle2, Ship, XCircle } from "lucide-react";
import { StatusPill } from "@/components/dgmm/Brand";
import { ConformityGauge } from "@/components/dgmm/ConformityGauge";
import { CircularGauge, CountUp } from "@/components/dgmm/Anim";
import { Button } from "@/components/ui/button";
import { certificateStatus, type CertStatus } from "@/lib/dgmm/rules";
import {
  formatDate,
  fullName,
  lastCertificate,
  niveauConformite,
  type Marin,
  type RoleEquipage,
  type Visite,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

/** Aptitude d'un marin à la date d'appareillage. */
export function aptitudeAu(
  m: Marin | undefined,
  visites: Visite[],
  date: string,
): { st: CertStatus; cert: Visite | undefined } {
  if (!m) return { st: "aucun", cert: undefined };
  const cert = lastCertificate(visites, m.id);
  return { st: certificateStatus(cert?.stcw.validJusquau, new Date(`${date}T12:00:00`)), cert };
}

/** Carte d'un rôle d'équipage avec sa conformité médicale à la date d'appareillage. */
export function RoleCard({
  r,
  marins,
  visites,
  onEdit,
}: {
  r: RoleEquipage;
  marins: Marin[];
  visites: Visite[];
  onEdit?: (() => void) | undefined;
}) {
  const rows = r.membres.map((x) => {
    const m = marins.find((y) => y.id === x.marinId);
    return { ...x, m, ...aptitudeAu(m, visites, r.appareillage) };
  });
  const bloquants = rows.filter((x) => x.st !== "valide" && x.st !== "expire_bientot");
  const ok = bloquants.length === 0 && rows.length > 0;
  const passe = r.appareillage < new Date().toISOString().slice(0, 10);
  return (
    <article
      className={cn(
        "group overflow-hidden rounded-lg border",
        !ok && rows.length > 0 && "glow-alert",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 px-4 py-3",
          ok ? "bg-success/8" : "bg-destructive/6",
        )}
      >
        <Ship className="sway size-5 text-primary" />
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
        {onEdit && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            Modifier
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4 border-b px-4 py-3">
        <CircularGauge
          value={rows.length ? ((rows.length - bloquants.length) / rows.length) * 100 : 0}
          label={`Aptitude de l'équipage de ${r.navire} à l'appareillage`}
          size={64}
          stroke={7}
        >
          <span className="font-display text-sm font-bold text-primary">
            <CountUp
              value={
                rows.length ? Math.round(((rows.length - bloquants.length) / rows.length) * 100) : 0
              }
            />
            %
          </span>
        </CircularGauge>
        <div className="min-w-0 flex-1">
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
          <tbody className="stagger divide-y">
            {rows.map((x) => (
              <tr
                key={x.marinId}
                className={cn(x.st !== "valide" && x.st !== "expire_bientot" && "glow-alert")}
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
