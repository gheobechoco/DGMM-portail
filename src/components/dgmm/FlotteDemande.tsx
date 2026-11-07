import { Aide } from "@/components/dgmm/Aide";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileCheck2, FileX2, Ship, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { journaliser } from "@/lib/dgmm/store";
import { PIECES_SOCIETE, deciderNomNavire, useInscriptions, type DemandeArmateur, type PieceSociete } from "@/lib/dgmm/inscriptions";
import { CATEGORIES_NAVIRE, PIECES_NAVIRE, indicatifValide, nomNormalise, piecesExigees, registreOccupe } from "@/lib/dgmm/registre";

/** La demande peut-elle être validée ? Chaque nom a reçu une décision et au moins un est approuvé. */
export function flotteDecidee(d: DemandeArmateur): { pret: boolean; approuves: number; enAttente: number } {
  const f = d.flotte ?? [];
  if (!f.length) return { pret: true, approuves: d.navires.length, enAttente: 0 };
  const approuves = f.filter((n) => n.nomStatut === "approuve").length;
  const enAttente = f.filter((n) => n.nomStatut === "en_attente").length;
  return { pret: enAttente === 0 && approuves > 0, approuves, enAttente };
}

/** Pièces de la compagnie et contact d'urgence (DPA). */
export function DossierCompagnie({ d }: { d: DemandeArmateur }) {
  if (!d.piecesSociete && !d.dpaNom && !d.adresseSiege) return null;
  return (
    <div className="mt-4 grid gap-4 border-t pt-4 text-sm md:grid-cols-2">
      <dl className="space-y-1.5">
        {d.adresseSiege && <div><dt className="text-xs text-muted-foreground">Siège</dt><dd>{d.adresseSiege}{d.boitePostale ? ` · ${d.boitePostale}` : ""}</dd></div>}
        {d.dpaNom && <div><dt className="text-xs text-muted-foreground">Personne désignée à terre (24 h/24)</dt><dd>{d.dpaNom} · {d.dpaTel}{d.dpaEmail ? ` · ${d.dpaEmail}` : ""}</dd></div>}
      </dl>
      {d.piecesSociete && (
        <ul className="space-y-1">
          {(Object.keys(PIECES_SOCIETE) as PieceSociete[]).map((k) => {
            const nom = d.piecesSociete?.[k];
            return (
              <li key={k} className={cn("flex items-center gap-1.5 text-xs", nom ? "text-foreground" : "text-muted-foreground")}>
                {nom ? <FileCheck2 className="size-3.5 text-success" /> : <FileX2 className="size-3.5" />}
                <span className="font-medium">{PIECES_SOCIETE[k].titre}</span>
                {nom ? <span className="truncate text-muted-foreground">· {nom}</span> : <span>· non fournie</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Examen navire par navire : approbation du nom proposé et attribution de l'indicatif d'appel. */
export function FlotteDemande({ d, auteur }: { d: DemandeArmateur; auteur: string }) {
  const { armateurs } = useInscriptions();
  const [refus, setRefus] = useState<number | null>(null);
  const [motif, setMotif] = useState("");
  const [indicatifs, setIndicatifs] = useState<Record<number, string>>({});
  if (!d.flotte?.length) {
    return (
      <ul className="mt-1 space-y-0.5">
        {d.navires.map((n) => <li key={n.imo || n.nom} className="text-xs"><span className="font-medium">{n.nom}</span> · OMI {n.imo}{n.jauge ? ` · ${n.jauge} GT` : ""}</li>)}
      </ul>
    );
  }
  // Doublons détectés depuis le dépôt (une autre demande a pu être validée entre-temps).
  const occupe = registreOccupe(armateurs, d.id);
  const modifiable = d.statut === "en_attente";
  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-secondary">Flotte : noms soumis à approbation ({d.flotte.length}) <Aide terme="marquage" /></div>
      {d.flotte.map((n, i) => {
        const conflit = occupe.noms.get(nomNormalise(n.nom));
        const ind = (indicatifs[i] ?? "").toUpperCase().replace(/\s/g, "");
        const indOk = !n.indicatifADemander || indicatifValide(ind);
        return (
          <div key={i} className={cn("rounded-lg border p-3", n.nomStatut === "approuve" && "border-success/40 bg-success/5", n.nomStatut === "refuse" && "border-destructive/30 bg-destructive/5")}>
            <div className="flex flex-wrap items-start gap-3">
              <Ship className="mt-0.5 size-4 text-secondary" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-primary">{n.nom}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", n.nomStatut === "approuve" ? "bg-success/15 text-success" : n.nomStatut === "refuse" ? "bg-destructive/12 text-destructive" : "bg-warning/15 text-warning")}>
                    {n.nomStatut === "approuve" ? "Nom approuvé" : n.nomStatut === "refuse" ? "Nom refusé" : "Nom à examiner"}
                  </span>
                  {conflit && n.nomStatut === "en_attente" && <span className="text-[11px] font-semibold text-destructive">Attention : nom aussi porté par {conflit.nom} ({conflit.armateur})</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{CATEGORIES_NAVIRE[n.categorie]}</span>
                  <span>Port d'attache : {n.portAttache}</span>
                  <span>{n.jauge} GT · {n.puissanceKw} kW</span>
                  <span className="font-mono">{n.imo || "sans OMI"}</span>
                  <span className="font-mono">{n.indicatifADemander ? "indicatif à attribuer" : n.indicatif}</span>
                  {n.mmsi && <span className="font-mono">MMSI {n.mmsi}</span>}
                  <span>Classe : {n.classe}</span>
                  <span>{n.provenance === "transfert" ? `Ancien pavillon : ${n.ancienPavillon}` : "Navire neuf"}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {[...piecesExigees(n), "jaugeage" as const].map((p) => (
                    <span key={p} className={cn("inline-flex items-center gap-1 text-[11px]", n.pieces[p] ? "text-success" : "text-muted-foreground")}>
                      {n.pieces[p] ? <FileCheck2 className="size-3" /> : <FileX2 className="size-3" />}{PIECES_NAVIRE[p].titre}
                    </span>
                  ))}
                </div>
                {n.nomMotif && <p className="mt-1 text-xs text-destructive">Motif : {n.nomMotif}</p>}
              </div>
              {modifiable && n.nomStatut === "en_attente" && refus !== i && (
                <div className="flex flex-wrap items-end gap-2">
                  {n.indicatifADemander && (
                    <label className="text-[11px] font-medium">
                      Indicatif attribué
                      <input id={`ind-${d.id}-${i}`} className="field-dgmm mt-0.5 block h-8 w-28 rounded-md bg-card px-2 font-mono text-xs uppercase" value={indicatifs[i] ?? ""} onChange={(e) => setIndicatifs((s) => ({ ...s, [i]: e.target.value }))} placeholder="TR…" />
                    </label>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setRefus(i); setMotif(""); }}><XCircle /> Refuser le nom</Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!indOk}
                    title={indOk ? undefined : "Saisissez l'indicatif attribué (TR + 2 à 5 caractères)"}
                    onClick={() => {
                      deciderNomNavire(d.id, i, "approuve", undefined, n.indicatifADemander ? ind : undefined);
                      journaliser(auteur, `Nom de navire approuvé : ${n.nom} (port d'attache ${n.portAttache}${n.indicatifADemander ? `, indicatif ${ind}` : ""})`, d.raisonSociale);
                      toast.success(`Nom « ${n.nom} » approuvé`);
                    }}
                  >
                    <CheckCircle2 /> Approuver le nom
                  </Button>
                </div>
              )}
            </div>
            {refus === i && (
              <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md bg-muted/50 p-2">
                <label className="min-w-56 flex-1 text-xs font-medium">
                  Motif du refus du nom
                  <input id={`refus-nom-${d.id}-${i}`} className="field-dgmm mt-1 h-9 w-full rounded-md bg-card px-3 text-sm" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. nom trop proche d'un navire existant" />
                </label>
                <Button size="sm" variant="ghost" onClick={() => setRefus(null)}>Annuler</Button>
                <Button size="sm" variant="destructive" disabled={!motif.trim()} onClick={() => { deciderNomNavire(d.id, i, "refuse", motif.trim()); journaliser(auteur, `Nom de navire refusé : ${n.nom} — ${motif.trim()}`, d.raisonSociale); setRefus(null); }}>Confirmer le refus</Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
