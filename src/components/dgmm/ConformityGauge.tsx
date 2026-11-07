import { CheckCircle2, Clock, FilePen, XCircle, type LucideIcon } from "lucide-react";
import type { Niveau } from "@/lib/dgmm/store";
import { CountUp } from "@/components/dgmm/Anim";
import { cn } from "@/lib/utils";

const NIVEAUX: { k: Niveau; label: string; bar: string; text: string; icon: LucideIcon }[] = [
  {
    k: "conforme",
    label: "Valides",
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
 * Mini-jauge de santé réglementaire, dite en clair : « 11 marins sur 24 ont un
 * certificat médical valide », avec le détail Valides / À renouveler / Expirés / En cours.
 */
export function ConformityGauge({
  niveaux,
  contexte,
  compact,
}: {
  niveaux: Niveau[];
  /** Précision affichée après la phrase (ex. « appareillage du 12/11/2026 »). */
  contexte?: string | undefined;
  compact?: boolean | undefined;
}) {
  const total = niveaux.length;
  const n = (k: Niveau) => niveaux.filter((x) => x === k).length;
  const enRegle = n("conforme") + n("alerte");
  const pct = total ? Math.round((enRegle / total) * 100) : 0;
  const alerte = n("alerte");
  const ton = pct >= 90 ? "text-success" : pct >= 60 ? "text-warning" : "text-destructive";
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-snug">
          <span className={cn("font-display text-lg font-bold tabular-nums", ton)}>
            <CountUp value={enRegle} /> marin{enRegle > 1 ? "s" : ""} sur {total}
          </span>{" "}
          <span className="text-foreground">
            {enRegle > 1 ? "ont" : "a"} un certificat médical valide
          </span>
          {contexte && <span className="text-muted-foreground"> · {contexte}</span>}
          {alerte > 0 && (
            <span className="block text-xs text-muted-foreground">
              dont {alerte} à renouveler dans moins de 60 jours
            </span>
          )}
        </p>
        <span
          className={cn("shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums", ton)}
          title="Part des marins avec un certificat médical valide"
        >
          {pct} %
        </span>
      </div>
      <div
        className="mt-2 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${enRegle} marins sur ${total} avec un certificat médical valide (${pct} %)`}
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
