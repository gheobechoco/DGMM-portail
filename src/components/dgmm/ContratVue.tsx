import { CheckCircle2, Clock, FileSignature, Lock, ShieldAlert, XCircle } from "lucide-react";
import { DgmmLogo } from "@/components/dgmm/Logo";
import { cn } from "@/lib/utils";
import {
  STATUT_LIBELLE,
  clauses,
  echeancier,
  formatFcfa,
  libelleMois,
  sceauIntact,
  statut,
  type Contrat,
  type Controle,
  type StatutCEM,
} from "@/lib/dgmm/contrats";

const STYLE: Record<StatutCEM, string> = {
  attente_marin: "bg-warning/15 text-warning",
  attente_dgmm: "bg-warning/15 text-warning",
  actif: "bg-success/12 text-success",
  refuse_marin: "bg-destructive/12 text-destructive",
  refuse_dgmm: "bg-destructive/12 text-destructive",
  termine: "bg-muted text-muted-foreground",
};

export function StatutContrat({ c }: { c: Contrat }) {
  const s = statut(c);
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", STYLE[s])}>{STATUT_LIBELLE[s]}</span>;
}

const dt = (d?: string) => (d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

/** Les trois signatures, dans l'ordre obligatoire. */
export function Signatures({ c }: { c: Contrat }) {
  const etapes = [
    { titre: "Armateur", sig: c.signatures.armateur },
    { titre: "Marin", sig: c.signatures.marin },
    { titre: "Inspecteur DGMM", sig: c.signatures.dgmm },
  ];
  const premierManquant = etapes.findIndex((e) => !e.sig);
  return (
    <ol className="flex items-start" aria-label="Signatures du contrat">
      {etapes.map((e, i) => {
        const fait = !!e.sig;
        const refuse = !fait && !!c.motifRefus && i === premierManquant;
        return (
          <li key={e.titre} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span className="absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 overflow-hidden bg-border" aria-hidden>
                {fait && <span className="stepper-ligne block h-full bg-secondary" style={{ animationDelay: `${(i - 1) * 260}ms` }} />}
              </span>
            )}
            <span
              style={{ animationDelay: `${i * 260}ms` }}
              className={cn(
                "stepper-pastille relative z-10 grid size-8 place-items-center rounded-full border-2",
                fait && "border-secondary bg-secondary text-secondary-foreground",
                refuse && "border-destructive bg-destructive text-destructive-foreground",
                !fait && !refuse && i === premierManquant && "stepper-encours border-gold bg-gold/20 text-primary",
                !fait && !refuse && i !== premierManquant && "border-border bg-card text-muted-foreground",
              )}
            >
              {fait ? <CheckCircle2 className="size-4" /> : refuse ? <XCircle className="size-4" /> : <FileSignature className="size-4" />}
            </span>
            <span className="mt-1.5 text-xs font-semibold">{e.titre}</span>
            <span className="text-[11px] text-muted-foreground">{e.sig ? `${e.sig.par} · ${dt(e.sig.le)}` : refuse ? "Refus" : "En attente"}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ListeControles({ controles }: { controles: Controle[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {controles.map((k) => (
        <li key={k.libelle} className="flex items-start gap-2">
          {k.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
          <span>
            <span className={k.ok ? "" : "font-semibold text-destructive"}>{k.libelle}</span>
            <span className="block text-xs text-muted-foreground">{k.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Le contrat lui-même : document officiel, toujours en clair. */
export function ContratDocument({ c }: { c: Contrat }) {
  const intact = sceauIntact(c);
  return (
    <article className="print-sheet rounded-xl border bg-card shadow-card">
      <header className="flex items-center gap-4 border-b p-5">
        <DgmmLogo className="size-14 shrink-0" habille={false} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">République gabonaise · Marine marchande</div>
          <h3 className="font-display text-lg font-bold text-primary">Contrat d'engagement maritime</h3>
          <div className="font-mono text-xs text-muted-foreground">{c.numero} · modèle officiel DGMM</div>
        </div>
        <StatutContrat c={c} />
      </header>
      <div className="grid gap-4 border-b p-5 text-sm sm:grid-cols-4">
        <div><div className="text-xs text-muted-foreground">Salaire de base</div><div className="font-display text-lg font-bold text-primary">{formatFcfa(c.salaireBase)}</div></div>
        <div><div className="text-xs text-muted-foreground">Prime de risque</div><div className="font-semibold">{formatFcfa(c.primeRisque)}</div></div>
        <div><div className="text-xs text-muted-foreground">Nourriture + logement</div><div className="font-semibold">{formatFcfa(c.indemniteNourriture + c.indemniteLogement)}</div></div>
        <div><div className="text-xs text-muted-foreground">Période</div><div className="font-semibold">{new Date(c.dateDebut).toLocaleDateString("fr-FR")} → {new Date(c.dateFin).toLocaleDateString("fr-FR")}</div></div>
      </div>
      <ol className="space-y-3 p-5 text-sm">
        {clauses(c).map((k) => (
          <li key={k.titre}>
            <div className="font-semibold text-primary">{k.titre}</div>
            <p className="text-muted-foreground">{k.texte}</p>
          </li>
        ))}
      </ol>
      <div className="border-t p-5"><Signatures c={c} /></div>
      {c.motifRefus && <div className="border-t bg-destructive/8 px-5 py-3 text-sm text-destructive">Motif du refus : {c.motifRefus}</div>}
      {c.sceau && (
        <footer className={cn("flex flex-wrap items-center gap-2 border-t px-5 py-3 text-xs", intact ? "text-success" : "text-destructive")}>
          {intact ? <Lock className="size-4" /> : <ShieldAlert className="size-4" />}
          {intact ? "Contrat scellé : contenu identique à celui validé par la DGMM." : "Attention : le contenu ne correspond plus au sceau posé par la DGMM."}
          <span className="font-mono text-muted-foreground">Sceau {c.sceau}</span>
        </footer>
      )}
    </article>
  );
}

/** Mois par mois : salaire et cotisations déclarés versés par l'armateur. */
export function Echeancier({ c, onDeclarer }: { c: Contrat; onDeclarer?: ((mois: string) => void) | undefined }) {
  const e = echeancier(c);
  if (!e.length) return <p className="text-sm text-muted-foreground">Le contrat n'a pas encore commencé.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {e.map((m) => (
        <li key={m.mois} className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm", m.etat === "retard" && "border-destructive/40 bg-destructive/8", m.etat === "verse" && "border-success/30 bg-success/8")}>
          <span className="capitalize">{libelleMois(m.mois)}</span>
          {m.etat === "verse" ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 className="size-3.5" /> Versé</span>
          ) : onDeclarer ? (
            <button type="button" onClick={() => onDeclarer(m.mois)} className="text-xs font-semibold text-primary hover:underline">Déclarer le versement</button>
          ) : (
            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", m.etat === "retard" ? "text-destructive" : "text-muted-foreground")}>
              {m.etat === "retard" ? <><XCircle className="size-3.5" /> Non déclaré</> : <><Clock className="size-3.5" /> En cours</>}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
