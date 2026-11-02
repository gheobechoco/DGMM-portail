import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Sigles officiels : chaque lettre reste en place et le reste du mot se déplie
 * au survol (ou au focus clavier), puis tout se replie quand on s'en va.
 */
export const SIGLES = {
  DGMM: {
    titre: "Direction Générale de la Marine Marchande",
    parts: [["D", "irection "], ["G", "énérale de la "], ["M", "arine "], ["M", "archande"]],
  },
  GDM: { titre: "Gens De Mer", parts: [["G", "ens "], ["D", "e "], ["M", "er"]] },
  STCW: {
    titre: "Standards of Training, Certification and Watchkeeping (normes de formation des gens de mer)",
    parts: [["S", "tandards of "], ["T", "raining, "], ["C", "ertification and "], ["W", "atchkeeping"]],
  },
  PSC: {
    titre: "Port State Control (contrôle par l'État du port)",
    parts: [["P", "ort "], ["S", "tate "], ["C", "ontrol"]],
  },
  AVURNAV: {
    titre: "AVis URgent aux NAVigateurs",
    parts: [["AV", "is "], ["UR", "gent aux "], ["NAV", "igateurs"]],
  },
  NIP: {
    titre: "Numéro d'Identification Personnel",
    parts: [["N", "uméro d'"], ["I", "dentification "], ["P", "ersonnel"]],
  },
} as const;

export type SigleId = keyof typeof SIGLES;

export function Sigle({ s, className }: { s: SigleId; className?: string | undefined }) {
  const d = SIGLES[s];
  return (
    <abbr title={d.titre} tabIndex={0} className={cn("sigle", className)}>
      {d.parts.map(([lettre, suite], i) => (
        <span key={i} className="sigle-mot">
          <span className="sigle-l">{lettre}</span>
          <span className="sigle-r" style={{ "--i": i } as CSSProperties} aria-hidden>
            <span>{suite}</span>
          </span>
        </span>
      ))}
    </abbr>
  );
}
