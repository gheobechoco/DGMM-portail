import { Aide } from "@/components/dgmm/Aide";
import { LienStatistiques } from "@/components/dgmm/Statistiques";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, BadgeCheck, Building2, CheckCircle2, FileCheck2, FileX2, Inbox, Lock, Stethoscope, XCircle } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/dgmm/Page";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { can } from "@/lib/dgmm/rules";
import type { Account } from "@/lib/dgmm/auth";
import { VERDICT_LABELS, fullName, journaliser, useMarins, useVisites, type Marin, type Visite } from "@/lib/dgmm/store";
import {
  DUREE_AGREMENT_ANS,
  PIECES_AGREMENT,
  STATUT_DEMANDE,
  STRUCTURES_MEDICALES,
  assermenter,
  controlerPiece,
  etatAgrement,
  medecinDeVisite,
  piecesConformes,
  rejeterDemande,
  structure,
  transmettreAuDirecteur,
  useMedecins,
  type DemandeAgrement,
  type MedecinAgree,
  type PieceAgrement,
} from "@/lib/dgmm/medecins";

export const Route = createFileRoute("/espace/medecins")({
  head: () => ({ meta: [{ title: "Médecins des gens de mer — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="medecins">{(s) => <Medecins session={s} />}</RequirePerm>,
});

const fr = (d: string) => new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR");

function PastilleAgrement({ m }: { m: MedecinAgree }) {
  const { etat, jours } = etatAgrement(m);
  const ton = etat === "valide" ? "bg-success/12 text-success" : etat === "a_renouveler" ? "bg-warning/15 text-warning" : "bg-destructive/12 text-destructive";
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", ton)}>{etat === "valide" ? `Agréé jusqu'au ${fr(m.expireLe)}` : etat === "a_renouveler" ? `À renouveler (${jours} j)` : "Agrément expiré"}</span>;
}

/** Restrictions relevées lors d'une visite (vision des couleurs, aides visuelles…). */
function restrictions(v: Visite): string[] {
  const r: string[] = [];
  if (v.stcw.couleurs === "non") r.push("Vision des couleurs insuffisante (Ishihara) : fonctions pont exclues");
  if (v.stcw.aidesVisuelles === "oui") r.push("Port de verres correcteurs obligatoire");
  if (v.stcw.verdict === "apte_restrictions" && v.stcw.details) r.push(v.stcw.details);
  return r;
}

function Medecins({ session }: { session: Account }) {
  const { medecins, demandes } = useMedecins();
  const visites = useVisites();
  const marins = useMarins();
  const enCours = demandes.filter((d) => d.statut === "en_instruction" || d.statut === "attente_directeur");
  const aRenouveler = medecins.filter((m) => etatAgrement(m).etat !== "valide").length;
  return (
    <>
      <PageHeader
        eyebrow="Santé des gens de mer"
        title="Médecins des gens de mer"
        subtitle={<span className="inline-flex flex-wrap items-center gap-1">Médecins assermentés par la DGMM, structures de rattachement, marins examinés et demandes d'agrément. <Aide terme="agrement" /></span>}
      />
      <div className="mb-6"><LienStatistiques theme="medecins" texte="Médecins agréés, échéances, demandes et visites par structure" /></div>
      <Tabs defaultValue={enCours.length && (can(session.role, "medecins.assermenter") || can(session.role, "medecins.instruire")) ? "demandes" : "medecins"}>
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="medecins"><Stethoscope className="mr-1.5 size-4" /> Médecins agréés</TabsTrigger>
          <TabsTrigger value="structures"><Building2 className="mr-1.5 size-4" /> Marins par structure</TabsTrigger>
          <TabsTrigger value="demandes"><Inbox className="mr-1.5 size-4" /> Demandes d'agrément{enCours.length ? ` (${enCours.length})` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="medecins"><Registre medecins={medecins} visites={visites} marins={marins} /></TabsContent>
        <TabsContent value="structures"><ParStructure medecins={medecins} visites={visites} marins={marins} /></TabsContent>
        <TabsContent value="demandes"><Demandes demandes={demandes} session={session} /></TabsContent>
      </Tabs>
    </>
  );
}

function Registre({ medecins, visites, marins }: { medecins: MedecinAgree[]; visites: Visite[]; marins: Marin[] }) {
  const [choisi, setChoisi] = useState<number | null>(medecins[0]?.id ?? null);
  const m = medecins.find((x) => x.id === choisi);
  const siennes = m ? visites.filter((v) => medecinDeVisite(v, medecins)?.id === m.id).sort((a, b) => b.creeLe.localeCompare(a.creeLe)) : [];
  const patients = new Set(siennes.map((v) => v.marinId)).size;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Panel bodyClassName="p-0">
        <ul className="divide-y">
          {medecins.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => setChoisi(x.id)} aria-current={choisi === x.id} className={cn("selection-carte w-full px-5 py-3 text-left hover:bg-muted/50", choisi === x.id && "bg-primary/5")}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-primary">{x.nomAffiche}</span><span className="font-mono text-xs text-muted-foreground">{x.numero}</span></div>
                <div className="mt-0.5 text-xs text-muted-foreground">{structure(x.structure)?.nom ?? x.structure} · {structure(x.structure)?.ville}</div>
                <div className="mt-1.5"><PastilleAgrement m={x} /></div>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      {m && (
        <div className="space-y-5">
          <Panel title={<span className="flex flex-wrap items-center gap-2">{m.nomAffiche} <PastilleAgrement m={m} /></span>} description={`Agrément ${m.numero} · Ordre des médecins n° ${m.onmg} · ${structure(m.structure)?.nom ?? m.structure}`}>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div><div className="text-xs text-muted-foreground">Agréé le</div>{fr(m.agreeLe)}</div>
              <div><div className="text-xs text-muted-foreground">Expire le</div>{fr(m.expireLe)}</div>
              <div><div className="text-xs text-muted-foreground">Activité</div>{siennes.length} visite(s) · {patients} marin(s)</div>
            </div>
            <ul className="mt-3 space-y-0.5 text-xs text-muted-foreground">{m.historique.map((h, i) => <li key={i}>{fr(h.date)} — {h.action} ({h.par})</li>)}</ul>
          </Panel>
          <Panel title="Marins examinés" description="Historique des visites réalisées par ce médecin" bodyClassName="p-0">
            {siennes.length === 0 ? (
              <EmptyState icon={Stethoscope} title="Aucune visite">Aucune visite enregistrée pour ce médecin.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-5 py-2">Marin</th><th>Date</th><th>Verdict</th><th>Restrictions</th><th>Structure</th></tr></thead>
                  <tbody>
                    {siennes.map((v) => {
                      const marin = marins.find((x) => x.id === v.marinId);
                      const r = restrictions(v);
                      return (
                        <tr key={v.id} className="border-b last:border-0 align-top">
                          <td className="px-5 py-2">
                            {marin ? <Link to="/espace/marins/$id" params={{ id: String(marin.id) }} className="font-semibold text-primary hover:underline">{fullName(marin)}</Link> : "—"}
                            <div className="font-mono text-[11px] text-muted-foreground">{marin?.nip}</div>
                          </td>
                          <td className="py-2">{fr(v.creeLe)}<div className="text-[11px] text-muted-foreground">{v.signee ? "signée" : "brouillon"}</div></td>
                          <td className="py-2">{VERDICT_LABELS[v.stcw.verdict]}</td>
                          <td className="py-2 text-xs">{r.length ? r.join(" · ") : "—"}</td>
                          <td className="py-2 text-xs">{structure(v.structure ?? m.structure)?.nom}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function ParStructure({ medecins, visites, marins }: { medecins: MedecinAgree[]; visites: Visite[]; marins: Marin[] }) {
  // Chaque marin est rattaché à la structure de sa dernière visite.
  const derniere = new Map<number, Visite>();
  [...visites].sort((a, b) => a.creeLe.localeCompare(b.creeLe)).forEach((v) => derniere.set(v.marinId, v));
  const parCode = (code: string) =>
    [...derniere.values()].filter((v) => (v.structure ?? medecinDeVisite(v, medecins)?.structure) === code).map((v) => ({ v, marin: marins.find((x) => x.id === v.marinId), medecin: medecinDeVisite(v, medecins) }));
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {STRUCTURES_MEDICALES.map((s) => {
        const lignes = parCode(s.code);
        return (
          <Panel key={s.code} title={s.nom} description={`${s.ville} · ${medecins.filter((m) => m.structure === s.code).length} médecin(s) agréé(s) · ${lignes.length} marin(s) suivi(s)`}>
            {lignes.length === 0 ? <p className="text-sm text-muted-foreground">Aucun marin rattaché pour l'instant.</p> : (
              <ul className="divide-y text-sm">
                {lignes.map(({ v, marin, medecin }) => (
                  <li key={v.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
                    {marin ? <Link to="/espace/marins/$id" params={{ id: String(marin.id) }} className="font-semibold text-primary hover:underline">{fullName(marin)}</Link> : "—"}
                    <span className="text-xs text-muted-foreground">{marin?.profession}</span>
                    <span className="text-xs">{VERDICT_LABELS[v.stcw.verdict]} · {fr(v.creeLe)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{medecin?.nomAffiche ?? v.praticien}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

function Demandes({ demandes, session }: { demandes: DemandeAgrement[]; session: Account }) {
  const [choisi, setChoisi] = useState<number | null>(demandes.find((d) => d.statut === "en_instruction" || d.statut === "attente_directeur")?.id ?? demandes[0]?.id ?? null);
  const [motif, setMotif] = useState("");
  const [rejet, setRejet] = useState(false);
  const d = demandes.find((x) => x.id === choisi);
  if (!demandes.length) return <Panel><EmptyState icon={Inbox} title="Aucune demande">Les médecins déposent leur demande depuis la page publique « Agrément médecin des gens de mer ».</EmptyState></Panel>;
  const instruire = can(session.role, "medecins.instruire") && d?.statut === "en_instruction";
  const assermenterOk = can(session.role, "medecins.assermenter") && d?.statut === "attente_directeur";
  const peutRejeter = instruire || assermenterOk;
  const expiration = (() => { const x = new Date(); x.setFullYear(x.getFullYear() + DUREE_AGREMENT_ANS); return x.toLocaleDateString("fr-FR"); })();
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Panel bodyClassName="p-0">
        <ul className="divide-y">
          {demandes.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => { setChoisi(x.id); setRejet(false); }} aria-current={choisi === x.id} className={cn("selection-carte w-full px-5 py-3 text-left hover:bg-muted/50", choisi === x.id && "bg-primary/5")}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-primary">Dr {x.nom} {x.prenom}</span><span className="font-mono text-xs text-muted-foreground">{x.numero}</span></div>
                <div className="mt-0.5 text-xs text-muted-foreground">{x.type === "initiale" ? "Première demande" : `Renouvellement de ${x.ancienNumero}`} · {structure(x.structure)?.nom}</div>
                <span className={cn("mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUT_DEMANDE[x.statut].ton)}>{STATUT_DEMANDE[x.statut].libelle}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      {d && (
        <div className="space-y-5">
          <Panel
            title={<span className="flex flex-wrap items-center gap-2">Dr {d.nom} {d.prenom} <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUT_DEMANDE[d.statut].ton)}>{STATUT_DEMANDE[d.statut].libelle}</span></span>}
            description={`${d.numero} · déposée le ${fr(d.creeLe)} · Ordre des médecins n° ${d.onmg} · ${structure(d.structure)?.nom}`}
          >
            <div className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
              <div><div className="text-xs text-muted-foreground">Type</div>{d.type === "initiale" ? "Première demande" : `Renouvellement (${d.ancienNumero})`}</div>
              <div><div className="text-xs text-muted-foreground">Contact</div>{d.tel} · {d.email}</div>
              <div><div className="text-xs text-muted-foreground">Identifiant demandé</div><span className="font-mono">{d.identifiant}</span></div>
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-secondary">Contrôle des pièces jointes</div>
            <ul className="mt-2 divide-y rounded-lg border">
              {(Object.keys(PIECES_AGREMENT) as PieceAgrement[]).map((p) => {
                const nom = d.pieces[p];
                const c = d.controles[p];
                return (
                  <li key={p} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                    {nom ? <FileCheck2 className="size-4 text-success" /> : <FileX2 className="size-4 text-muted-foreground" />}
                    <span className="min-w-0 flex-1"><span className="font-medium">{PIECES_AGREMENT[p].titre}</span><span className="block text-xs text-muted-foreground">{nom ?? (PIECES_AGREMENT[p].obligatoire ? "non fournie" : "non fournie (facultative)")}</span></span>
                    {nom && instruire ? (
                      <div className="flex gap-1" role="radiogroup" aria-label={`Contrôle : ${PIECES_AGREMENT[p].titre}`}>
                        {[true, false].map((v) => (
                          <button key={String(v)} type="button" role="radio" aria-checked={c === v} onClick={() => controlerPiece(d.id, p, v)} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", c === v ? (v ? "border-success bg-success text-success-foreground" : "border-destructive bg-destructive text-destructive-foreground") : "hover:border-gold")}>
                            {v ? "Conforme" : "Non conforme"}
                          </button>
                        ))}
                      </div>
                    ) : nom ? (
                      <span className={cn("text-xs font-semibold", c === true ? "text-success" : c === false ? "text-destructive" : "text-muted-foreground")}>{c === true ? "Conforme" : c === false ? "Non conforme" : "Non contrôlée"}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {d.instruitPar && <p className="mt-3 text-xs text-muted-foreground">Instruite par {d.instruitPar} le {fr(d.instruitLe!)}.</p>}
            {d.decidePar && <p className="mt-1 text-xs text-muted-foreground">{d.statut === "rejete" ? "Rejetée" : "Assermentation"} par {d.decidePar} le {fr(d.decideLe!)}{d.medecinNumero ? ` : agrément ${d.medecinNumero}` : ""}.</p>}
            {d.motif && <p className="mt-1 text-xs text-destructive">Motif : {d.motif}</p>}
          </Panel>

          {(instruire || assermenterOk) && (
            <Panel title={instruire ? "Instruction du responsable RH" : "Décision du Directeur des Gens de Mer"}>
              {rejet ? (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-60 flex-1 text-xs font-medium">
                    Motif du rejet
                    <input id="motif-rejet" className="field-dgmm mt-1 h-9 w-full rounded-md bg-card px-3 text-sm" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. attestation de l'Ordre périmée" />
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => setRejet(false)}>Annuler</Button>
                  <Button size="sm" variant="destructive" disabled={!motif.trim()} onClick={() => { if (rejeterDemande(d.id, session.nom, motif.trim())) { journaliser(session.nom, `Demande d'agrément ${d.numero} rejetée : ${motif.trim()}`, `Dr ${d.nom} ${d.prenom}`); toast.success("Demande rejetée"); } setRejet(false); }}>Confirmer le rejet</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {instruire && !piecesConformes(d) && <p className="text-xs text-muted-foreground">Déclarez conformes les pièces obligatoires pour transmettre le dossier au Directeur.</p>}
                  {assermenterOk && (
                    <p className="rounded-md bg-gold/15 px-3 py-2 text-xs text-primary">
                      Effet : {d.type === "initiale" ? "génère le numéro d'agrément officiel, ouvre le compte médecin" : "prolonge l'agrément de " + DUREE_AGREMENT_ANS + " ans"} rattaché à {structure(d.structure)?.nom}, avec une validité de {DUREE_AGREMENT_ANS} ans{d.type === "initiale" ? ` (jusqu'au ${expiration})` : ""}.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {peutRejeter && <Button variant="outline" onClick={() => { setRejet(true); setMotif(""); }}><XCircle /> Rejeter la demande</Button>}
                    {instruire && (
                      <Button variant="secondary" disabled={!piecesConformes(d)} onClick={() => { if (transmettreAuDirecteur(d.id, session.nom)) { journaliser(session.nom, `Demande d'agrément ${d.numero} instruite : transmise au Directeur`, `Dr ${d.nom} ${d.prenom}`); toast.success("Dossier transmis au Directeur"); } }}>
                        <CheckCircle2 /> Pièces conformes — transmettre au Directeur
                      </Button>
                    )}
                    {assermenterOk && (
                      <Button variant="gold" onClick={() => { const m = assermenter(d.id, session.nom); if (m) { journaliser(session.nom, `Médecin assermenté : agrément ${m.numero} jusqu'au ${fr(m.expireLe)}`, m.nomAffiche); toast.success(`Agrément ${m.numero} délivré`, { description: `Compte « ${m.username} » actif jusqu'au ${fr(m.expireLe)}.` }); } }}>
                        <Lock /> Assermenter et sceller le profil
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
