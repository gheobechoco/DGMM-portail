import { cn } from "@/lib/utils";
import { ETAT_NAVIRE, type EtatNavire } from "@/lib/dgmm/navires";

/** Pastille de l'état de sécurité d'un navire (certificats et visa). */
export function PastilleEtat({ etat, jours }: { etat: EtatNavire; jours?: number | undefined }) {
  const e = ETAT_NAVIRE[etat];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", e.ton)}>
      <span className={cn("size-2 rounded-full", e.point, etat === "attente_visa" && "animate-pulse")} />
      {e.libelle}{etat === "a_surveiller" && jours !== undefined ? ` (${jours} j)` : ""}
    </span>
  );
}

