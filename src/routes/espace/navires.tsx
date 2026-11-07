import { Aide } from "@/components/dgmm/Aide";
import { LienStatistiques } from "@/components/dgmm/Statistiques";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, FileCheck2, Ship, ShieldX, XCircle } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/dgmm/Page";
import { InspectionNavireForm } from "@/components/dgmm/InspectionNavire";
import { PastilleEtat } from "@/components/dgmm/NavireBits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { can } from "@/lib/dgmm/rules";
import type { Account } from "@/lib/dgmm/auth";
import { useInscriptions } from "@/lib/dgmm/inscriptions";
import {
  CERTIFICATS_NAVIRE,
  etatNavire,
  joursAvant,
  registreNavires,
  sceauIntact,
  useInspections,
  viserInspection,
  type EtatNavire,
  type FicheNavire,
  type Inspection,
} from "@/lib/dgmm/navires";

export const Route = createFileRoute("/espace/navires")({
  validateSearch: (s: Record<string, unknown>): { navire?: string | undefined; inspecter?: boolean | undefined } => ({
    navire: typeof s["navire"] === "string" ? s["navire"] : undefined,
    inspecter: s["inspecter"] === true || s["inspecter"] === "true" ? true : undefined,
  }),
  head: () => ({ meta: [{ title: "Navires et certificats de sécurité — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="navires">{(s) => <Navires session={s} />}</RequirePerm>,
});

const fr = (d: string) => new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR");
type Filtre = "tous" | "attente_visa" | "a_surveiller" | "bloques";

function Navires({ session }: { session: Account }) {
  const { navire: initial, inspecter } = Route.useSearch();
  const { armateurs } = useInscriptions();
  const inspections = useInspections();
  const navires = useMemo(() => registreNavires(armateurs), [armateurs]);
  const lignes = navires.map((n) => ({ n, ...etatNavire(inspections, n.id) }));
  const [filtre, setFiltre] = useState<Filtre>(initial ? "tous" : can(session.role, "navires.viser") ? "attente_visa" : "tous");
  const [choisi, setChoisi] = useState<string | null>(initial ?? null);
  // Arrivée depuis une alerte : le navire est choisi et, pour l'inspecteur, le formulaire est ouvert.
  const [saisie, setSaisie] = useState(!!inspecter && !!initial && can(session.role, "navires.inspection"));
  const compte = (f: (e: EtatNavire) => boolean) => lignes.filter((l) => f(l.etat)).length;
  const bloque = (e: EtatNavire) => e === "expire" || e === "visa_refuse" || e === "non_inspecte";
  const visibles = lignes.filter((l) => filtre === "tous" || (filtre === "attente_visa" ? l.etat === "attente_visa" : filtre === "a_surveiller" ? l.etat === "a_surveiller" : bloque(l.etat)));
  const sel = lignes.find((l) => l.n.id === choisi);
  const inspecteur = can(session.role, "navires.inspection");

  return (
    <>
      <PageHeader
        eyebrow="Sécurité de la navigation"
        title="Navires et certificats de sécurité"
        subtitle={<span className="inline-flex flex-wrap items-center gap-1">L'inspecteur contrôle à bord et scelle les certificats ; le responsable RH vise. Un navire n'est autorisé à appareiller qu'après ce double verrouillage. <Aide terme="doubleVerrou" /></span>}
      />
      <div className="mb-6"><LienStatistiques theme="navires" texte="États des navires, renouvellements et certificats les plus courts" /></div>
      <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Filtrer les navires">
        {([["attente_visa", "En attente de visa"], ["a_surveiller", "À renouveler"], ["bloques", "Interdits"], ["tous", "Tous"]] as const).map(([f, l]) => (
          <button key={f} type="button" role="radio" aria-checked={filtre === f} onClick={() => setFiltre(f)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", filtre === f ? "border-gold bg-gold text-gold-foreground" : "hover:border-gold")}>{l}</button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Panel bodyClassName="p-0">
          {visibles.length === 0 ? (
            <EmptyState icon={Ship} title="Aucun navire">Aucun navire ne correspond à ce filtre.</EmptyState>
          ) : (
            <ul className="divide-y">
              {visibles.map((l) => (
                <li key={l.n.id}>
                  <button type="button" onClick={() => { setChoisi(l.n.id); setSaisie(false); }} aria-current={choisi === l.n.id} className={cn("selection-carte w-full px-5 py-3 text-left hover:bg-muted/50", choisi === l.n.id && "bg-primary/5")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-primary">{l.n.nom}</span>
                      <span className="font-mono text-xs text-muted-foreground">{l.n.imo ? `OMI ${l.n.imo}` : "sans OMI"}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{l.n.armateur} · {l.n.type} · {l.n.jauge} GT</div>
                    <div className="mt-1.5"><PastilleEtat etat={l.etat} jours={l.jours} /></div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div>
          {!sel ? (
            <Panel><p className="text-sm text-muted-foreground">Choisissez un navire pour voir ses certificats, son historique et les actions possibles.</p></Panel>
          ) : saisie ? (
            <InspectionNavireForm navire={sel.n} inspecteur={session.nom} onFini={() => setSaisie(false)} />
          ) : (
            <FicheNavireDgmm l={sel} session={session} inspections={inspections.filter((i) => i.navireId === sel.n.id)} onInspecter={inspecteur ? () => setSaisie(true) : undefined} />
          )}
        </div>
      </div>
    </>
  );
}

function FicheNavireDgmm({
  l, session, inspections, onInspecter,
}: {
  l: { n: FicheNavire } & ReturnType<typeof etatNavire>;
  session: Account;
  inspections: Inspection[];
  onInspecter?: (() => void) | undefined;
}) {
  const [motif, setMotif] = useState("");
  const [refus, setRefus] = useState(false);
  const d = l.derniere;
  const peutViser = can(session.role, "navires.viser") && d?.statut === "en_attente_visa";
  const intact = d ? sceauIntact(d) : true;
  return (
    <div className="space-y-5">
      <Panel
        title={<span className="flex flex-wrap items-center gap-2">{l.n.nom} <PastilleEtat etat={l.etat} jours={l.jours} /></span>}
        description={`${l.n.armateur} · ${l.n.type} · ${l.n.jauge} GT${l.n.portAttache ? ` · port d'attache ${l.n.portAttache}` : ""}${l.n.indicatif ? ` · indicatif ${l.n.indicatif}` : ""}`}
        actions={onInspecter && <Button size="sm" variant="gold" onClick={onInspecter}><ClipboardCheck /> Nouvelle inspection</Button>}
      >
        {!d ? (
          <p className="text-sm text-muted-foreground">Aucune inspection enregistrée : le navire n'est pas autorisé à appareiller.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>Inspection <span className="font-mono">{d.numero}</span> du {fr(d.date)} à {d.port}</span>
              <span>Inspecteur : {d.inspecteur}</span>
              <span>Co-signée par : {d.commandant}</span>
              <span className="inline-flex items-center gap-1"><FileCheck2 className="size-3" />{d.rapport}</span>
              {d.visePar && <span>{d.statut === "vise" ? "Visée" : "Visa refusé"} par {d.visePar} le {fr(d.viseLe!)}</span>}
            </div>
            {!intact && <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">Le contenu ne correspond plus au sceau de l'inspecteur : visa impossible.</p>}
            {d.motifRefus && <p className="mb-3 text-xs text-destructive">Motif du refus : {d.motifRefus}</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Certificat</th><th>Constat</th><th>Effet</th><th>Échéance</th><th>Reste</th></tr></thead>
                <tbody>
                  {CERTIFICATS_NAVIRE.map((c) => {
                    const s = d.certificats[c.id];
                    const j = s?.echeance ? joursAvant(s.echeance) : null;
                    return (
                      <tr key={c.id} className={cn("border-b last:border-0", l.critique?.id === c.id && "bg-warning/8")}>
                        <td className="py-2"><div className="font-medium">{c.titre}</div>{s?.variante && <div className="text-[11px] text-muted-foreground">{s.variante}</div>}</td>
                        <td>{s?.conforme ? <span className="text-success">Conforme</span> : <span className="text-destructive">Non conforme</span>}</td>
                        <td>{s?.effet ? fr(s.effet) : "—"}</td>
                        <td>{s?.echeance ? fr(s.echeance) : c.nature === "escale" ? "à chaque escale" : c.nature === "registre" ? "vérifié" : "—"}</td>
                        <td className={cn("font-semibold", j !== null && (j < 0 ? "text-destructive" : j <= 30 ? "text-warning" : "text-success"))}>{j === null ? "" : j < 0 ? "expiré" : `${j} j`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {l.critique && <p className="mt-3 text-xs text-muted-foreground">Date de surveillance : {fr(l.critique.echeance)} ({l.critique.titre}). Une alerte apparaît chez l'armateur à 30 jours de l'échéance.</p>}
          </>
        )}
      </Panel>

      {peutViser && (
        <Panel title="Visa du responsable RH" description="Votre appréciation finale fait passer le navire au vert, ou renvoie à une nouvelle inspection.">
          {refus ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-60 flex-1 text-xs font-medium">
                Motif du refus
                <input id="motif-visa" className="field-dgmm mt-1 h-9 w-full rounded-md bg-card px-3 text-sm" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. scan illisible du certificat radio" />
              </label>
              <Button size="sm" variant="ghost" onClick={() => setRefus(false)}>Annuler</Button>
              <Button size="sm" variant="destructive" disabled={!motif.trim()} onClick={() => { viserInspection(d!.id, session.nom, "visa_refuse", motif.trim()); toast.success("Visa refusé"); setRefus(false); }}>Confirmer le refus</Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setRefus(true); setMotif(""); }}><XCircle /> Refuser le visa</Button>
              <Button variant="secondary" disabled={!intact} onClick={() => { viserInspection(d!.id, session.nom, "vise"); toast.success("Visa apposé", { description: "Appareillage autorisé." }); }}><CheckCircle2 /> Viser — autoriser l'appareillage</Button>
            </div>
          )}
        </Panel>
      )}

      {inspections.length > 1 && (
        <Panel title="Historique des inspections">
          <ul className="space-y-1 text-sm">
            {inspections.sort((a, b) => b.scelleLe.localeCompare(a.scelleLe)).map((i) => (
              <li key={i.id} className="flex flex-wrap gap-x-3 text-xs"><span className="font-mono">{i.numero}</span><span>{fr(i.date)} · {i.port}</span><span>{i.inspecteur}</span><span className="font-semibold">{i.statut === "vise" ? "visée" : i.statut === "visa_refuse" ? "visa refusé" : "en attente de visa"}</span></li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
