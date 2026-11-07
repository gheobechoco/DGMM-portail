import { Aide } from "@/components/dgmm/Aide";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, FileSignature, Plane, Siren, XCircle } from "lucide-react";
import { PublicShell } from "@/components/dgmm/PublicShell";
import { EmptyState, Panel } from "@/components/dgmm/Page";
import { Button } from "@/components/ui/button";
import { ContratDocument, Echeancier, StatutContrat } from "@/components/dgmm/ContratVue";
import { cn } from "@/lib/utils";
import { marinSession } from "@/lib/dgmm/auth";
import { fullName, useMarins } from "@/lib/dgmm/store";
import { demanderRapatriement, echeancier, formatFcfa, refuserParMarin, signerParMarin, statut, useContrats } from "@/lib/dgmm/contrats";

export const Route = createFileRoute("/mon-espace/contrat")({
  head: () => ({ meta: [{ title: "Mon contrat — Espace Marin | DGMM" }] }),
  component: MonContrat,
});

function MonContrat() {
  const id = marinSession.use();
  const m = useMarins().find((x) => String(x.id) === id);
  const contrats = useContrats().filter((c) => m && c.marinId === m.id);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [lu, setLu] = useState(false);
  const [refus, setRefus] = useState("");
  const [motifRapat, setMotifRapat] = useState("Fin de contrat");
  if (!m) {
    return (
      <PublicShell titre="Espace Marin">
        <Panel><p className="text-sm">Connectez-vous à l'Espace Marin pour voir votre contrat. <Link to="/mon-espace" className="font-semibold text-primary hover:underline">Se connecter</Link></p></Panel>
      </PublicShell>
    );
  }
  const aSigner = contrats.filter((c) => statut(c) === "attente_marin");
  const actif = contrats.find((c) => statut(c) === "actif");
  const c = contrats.find((x) => x.id === ouvert) ?? aSigner[0] ?? actif ?? contrats[0];
  const retards = actif ? echeancier(actif).filter((e) => e.etat === "retard").length : 0;
  const joursRestants = actif ? Math.ceil((new Date(actif.dateFin).getTime() - Date.now()) / 86400000) : null;

  return (
    <PublicShell titre="Espace Marin" utilisateur={<><div className="font-semibold">{fullName(m)}</div><div className="font-mono text-primary-foreground/70">{m.nip}</div></>} onLogout={() => marinSession.write(null)}>
      <Link to="/mon-espace" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Mon espace</Link>
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Mon contrat d'engagement</div>
        <h1 className="font-display text-2xl font-bold text-primary">Mes contrats et ma paie <Aide terme="cem" className="align-middle" /> <Aide terme="mlc" className="align-middle" /></h1>
      </div>

      {contrats.length === 0 ? (
        <Panel><EmptyState icon={FileSignature} title="Aucun contrat enregistré">Si vous travaillez sans contrat, vous pouvez le signaler à la DGMM, de façon anonyme si vous le souhaitez. <Link to="/signaler" className="font-semibold text-primary hover:underline">Faire un signalement</Link></EmptyState></Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            {actif && (
              <Panel title="Contrat en vigueur">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Compagnie</dt><dd className="font-semibold">{actif.armateur}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Salaire de base</dt><dd className="font-semibold">{formatFcfa(actif.salaireBase)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Primes et indemnités</dt><dd className="font-semibold">{formatFcfa(actif.primeRisque + actif.indemniteNourriture + actif.indemniteLogement)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Fin du contrat</dt><dd className="font-semibold">{new Date(actif.dateFin).toLocaleDateString("fr-FR")}{joursRestants !== null && joursRestants >= 0 ? ` (dans ${joursRestants} j)` : ""}</dd></div>
                </dl>
                {retards > 0 && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">{retards} mois sans versement déclaré par l'employeur. <Link to="/signaler" className="underline">Signaler</Link></p>}
              </Panel>
            )}
            <Panel title="Tous mes contrats" bodyClassName="p-0">
              <ul className="divide-y">
                {contrats.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => { setOuvert(x.id); setLu(false); }} className={cn("w-full px-4 py-3 text-left hover:bg-muted/40", c?.id === x.id && "bg-gold/10")}>
                      <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-primary">{x.armateur}</span><StatutContrat c={x} /></div>
                      <div className="text-xs text-muted-foreground">{x.numero} · {x.fonction}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
            <Link to="/signaler" className="carte-survol flex items-center gap-3 rounded-xl border border-destructive/30 bg-card p-4 shadow-card">
              <Siren className="size-5 text-destructive" />
              <span className="text-sm"><span className="block font-semibold text-primary">Un problème à bord ?</span><span className="text-muted-foreground">Signalez-le à la Direction générale, anonymement si besoin.</span></span>
            </Link>
          </div>

          {c && (
            <div className="space-y-4">
              {statut(c) === "attente_marin" && (
                <Panel title="Contrat à signer" description="Lisez chaque article. Vous pouvez refuser en expliquant pourquoi : la DGMM en est informée.">
                  <label className="flex items-start gap-2 text-sm"><input id="contrat-lu" type="checkbox" className="mt-1" checked={lu} onChange={(e) => setLu(e.target.checked)} /> J'ai lu le contrat, ses conditions de salaire, de durée et de rapatriement.</label>
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <Button variant="gold" disabled={!lu} onClick={() => { signerParMarin(c.id); toast.success("Contrat signé", { description: "Il part à l'inspecteur de la DGMM pour validation." }); }}><FileSignature /> Signer le contrat</Button>
                    <label className="min-w-56 flex-1 text-xs font-medium">Ou refuser, avec le motif
                      <input id="motif-refus-marin" className="field-dgmm mt-1 h-9 w-full rounded-md bg-card px-3 text-sm" value={refus} onChange={(e) => setRefus(e.target.value)} placeholder="Ex. salaire différent de ce qui était convenu" />
                    </label>
                    <Button variant="outline" disabled={!refus.trim()} onClick={() => { refuserParMarin(c.id, refus.trim()); toast.success("Refus transmis à l'armateur et à la DGMM"); }}><XCircle /> Refuser</Button>
                  </div>
                </Panel>
              )}
              {statut(c) === "actif" && (
                <>
                  <Panel title="Mes salaires et cotisations" description="Mois par mois, ce que l'employeur a déclaré avoir versé (salaire et cotisations sociales).">
                    <Echeancier c={c} />
                  </Panel>
                  <Panel title="Rapatriement" description="Garanti par l'article 8 de votre contrat.">
                    {c.rapatriement ? (
                      <p className="text-sm">Demande envoyée le {new Date(c.rapatriement.demandeLe).toLocaleDateString("fr-FR")} — <strong>{c.rapatriement.statut === "organise" ? "rapatriement organisé par la compagnie" : "en attente de la compagnie"}</strong>.</p>
                    ) : (
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="min-w-56 flex-1 text-xs font-medium">Motif
                          <select id="motif-rapat" className="field-dgmm mt-1 h-9 w-full rounded-md bg-card px-3 text-sm" value={motifRapat} onChange={(e) => setMotifRapat(e.target.value)}>
                            {["Fin de contrat", "Maladie ou accident", "Naufrage ou abandon du navire", "Salaire non versé", "Autre motif grave"].map((x) => <option key={x}>{x}</option>)}
                          </select>
                        </label>
                        <Button variant="secondary" onClick={() => { demanderRapatriement(c.id, motifRapat); toast.success("Demande de rapatriement envoyée", { description: "La compagnie et la DGMM la reçoivent." }); }}><Plane /> Demander mon rapatriement</Button>
                      </div>
                    )}
                  </Panel>
                </>
              )}
              <ContratDocument c={c} />
            </div>
          )}
        </div>
      )}
    </PublicShell>
  );
}
