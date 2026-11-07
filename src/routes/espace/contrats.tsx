import { BarreFiltres, FiltreSelect, Pagination, usePagination } from "@/components/dgmm/Listes";
import { Aide } from "@/components/dgmm/Aide";
import { LienStatistiques } from "@/components/dgmm/Statistiques";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileSignature, FileWarning, Plane, XCircle } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/dgmm/Page";
import { Button } from "@/components/ui/button";
import { ContratDocument, Echeancier, ListeControles, StatutContrat } from "@/components/dgmm/ContratVue";
import { cn } from "@/lib/utils";
import { can } from "@/lib/dgmm/rules";
import type { Account } from "@/lib/dgmm/auth";
import { useMarins, useVisites } from "@/lib/dgmm/store";
import { controles, echeancier, formatFcfa, refuserParDgmm, statut, useContrats, validerParDgmm, type StatutCEM } from "@/lib/dgmm/contrats";

export const Route = createFileRoute("/espace/contrats")({
  head: () => ({ meta: [{ title: "Contrats d'engagement maritime — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="contrats">{(s) => <Contrats session={s} />}</RequirePerm>,
});

type Filtre = "a_valider" | "actifs" | "retards" | "attente_marin" | "refuses" | "tous";
const FILTRES: [Filtre, string][] = [
  ["a_valider", "À valider"],
  ["actifs", "En vigueur"],
  ["retards", "Versements en retard"],
  ["attente_marin", "Chez le marin"],
  ["refuses", "Refusés"],
  ["tous", "Tous"],
];

function Contrats({ session }: { session: Account }) {
  const contrats = useContrats();
  const marins = useMarins();
  const visites = useVisites();
  const peutValider = can(session.role, "contrats.valider");
  const [filtre, setFiltre] = useState<Filtre>("a_valider");
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [refus, setRefus] = useState("");

  const enRetard = (id: number) => { const c = contrats.find((x) => x.id === id)!; return echeancier(c).some((e) => e.etat === "retard"); };
  const liste = useMemo(() => {
    const st = (s: StatutCEM[]) => contrats.filter((c) => s.includes(statut(c)));
    switch (filtre) {
      case "a_valider": return st(["attente_dgmm"]);
      case "actifs": return st(["actif"]);
      case "retards": return st(["actif"]).filter((c) => enRetard(c.id));
      case "attente_marin": return st(["attente_marin"]);
      case "refuses": return st(["refuse_dgmm", "refuse_marin"]);
      default: return contrats;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contrats, filtre]);
  const pg = usePagination(liste, 8);
  const c = contrats.find((x) => x.id === ouvert);
  const marin = c ? marins.find((m) => m.id === c.marinId) : undefined;
  const ctrl = c ? controles(c, marin, visites) : [];
  const conforme = ctrl.every((k) => k.ok);
  const rapatriements = contrats.filter((x) => x.rapatriement?.statut === "demande");

  return (
    <>
      <PageHeader
        eyebrow="Tiers de confiance"
        title="Contrats d'engagement maritime"
        aides={["cem", "mlc"]}
        stats={<LienStatistiques theme="contrats" texte="Contrats par étape, retards de versement et rapatriements" />}
      />
      <BarreFiltres>
        <FiltreSelect id="filtre-contrats" label="Afficher" value={filtre} onChange={setFiltre} options={FILTRES.map(([f, l]) => ({ value: f, label: l }))} />
      </BarreFiltres>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel bodyClassName="p-0">
          {liste.length === 0 ? (
            <EmptyState icon={FileSignature} title="Aucun contrat dans cette catégorie" />
          ) : (
            <ul className="divide-y">
              {pg.visibles.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => { setOuvert(x.id); setRefus(""); }} className={cn("flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-muted/40", ouvert === x.id && "bg-gold/10")}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-primary">{x.marinNom}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{x.numero}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{x.armateur} · {x.fonction} · {formatFcfa(x.salaireBase)} / mois</div>
                      {x.rapatriement?.statut === "demande" && <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-warning"><Plane className="size-3.5" /> Rapatriement demandé</div>}
                      {statut(x) === "actif" && enRetard(x.id) && <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-destructive"><AlertTriangle className="size-3.5" /> Versement non déclaré</div>}
                    </div>
                    <StatutContrat c={x} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pagination {...pg} />
        </Panel>
        {c ? (
          <div className="space-y-4">
            <Panel title="Contrôle de conformité" description="Vérifié automatiquement avant la validation." actions={conforme ? <span className="text-xs font-semibold text-success">Conforme</span> : <span className="text-xs font-semibold text-destructive">Non conforme</span>}>
              <ListeControles controles={ctrl} />
              {statut(c) === "attente_dgmm" && peutValider && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" disabled={!conforme} title={conforme ? undefined : "Le contrat doit passer tous les contrôles"} onClick={() => { validerParDgmm(c.id, session.nom); toast.success(`Contrat ${c.numero} validé et scellé`); }}>
                      <CheckCircle2 /> Valider et sceller
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-60 flex-1 text-xs font-medium">Motif du refus
                      <input id="motif-refus-cem" className="field-dgmm mt-1 h-9 w-full rounded-md bg-card px-3 text-sm" value={refus} onChange={(e) => setRefus(e.target.value)} placeholder="Ex. salaire inférieur au minimum" />
                    </label>
                    <Button variant="destructive" disabled={!refus.trim()} onClick={() => { refuserParDgmm(c.id, session.nom, refus.trim()); toast.success("Contrat refusé : l'armateur doit en proposer un nouveau"); }}><XCircle /> Refuser</Button>
                  </div>
                </div>
              )}
            </Panel>
            {statut(c) === "actif" && (
              <Panel title="Salaire et cotisations" description="Déclarés mois par mois par l'armateur ; le marin voit le même échéancier.">
                <Echeancier c={c} />
              </Panel>
            )}
            {c.rapatriement && (
              <Panel title="Rapatriement">
                <p className="text-sm">Demandé le {new Date(c.rapatriement.demandeLe).toLocaleDateString("fr-FR")} : {c.rapatriement.motif}</p>
                <p className="mt-1 text-sm font-semibold">{c.rapatriement.statut === "organise" ? "Organisé par l'armateur" : "En attente de l'armateur"}</p>
              </Panel>
            )}
            <ContratDocument c={c} />
          </div>
        ) : (
          <Panel><EmptyState icon={FileSignature} title="Choisissez un contrat">Ses clauses, ses signatures et le contrôle de conformité s'affichent ici.</EmptyState></Panel>
        )}
      </div>
    </>
  );
}
