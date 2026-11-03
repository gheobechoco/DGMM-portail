import { cn } from "@/lib/utils";
import { NIVEAUX, STATUT_ALERTE, type Alerte, type Niveau } from "@/lib/dgmm/alertes";

export function PastilleNiveau({ n }: { n: Niveau }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ color: NIVEAUX[n].couleur, background: `color-mix(in oklab, ${NIVEAUX[n].couleur} 14%, transparent)` }}>
      <span className={cn("size-2 rounded-full", n === "rouge" && "animate-pulse")} style={{ background: NIVEAUX[n].couleur }} />
      {n === "vert" ? "Vert" : n === "orange" ? "Orange" : "Rouge"} · {NIVEAUX[n].titre}
    </span>
  );
}

export function PastilleStatut({ a }: { a: Alerte }) {
  const style = a.statut === "cloturee" ? "bg-muted text-muted-foreground" : a.statut === "recue" ? "bg-warning/15 text-warning" : "bg-secondary/15 text-secondary";
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", style)}>{STATUT_ALERTE[a.statut]}</span>;
}

const QUI: Record<string, string> = { declarant: "Déclarant", dgmm: "Direction générale", inspection: "Inspection du travail maritime", syndicat: "Délégués syndicaux" };

/** Fil des échanges ; vue du déclarant : son message à droite. */
export function FilAlerte({ a, vueDeclarant }: { a: Alerte; vueDeclarant?: boolean | undefined }) {
  if (!a.echanges.length) return <p className="text-sm text-muted-foreground">Aucune réponse pour l'instant.</p>;
  return (
    <ol className="space-y-3">
      {a.echanges.map((e, i) => {
        const moi = vueDeclarant ? e.de === "declarant" : e.de !== "declarant";
        return (
          <li key={i} className={cn("max-w-[85%] rounded-xl px-4 py-2.5 text-sm", moi ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
            <div className={cn("text-[11px] font-semibold", moi ? "text-gold" : "text-secondary")}>{e.de === "declarant" ? (a.anonyme ? "Déclarant anonyme" : "Déclarant") : `${QUI[e.de]} · ${e.auteur}`}</div>
            <p>{e.texte}</p>
            <div className={cn("mt-1 text-[11px]", moi ? "text-primary-foreground/70" : "text-muted-foreground")}>{new Date(e.le).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
          </li>
        );
      })}
    </ol>
  );
}
