import { CheckCircle2, Clock, FilePen, XCircle, type LucideIcon } from "lucide-react";
import type { Niveau } from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

const NIVEAUX: { k: Niveau; label: string; bar: string; text: string; icon: LucideIcon }[] = [
  {
    k: "conforme",
    label: "Conformes",
    bar: "bg-success",
    text: "text-success",
    icon: CheckCircle2,
  },
  {
    k: "alerte",
    label: "À renouveler < 60 j",
    bar: "bg-warning",
    text: "text-warning",
    icon: Clock,
  },
  {
    k: "non_conforme",
    label: "Expirés / inaptes",
    bar: "bg-destructive",
    text: "text-destructive",
    icon: XCircle,
  },
  {
    k: "brouillon",
    label: "Visite en cours",
    bar: "bg-muted-foreground/60",
    text: "text-muted-foreground",
    icon: FilePen,
  },
];

/**
 * Mini-jauge de santé réglementaire : part d'un effectif en règle (certificat valide),
 * avec le détail Émeraude / Ambre / Rubis / Ardoise.
 */
export function ConformityGauge({
  niveaux,
  sujet = "d'équipage",
  compact,
}: {
  niveaux: Niveau[];
  sujet?: string;
  compact?: boolean | undefined;
}) {
  const total = niveaux.length;
  const n = (k: Niveau) => niveaux.filter((x) => x === k).length;
  const enRegle = n("conforme") + n("alerte");
  const pct = total ? Math.round((enRegle / total) * 100) : 0;
  const alerte = n("alerte");
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-sm">
          <span
            className={cn(
              "font-display text-2xl font-bold tabular-nums",
              pct >= 90 ? "text-success" : pct >= 60 ? "text-warning" : "text-destructive",
            )}
          >
            {pct} %
          </span>{" "}
          <span className="font-medium text-foreground">{sujet} en règle</span>
          {alerte > 0 && (
            <span className="text-muted-foreground">
              {" "}
              ({alerte} marin{alerte > 1 ? "s" : ""} avec visite expirant sous 60 jours)
            </span>
          )}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {enRegle}/{total}
        </span>
      </div>
      <div
        className="mt-2 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${pct} % ${sujet} en règle`}
      >
        {NIVEAUX.map((x) =>
          n(x.k) ? (
            <div
              key={x.k}
              className={x.bar}
              style={{ width: `${(n(x.k) / Math.max(1, total)) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      {!compact && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {NIVEAUX.map((x) => {
            const Icon = x.icon;
            return (
              <li key={x.k} className="inline-flex items-center gap-1.5">
                <Icon className={cn("size-3.5", x.text)} aria-hidden />
                <span className="text-muted-foreground">{x.label}</span>
                <span className="font-semibold tabular-nums text-foreground">{n(x.k)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
